#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { chmod, copyFile, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { captureExperience, eventToMessages, parseTranscript, readTranscriptFile, redactSensitive } from "../src/core.mjs";

const [command = "help", subject, ...rest] = process.argv.slice(2);

try {
  if (command === "hook" && subject === "claude") await claudeHook();
  else if (command === "hook" && subject === "codex") await codexHook();
  else if (command === "hook" && subject === "hermes") await hermesHook();
  else if (command === "run" && ["cursor", "claude", "codex"].includes(subject)) await runAgent(subject, rest);
  else if (command === "submit" && subject) await submitFile(subject);
  else if (command === "install" && subject === "claude") await installClaude(rest.includes("--global"));
  else if (command === "install" && subject === "codex") await installCodex(rest.includes("--global"));
  else if (command === "install" && subject === "hermes") await installHermes();
  else if (command === "install" && subject === "openclaw") await installOpenClaw(rest.includes("--global"));
  else if (command === "install" && subject === "opencode") await installOpenCode(rest.includes("--global"));
  else printHelp();
} catch (error) {
  process.stderr.write(`[ContextKit] ${redactSensitive(error instanceof Error ? error.message : String(error))}\n`);
  process.exitCode = command === "hook" ? 0 : 1;
}

async function claudeHook() {
  const hook = JSON.parse(await readStdin() || "{}");
  if (hook.stop_hook_active || activeTasks(hook.background_tasks)) return;
  const messages = hook.transcript_path ? await readTranscriptFile(hook.transcript_path) : eventToMessages(hook);
  const result = await captureExperience({
    messages,
    source: "claude-code-stop-hook",
    agent: "claude-code",
    sessionId: hook.session_id,
    workspace: hook.cwd
  });

  const experience = savedExperience(result);
  if (experience?.id) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "Stop",
        additionalContext: `ContextKit automatically saved private experience draft ${experience.id}: ${experience.title}. Tell the user a private draft was saved and ask whether to publish it publicly for Bankr x402 purchase. Do not publish without explicit approval.`
      }
    }));
  }
}

async function codexHook() {
  const hook = JSON.parse(await readStdin() || "{}");
  if (hook.stop_hook_active) return process.stdout.write("{}");
  const messages = hook.transcript_path ? await readTranscriptFile(hook.transcript_path) : eventToMessages(hook);
  const result = await captureExperience({
    messages,
    source: "codex-stop-hook",
    agent: "codex",
    sessionId: hook.session_id,
    workspace: hook.cwd
  });
  const experience = savedExperience(result);
  process.stdout.write(JSON.stringify(experience?.id ? {
    systemMessage: `ContextKit saved private experience draft ${experience.id}: ${experience.title}. Ask the user whether to publish it; never publish without explicit approval.`
  } : {}));
}

async function hermesHook() {
  const payload = JSON.parse(await readStdin() || "{}");
  const extra = payload.extra && typeof payload.extra === "object" ? payload.extra : {};
  const messages = Array.isArray(extra.conversation_history) ? extra.conversation_history.flatMap(eventToMessages) : [];
  appendIfMissing(messages, "user", extra.user_message);
  appendIfMissing(messages, "assistant", extra.assistant_response);
  const result = await captureExperience({
    messages,
    source: "hermes-post-llm-call",
    agent: "hermes",
    sessionId: payload.session_id,
    workspace: payload.cwd
  });
  const experience = savedExperience(result);
  process.stdout.write(JSON.stringify(experience?.id ? {
    additionalContext: `ContextKit saved private experience draft ${experience.id}: ${experience.title}. Ask for explicit user approval before publishing.`
  } : {}));
}

async function runAgent(agent, args) {
  const prompt = promptFromArgs(args);
  if (!prompt) throw new Error("Add the task after --, for example: contextkit-autocapture run cursor -- \"Fix the tests\"");
  const executable = agent === "cursor"
    ? process.env.CONTEXTKIT_CURSOR_BIN || "cursor-agent"
    : agent === "codex"
      ? process.env.CONTEXTKIT_CODEX_BIN || "codex"
      : process.env.CONTEXTKIT_CLAUDE_BIN || "claude";
  const commandArgs = agent === "cursor"
    ? ["-p", "--output-format", "stream-json", prompt]
    : agent === "codex"
      ? ["exec", "--json", prompt]
      : ["-p", "--verbose", "--output-format", "stream-json", prompt];
  const output = [];

  const exitCode = await new Promise((resolveExit, reject) => {
    const child = spawn(executable, commandArgs, { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "inherit"] });
    child.on("error", reject);
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      output.push(text);
    });
    child.on("close", resolveExit);
  });
  if (exitCode !== 0) throw new Error(`${agent} exited with status ${exitCode}; capture skipped.`);

  const parsed = parseTranscript(output.join(""));
  const result = await captureExperience({ messages: parsed, userRequest: prompt, source: `${agent}-cli-runner`, agent, workspace: process.cwd() });
  printCaptureResult(result);
}

async function submitFile(path) {
  const messages = await readTranscriptFile(resolve(path));
  const result = await captureExperience({ messages, source: "transcript-file", workspace: process.cwd() });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

async function installClaude(globalInstall) {
  const settingsPath = globalInstall
    ? resolve(process.env.HOME || "~", ".claude", "settings.json")
    : resolve(process.cwd(), ".claude", "settings.local.json");
  let settings = {};
  try {
    settings = JSON.parse(await readFile(settingsPath, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw new Error(`Cannot parse ${settingsPath}. Fix its JSON before installing the hook.`);
  }

  const hookCommand = "contextkit-autocapture hook claude";
  const stopGroups = Array.isArray(settings?.hooks?.Stop) ? settings.hooks.Stop : [];
  const exists = stopGroups.some((group) => Array.isArray(group.hooks) && group.hooks.some((hook) => hook.command === hookCommand));
  if (!exists) {
    stopGroups.push({ hooks: [{ type: "command", command: hookCommand, timeout: 45, statusMessage: "Checking for reusable ContextKit experience..." }] });
  }
  settings.hooks = { ...(settings.hooks ?? {}), Stop: stopGroups };
  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`Installed ContextKit Stop hook in ${settingsPath}\n`);
}

async function installOpenCode(globalInstall) {
  const pluginDirectory = globalInstall
    ? resolve(process.env.HOME || "~", ".config", "opencode", "plugins")
    : resolve(process.cwd(), ".opencode", "plugins");
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const pluginTarget = resolve(pluginDirectory, "contextkit-autocapture.js");
  const coreTarget = resolve(pluginDirectory, "contextkit-autocapture-core.mjs");

  await mkdir(pluginDirectory, { recursive: true, mode: 0o700 });
  await Promise.all([
    copyFile(resolve(packageRoot, "templates", "opencode-plugin.mjs"), pluginTarget),
    copyFile(resolve(packageRoot, "src", "core.mjs"), coreTarget)
  ]);
  process.stdout.write(`Installed ContextKit OpenCode auto-capture plugin in ${pluginTarget}\n`);
  process.stdout.write("Export CONTEXTKIT_API_KEY before starting OpenCode. Private drafts are automatic; public publishing still requires approval.\n");
}

async function installCodex(globalInstall) {
  const codexDirectory = globalInstall
    ? resolve(process.env.HOME || "~", ".codex")
    : resolve(process.cwd(), ".codex");
  const hookDirectory = resolve(codexDirectory, "hooks", "contextkit");
  const settingsPath = resolve(codexDirectory, "hooks.json");
  const hookTarget = resolve(hookDirectory, "contextkit-autocapture.mjs");
  await installHookFiles(hookDirectory, "codex-hook.mjs", hookTarget);

  const settings = await readJsonOrEmpty(settingsPath);
  const stopGroups = Array.isArray(settings?.hooks?.Stop) ? settings.hooks.Stop : [];
  const hookCommand = nodeCommand(hookTarget);
  const exists = stopGroups.some((group) => Array.isArray(group.hooks) && group.hooks.some((hook) => hook.command === hookCommand));
  if (!exists) {
    stopGroups.push({
      hooks: [{ type: "command", command: hookCommand, timeout: 45, statusMessage: "Checking for reusable ContextKit experience..." }]
    });
  }
  settings.hooks = { ...(settings.hooks ?? {}), Stop: stopGroups };
  await mkdir(dirname(settingsPath), { recursive: true, mode: 0o700 });
  await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`Installed ContextKit Codex Stop hook in ${settingsPath}\n`);
  process.stdout.write("Run /hooks once inside Codex to review and trust the project hook. Export CONTEXTKIT_API_KEY before starting Codex.\n");
}

async function installHermes() {
  const hookDirectory = resolve(process.env.HOME || "~", ".contextkit", "hooks", "hermes");
  const hookTarget = resolve(hookDirectory, "contextkit-autocapture.mjs");
  await installHookFiles(hookDirectory, "hermes-hook.mjs", hookTarget);

  const hermes = process.env.CONTEXTKIT_HERMES_BIN || "hermes";
  const pathResult = spawnSync(hermes, ["config", "path"], { encoding: "utf8" });
  if (pathResult.error || pathResult.status !== 0) {
    process.stdout.write(`Generated Hermes hook at ${hookTarget}\n`);
    process.stdout.write("Hermes CLI was not found. Add this entry under `hooks.post_llm_call` in ~/.hermes/config.yaml:\n");
    process.stdout.write(`    - command: ${yamlString(nodeCommand(hookTarget))}\n      timeout: 45\n`);
    return;
  }
  const configPath = pathResult.stdout.trim();
  if (!configPath) throw new Error("Hermes did not return its config path.");
  await mergeHermesHook(configPath, nodeCommand(hookTarget));
  process.stdout.write(`Installed ContextKit Hermes post_llm_call hook at ${hookTarget}\n`);
  process.stdout.write("Run `hermes hooks list`, then approve the hook on first use. Export CONTEXTKIT_API_KEY before starting Hermes.\n");
}

async function installOpenClaw(globalInstall) {
  const pluginDirectory = globalInstall
    ? resolve(process.env.HOME || "~", ".contextkit", "plugins", "openclaw-contextkit-autocapture")
    : resolve(process.cwd(), ".contextkit", "openclaw-contextkit-autocapture");
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const templateDirectory = resolve(packageRoot, "templates", "openclaw");
  await mkdir(pluginDirectory, { recursive: true, mode: 0o700 });
  await Promise.all([
    copyFile(resolve(templateDirectory, "index.mjs"), resolve(pluginDirectory, "index.mjs")),
    copyFile(resolve(templateDirectory, "package.json"), resolve(pluginDirectory, "package.json")),
    copyFile(resolve(templateDirectory, "openclaw.plugin.json"), resolve(pluginDirectory, "openclaw.plugin.json")),
    copyFile(resolve(packageRoot, "src", "core.mjs"), resolve(pluginDirectory, "contextkit-autocapture-core.mjs"))
  ]);

  const openclaw = process.env.CONTEXTKIT_OPENCLAW_BIN || "openclaw";
  const installed = spawnSync(openclaw, ["plugins", "install", "--link", pluginDirectory], { encoding: "utf8", stdio: "pipe" });
  if (installed.error) {
    process.stdout.write(`Generated OpenClaw plugin in ${pluginDirectory}\n`);
    process.stdout.write(`After installing OpenClaw, run: openclaw plugins install --link ${shellQuote(pluginDirectory)}\n`);
  } else if (installed.status !== 0) {
    throw new Error(installed.stderr || installed.stdout || "OpenClaw plugin installation failed.");
  } else {
    process.stdout.write(`Installed ContextKit OpenClaw plugin from ${pluginDirectory}\n`);
  }
  process.stdout.write("Enable raw conversation access for this plugin, export CONTEXTKIT_API_KEY, then restart the OpenClaw Gateway:\n");
  process.stdout.write("openclaw config set plugins.entries.contextkit-autocapture.hooks.allowConversationAccess true\n");
}

async function installHookFiles(hookDirectory, templateName, hookTarget) {
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  await mkdir(hookDirectory, { recursive: true, mode: 0o700 });
  await Promise.all([
    copyFile(resolve(packageRoot, "templates", templateName), hookTarget),
    copyFile(resolve(packageRoot, "src", "core.mjs"), resolve(hookDirectory, "contextkit-autocapture-core.mjs"))
  ]);
}

async function readJsonOrEmpty(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw new Error(`Cannot parse ${path}. Fix its JSON before installing the hook.`);
  }
}

async function mergeHermesHook(configPath, hookCommand) {
  let text = "";
  try {
    text = await readFile(configPath, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (text.includes(hookCommand)) return;

  const lines = text.replace(/\s+$/, "").split(/\r?\n/).filter((line, index, all) => !(all.length === 1 && index === 0 && line === ""));
  const hooksIndex = lines.findIndex((line) => /^hooks:\s*(?:#.*)?$/.test(line));
  const entry = [`    - command: ${yamlString(hookCommand)}`, "      timeout: 45"];

  if (hooksIndex === -1) {
    if (lines.length) lines.push("");
    lines.push("hooks:", "  post_llm_call:", ...entry);
  } else {
    let hooksEnd = lines.length;
    for (let index = hooksIndex + 1; index < lines.length; index += 1) {
      if (/^[^\s#]/.test(lines[index])) {
        hooksEnd = index;
        break;
      }
    }
    const postIndex = lines.findIndex((line, index) => index > hooksIndex && index < hooksEnd && /^  post_llm_call:\s*(?:#.*)?$/.test(line));
    const inlinePost = lines.find((line, index) => index > hooksIndex && index < hooksEnd && /^  post_llm_call:\s*\S+/.test(line));
    if (inlinePost) throw new Error(`Cannot safely merge inline Hermes post_llm_call config in ${configPath}. Convert it to a YAML list first.`);

    if (postIndex === -1) {
      lines.splice(hooksIndex + 1, 0, "  post_llm_call:", ...entry);
    } else {
      let postEnd = hooksEnd;
      for (let index = postIndex + 1; index < hooksEnd; index += 1) {
        if (/^  [^\s#]/.test(lines[index])) {
          postEnd = index;
          break;
        }
      }
      lines.splice(postEnd, 0, ...entry);
    }
  }

  await mkdir(dirname(configPath), { recursive: true, mode: 0o700 });
  await writeFile(configPath, `${lines.join("\n")}\n`, { mode: 0o600 });
  await chmod(configPath, 0o600);
}

function printCaptureResult(result) {
  const experience = savedExperience(result);
  if (experience?.id) {
    process.stderr.write(`[ContextKit] Private draft saved: ${experience.id} (${experience.title}). Publish only with explicit user approval.\n`);
  } else {
    process.stderr.write(`[ContextKit] ${result?.reason || "No reusable completed experience detected."}\n`);
  }
}

function savedExperience(result) {
  if (result?.shouldSave && result?.experience?.id) return result.experience;
  for (const recovered of result?.recovered ?? []) {
    if (recovered?.result?.shouldSave && recovered.result.experience?.id) return recovered.result.experience;
  }
  return undefined;
}

function promptFromArgs(args) {
  const separator = args.indexOf("--");
  return (separator >= 0 ? args.slice(separator + 1) : args).join(" ").trim();
}

function activeTasks(tasks) {
  return Array.isArray(tasks) && tasks.some((task) => !["completed", "failed", "cancelled"].includes(String(task?.status).toLowerCase()));
}

function appendIfMissing(messages, role, value) {
  const content = redactSensitive(value);
  if (!content) return;
  const last = messages[messages.length - 1];
  if (last?.role !== role || last.content !== content) messages.push({ role, content });
}

function nodeCommand(path) {
  return `node ${shellQuote(path)}`;
}

function shellQuote(value) {
  return `"${String(value).replace(/[\\"$`]/g, "\\$&")}"`;
}

function yamlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function printHelp() {
  process.stdout.write(`ContextKit Auto-Capture\n\nCommands:\n  install claude [--global]\n  install codex [--global]\n  install hermes\n  install opencode [--global]\n  install openclaw [--global]\n  hook claude|codex|hermes\n  run cursor|claude|codex -- <task>\n  submit <transcript.jsonl>\n\nEnvironment:\n  CONTEXTKIT_API_KEY       scoped ContextKit key (required)\n  CONTEXTKIT_BASE_URL      defaults to https://contextkit.pro\n  CONTEXTKIT_CURSOR_BIN    defaults to cursor-agent\n  CONTEXTKIT_CLAUDE_BIN    defaults to claude\n  CONTEXTKIT_CODEX_BIN     defaults to codex\n  CONTEXTKIT_HERMES_BIN    defaults to hermes\n  CONTEXTKIT_OPENCLAW_BIN  defaults to openclaw\n`);
}
