import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolveAuthorization } from "./contextkit-autocapture-auth.mjs";

const MAX_TRANSCRIPT_BYTES = 8_000_000;
const MAX_PAYLOAD_CHARS = 350_000;
const MAX_MESSAGE_CHARS = 40_000;
const MAX_TOOL_RESULT_CHARS = 4_000;
const CACHE_LIMIT = 100;
const OUTBOX_LIMIT = 25;

export function redactSensitive(value) {
  return String(value ?? "")
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gi, "[redacted-private-key]")
    .replace(/\b(?:sk|bk|ck|re|ghp|github_pat)_[A-Za-z0-9_-]{10,}\b/g, "[redacted-secret]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b/gi, "Bearer [redacted-secret]")
    .replace(/(["']?(?:password|passwd|token|secret|api[_-]?key|private[_-]?key|otp|verification[_-]?code)["']?\s*[:=]\s*)["']?[^\s,'"}]{4,}["']?/gi, "$1[redacted-secret]")
    .replace(/\b(?:mnemonic|seed phrase)\s*[:=]\s*[^\n]{16,}/gi, "seed phrase=[redacted-secret]")
    .replace(/\b\d{6}\b/g, "[redacted-code]")
    .replace(/https?:\/\/[^\s/:]+:[^\s/@]+@/gi, "https://[redacted-credentials]@")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

export function parseTranscript(text) {
  const limited = String(text ?? "").slice(0, MAX_TRANSCRIPT_BYTES);
  const trimmed = limited.trim();
  if (!trimmed) return [];

  const parsed = tryJson(trimmed);
  const events = parsed === undefined
    ? trimmed.split(/\r?\n/).map(tryJson).filter((item) => item !== undefined)
    : Array.isArray(parsed) ? parsed : [parsed];

  return compactMessages(events.flatMap(eventToMessages));
}

export function latestCompletedTask(messages, fallbackUserRequest) {
  const normalized = compactMessages(messages);
  let start = -1;
  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    if (normalized[index].role === "user") {
      start = index;
      break;
    }
  }

  let task = start >= 0 ? normalized.slice(start) : normalized;
  if (fallbackUserRequest && !task.some((message) => message.role === "user")) {
    task = [{ role: "user", content: redactSensitive(fallbackUserRequest) }, ...task];
  }

  const hasUser = task.some((message) => message.role === "user");
  const hasAgentEvidence = task.some((message) => message.role === "assistant" || message.role === "tool");
  if (!hasUser || !hasAgentEvidence) return [];

  let remaining = MAX_PAYLOAD_CHARS;
  return task.flatMap((message) => {
    if (remaining <= 0) return [];
    const content = redactSensitive(message.content).slice(0, Math.min(MAX_MESSAGE_CHARS, remaining));
    remaining -= content.length;
    return content ? [{ role: message.role, content }] : [];
  });
}

export async function captureExperience(options) {
  const messages = latestCompletedTask(options.messages ?? [], options.userRequest);
  if (messages.length < 2) {
    return { skipped: true, reason: "No complete user-to-agent task found in transcript." };
  }

  const baseUrl = String(options.baseUrl || process.env.CONTEXTKIT_BASE_URL || "https://contextkit.pro").replace(/\/$/, "");
  const authorization = await resolveAuthorization({ ...options, baseUrl });
  const requestOptions = { ...options, authorization, baseUrl };
  const recovered = await flushOutbox(requestOptions);
  const fingerprint = createHash("sha256").update(JSON.stringify(messages)).digest("hex");
  const priorCapture = options.dedupe !== false ? await capturedEntry(fingerprint, options.cachePath) : null;
  if (priorCapture) {
    const priorResult = priorCapture.result && typeof priorCapture.result === "object" ? priorCapture.result : {};
    return {
      ...priorResult,
      skipped: true,
      cached: true,
      reason: "This completed task was already compiled; reuse the cached draft instead of paying again.",
      fingerprint,
      recovered
    };
  }

  const item = captureItem(messages, fingerprint, options);
  await enqueueCapture(item, options.outboxPath, options.cachePath);
  try {
    const body = await submitItem(item, requestOptions);
    await Promise.all([
      rememberCapture(fingerprint, body, options.cachePath),
      removeFromOutbox(fingerprint, options.outboxPath, options.cachePath)
    ]);
    return { ...body, fingerprint, recovered };
  } catch (error) {
    const wrapped = new Error(`${error instanceof Error ? error.message : String(error)} Sanitized task remains queued for automatic retry.`);
    wrapped.cause = error;
    throw wrapped;
  }
}

export async function readTranscriptFile(path) {
  const content = await readFile(expandHome(path), "utf8");
  return parseTranscript(content);
}

export function eventToMessages(event) {
  if (!event || typeof event !== "object") return [];
  if (Array.isArray(event)) return event.flatMap(eventToMessages);

  if (Array.isArray(event.messages)) return event.messages.flatMap(eventToMessages);

  // Codex `exec --json` events wrap completed assistant/tool items in `item`.
  if (event.item && typeof event.item === "object") {
    const item = event.item;
    if (item.type === "agent_message" && typeof item.text === "string") {
      return [{ role: "assistant", content: redactSensitive(item.text) }];
    }
    if (item.type === "reasoning" && typeof item.text === "string") return [];
    if (item.type === "command_execution") {
      const result = [{ role: "assistant", content: summarizeToolCall("command", { command: item.command }) }];
      if (item.status === "completed" || item.status === "failed") {
        result.push({ role: "tool", content: summarizeToolResult(item.aggregated_output ?? item.output, item.status === "failed") });
      }
      return result;
    }
    return eventToMessages(item);
  }

  // OpenCode session messages use { info, parts } rather than a top-level role/content pair.
  if (event.info && Array.isArray(event.parts)) {
    const declaredRole = normalizeRole(event.info.role);
    const content = contentToText(event.parts, declaredRole);
    const result = [];
    if (content.text) result.push({ role: declaredRole, content: content.text });
    result.push(...content.toolMessages);
    return result;
  }

  const message = event.message && typeof event.message === "object" ? event.message : event;
  const declaredRole = normalizeRole(message.role || event.role || event.type);
  const content = contentToText(message.content ?? event.content, declaredRole);
  const result = [];

  if (content.text) result.push({ role: declaredRole, content: content.text });
  result.push(...content.toolMessages);

  if (!result.length && event.type === "result" && typeof event.result === "string") {
    result.push({ role: "assistant", content: redactSensitive(event.result) });
  }
  if (!result.length && typeof event.last_assistant_message === "string") {
    result.push({ role: "assistant", content: redactSensitive(event.last_assistant_message) });
  }
  return result;
}

function contentToText(content, role) {
  if (typeof content === "string") return { text: redactSensitive(content), toolMessages: [] };
  if (!Array.isArray(content)) return { text: "", toolMessages: [] };

  const texts = [];
  const toolMessages = [];
  for (const item of content) {
    if (typeof item === "string") {
      texts.push(item);
      continue;
    }
    if (!item || typeof item !== "object") continue;
    if (typeof item.text === "string") texts.push(item.text);
    if (item.type === "tool_use" || item.name && item.input) {
      toolMessages.push({ role: "assistant", content: summarizeToolCall(item.name || "tool", item.input) });
    }
    if (item.type === "tool") {
      toolMessages.push({ role: "assistant", content: summarizeToolCall(item.tool || "tool", item.state?.input) });
      if (item.state?.status === "completed" && item.state.output) {
        toolMessages.push({ role: "tool", content: summarizeToolResult(item.state.output, false) });
      }
      if (item.state?.status === "error") {
        toolMessages.push({ role: "tool", content: summarizeToolResult(item.state.error, true) });
      }
    }
    if (item.type === "tool_result") {
      toolMessages.push({ role: "tool", content: summarizeToolResult(item.content, item.is_error) });
    }
  }
  return { text: redactSensitive(texts.join("\n")), toolMessages: role === "user" && toolMessages.length ? toolMessages : toolMessages };
}

function summarizeToolCall(name, input) {
  const safeName = redactSensitive(name).slice(0, 120);
  const object = input && typeof input === "object" ? input : {};
  const path = object.file_path || object.path || object.notebook_path;
  const command = object.command;
  if (path) return `[tool:${safeName}] target=${redactSensitive(path).slice(0, 500)}`;
  if (command) return `[tool:${safeName}] command=${redactSensitive(command).slice(0, 1_500)}`;
  const keys = Object.keys(object).filter((key) => !/content|text|secret|token|password|key/i.test(key)).slice(0, 12);
  return `[tool:${safeName}] fields=${keys.join(",") || "none"}`;
}

function summarizeToolResult(content, isError) {
  const prefix = isError ? "[tool-result:error]" : "[tool-result:success]";
  const text = typeof content === "string" ? content : JSON.stringify(content ?? "");
  const safe = redactSensitive(text);
  if (safe.length <= MAX_TOOL_RESULT_CHARS) return `${prefix} ${safe}`.trim();

  // Test/build summaries usually appear at the end of long command output.
  const head = safe.slice(0, 1_500);
  const tail = safe.slice(-(MAX_TOOL_RESULT_CHARS - 1_500));
  return `${prefix} ${head}\n[tool-result:middle-truncated]\n${tail}`.trim();
}

function compactMessages(messages) {
  const result = [];
  for (const raw of messages) {
    const role = normalizeRole(raw?.role);
    const content = redactSensitive(raw?.content);
    if (!content) continue;
    const previous = result[result.length - 1];
    if (previous?.role === role && previous.content.length + content.length < MAX_MESSAGE_CHARS) {
      previous.content += `\n${content}`;
    } else {
      result.push({ role, content });
    }
  }
  return result;
}

function normalizeRole(value) {
  const role = String(value ?? "").toLowerCase();
  if (role === "user" || role === "human") return "user";
  if (role === "tool" || role === "tool_result") return "tool";
  if (role === "system") return "system";
  return "assistant";
}

function tryJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function expandHome(path) {
  return String(path).startsWith("~/") ? join(homedir(), String(path).slice(2)) : String(path);
}

async function wasCaptured(hash, path) {
  return Boolean(await capturedEntry(hash, path));
}

async function capturedEntry(hash, path) {
  const cache = await readCache(path);
  return cache.captures.find((item) => item.fingerprint === hash) ??
    (cache.hashes.includes(hash) ? { fingerprint: hash } : null);
}

async function rememberCapture(hash, result, path) {
  const cachePath = path || defaultCachePath();
  const cache = await readCache(cachePath);
  const hashes = [hash, ...cache.hashes.filter((item) => item !== hash)].slice(0, CACHE_LIMIT);
  const captures = [
    {
      fingerprint: hash,
      capturedAt: new Date().toISOString(),
      result: cacheableCaptureResult(result)
    },
    ...cache.captures.filter((item) => item.fingerprint !== hash)
  ].slice(0, CACHE_LIMIT);
  await mkdir(dirname(cachePath), { recursive: true, mode: 0o700 });
  const temporary = `${cachePath}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify({ hashes, captures }), { mode: 0o600 });
  await rename(temporary, cachePath);
}

async function readCache(path) {
  try {
    const parsed = JSON.parse(await readFile(path || defaultCachePath(), "utf8"));
    return {
      hashes: Array.isArray(parsed.hashes) ? parsed.hashes.filter((item) => typeof item === "string") : [],
      captures: Array.isArray(parsed.captures)
        ? parsed.captures.filter((item) => item && typeof item === "object" && typeof item.fingerprint === "string")
        : []
    };
  } catch {
    return { hashes: [], captures: [] };
  }
}

function cacheableCaptureResult(result) {
  if (!result || typeof result !== "object") return {};
  const experience = result.experience && typeof result.experience === "object"
    ? {
        id: result.experience.id,
        title: result.experience.title,
        version: result.experience.version,
        visibility: result.experience.visibility
      }
    : undefined;
  return {
    shouldSave: result.shouldSave,
    reason: result.reason,
    confidence: result.confidence,
    experience,
    validation: result.validation,
    nextAgentAction: result.nextAgentAction
  };
}

function defaultCachePath() {
  return join(homedir(), ".contextkit", "autocapture-cache.json");
}

function captureItem(messages, fingerprint, options) {
  return {
    fingerprint,
    createdAt: new Date().toISOString(),
    payload: {
      messages,
      minConfidence: options.minConfidence ?? 0.72,
      autoSave: true,
      priceUsd: 0.05,
      metadata: {
        captureSource: options.source ?? "autocapture-bridge",
        agent: options.agent,
        sessionId: options.sessionId,
        workspace: options.workspace ? redactSensitive(options.workspace) : undefined,
        fingerprint
      }
    }
  };
}

async function submitItem(item, options) {
  const fetcher = options.fetch ?? fetch;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
    try {
      const response = options.authorization.transport === "mcp"
        ? await submitMcpItem(item, options, controller.signal)
        : await submitApiItem(item, options, controller.signal);
      const bodyText = await response.text();
      const body = tryJson(bodyText) ?? { message: bodyText.slice(0, 500) };
      if (response.ok) return options.authorization.transport === "mcp" ? unwrapMcpResult(body) : body;
      const message = body?.error?.message || body?.message || `ContextKit returned HTTP ${response.status}.`;
      const error = new Error(redactSensitive(message));
      if (response.status < 500 && response.status !== 408 && response.status !== 429) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
      if (attempt === 2) break;
    } finally {
      clearTimeout(timeout);
    }
    await delay((options.retryBaseMs ?? 300) * (2 ** attempt));
  }
  throw lastError instanceof Error ? lastError : new Error("ContextKit auto-capture request failed.");
}

function submitApiItem(item, options, signal) {
  return (options.fetch ?? fetch)(`${options.baseUrl}/api/experience/consider`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.authorization.token}`,
      "Content-Type": "application/json",
      "User-Agent": "ContextKit-AutoCapture/0.2"
    },
    body: JSON.stringify(item.payload),
    signal
  });
}

function submitMcpItem(item, options, signal) {
  return (options.fetch ?? fetch)(`${options.baseUrl}/mcp`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.authorization.token}`,
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "MCP-Protocol-Version": "2025-03-26",
      "User-Agent": "ContextKit-AutoCapture/0.2"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `capture-${item.fingerprint.slice(0, 16)}`,
      method: "tools/call",
      params: {
        name: "contextkit_skill_compile",
        arguments: {
          messages: item.payload.messages,
          minConfidence: item.payload.minConfidence,
          autoSave: true,
          metadata: item.payload.metadata
        }
      }
    }),
    signal
  });
}

function unwrapMcpResult(payload) {
  if (payload?.error) {
    throw new Error(redactSensitive(payload.error.message || "ContextKit MCP request failed."));
  }
  const result = payload?.result;
  const text = result?.content?.find((item) => item?.type === "text" && typeof item.text === "string")?.text;
  const parsed = tryJson(text);
  if (result?.isError) {
    throw new Error(redactSensitive(parsed?.error || text || "ContextKit rejected the skill draft."));
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("ContextKit MCP returned an invalid tool response.");
  }
  return parsed;
}

async function flushOutbox(options) {
  const outbox = await readOutbox(options.outboxPath, options.cachePath);
  const recovered = [];
  for (const item of outbox.items) {
    if (await wasCaptured(item.fingerprint, options.cachePath)) {
      await removeFromOutbox(item.fingerprint, options.outboxPath, options.cachePath);
      continue;
    }
    try {
      const result = await submitItem(item, options);
      await Promise.all([
        rememberCapture(item.fingerprint, result, options.cachePath),
        removeFromOutbox(item.fingerprint, options.outboxPath, options.cachePath)
      ]);
      recovered.push({ fingerprint: item.fingerprint, result });
    } catch {
      break;
    }
  }
  return recovered;
}

async function enqueueCapture(item, explicitPath, cachePath) {
  const path = explicitPath || defaultOutboxPath(cachePath);
  const outbox = await readOutbox(path, cachePath);
  const items = [...outbox.items.filter((entry) => entry.fingerprint !== item.fingerprint), item].slice(-OUTBOX_LIMIT);
  await writePrivateJson(path, { items });
}

async function removeFromOutbox(fingerprint, explicitPath, cachePath) {
  const path = explicitPath || defaultOutboxPath(cachePath);
  const outbox = await readOutbox(path, cachePath);
  await writePrivateJson(path, { items: outbox.items.filter((item) => item.fingerprint !== fingerprint) });
}

async function readOutbox(explicitPath, cachePath) {
  try {
    const parsed = JSON.parse(await readFile(explicitPath || defaultOutboxPath(cachePath), "utf8"));
    return { items: Array.isArray(parsed.items) ? parsed.items.filter(validOutboxItem) : [] };
  } catch {
    return { items: [] };
  }
}

function validOutboxItem(item) {
  return Boolean(item && typeof item === "object" && typeof item.fingerprint === "string" && item.payload && Array.isArray(item.payload.messages));
}

async function writePrivateJson(path, value) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
  await rename(temporary, path);
}

function defaultOutboxPath(cachePath) {
  return cachePath ? join(dirname(cachePath), "autocapture-outbox.json") : join(homedir(), ".contextkit", "autocapture-outbox.json");
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}
