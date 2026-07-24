#!/usr/bin/env node
import { createHash, randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { access, chmod, copyFile, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import {
  defaultAuthorizationPath,
  removeAuthorization,
  resolveAuthorization,
  saveAuthorization
} from "../src/contextkit-autocapture-auth.mjs";
import { captureExperience, eventToMessages, parseTranscript, readTranscriptFile, redactSensitive } from "../src/core.mjs";

const [command = "help", subject, ...rest] = process.argv.slice(2);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageMetadata = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8"));

try {
  if (command === "setup") await setup([subject, ...rest].filter(Boolean));
  else if (command === "doctor") await doctor();
  else if (command === "logout") await logout();
  else if (command === "version" || command === "--version" || command === "-v") printVersion();
  else if (command === "hook" && subject === "claude") await claudeHook();
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
        additionalContext: skillDraftMessage(experience)
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
    systemMessage: skillDraftMessage(experience)
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
    additionalContext: skillDraftMessage(experience)
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

async function setup(args) {
  const baseUrl = normalizeBaseUrl(optionValue(args, "--base-url") || process.env.CONTEXTKIT_BASE_URL || "https://contextkit.pro");
  const agents = await selectedAgents(args);
  if (agents.length === 0) {
    throw new Error("No supported agent host was detected. Retry with `--agents claude,opencode`.");
  }

  process.stdout.write(`ContextKit setup\nDetected: ${agents.join(", ")}\n`);
  await ensureGlobalInstall(args);
  const authorization = await browserAuthorization(baseUrl);
  const credentialPath = await saveAuthorization(authorization);

  for (const agent of agents) {
    await installAgent(agent);
  }

  await verifyMcpConnection({ token: authorization.accessToken, baseUrl });
  process.stdout.write(`\nContextKit is connected.\nCredential: ${credentialPath} (0600)\nAuto-capture: ${agents.join(", ")}\nPublic publishing: approval required\n`);
}

async function doctor() {
  const baseUrl = normalizeBaseUrl(process.env.CONTEXTKIT_BASE_URL || "https://contextkit.pro");
  const authorization = await resolveAuthorization({ baseUrl });
  await verifyMcpConnection({ token: authorization.token, baseUrl });
  process.stdout.write(`ContextKit connection OK (${authorization.source}, ${authorization.transport}).\n`);
}

async function logout() {
  const removed = await removeAuthorization();
  process.stdout.write(removed ? "Removed the stored ContextKit login.\n" : "No stored ContextKit login was found.\n");
}

async function browserAuthorization(baseUrl) {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(24).toString("base64url");
  const callback = await callbackServer(state);

  try {
    const registered = await jsonRequest(`${baseUrl}/oauth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: `ContextKit Auto-Capture ${packageMetadata.version}`,
        redirect_uris: [callback.redirectUri],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"]
      })
    });
    const clientId = registered.client_id;
    if (!clientId) throw new Error("ContextKit OAuth registration did not return a client ID.");

    const authorizationUrl = new URL("/oauth/authorize", baseUrl);
    authorizationUrl.search = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: callback.redirectUri,
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
      scope: "context:write",
      resource: `${baseUrl}/mcp`
    }).toString();

    process.stdout.write("Opening ContextKit sign-in in your browser...\n");
    process.stdout.write(`If the browser does not open, use:\n${authorizationUrl}\n`);
    if (!openBrowser(authorizationUrl.toString())) {
      process.stdout.write("No browser launcher was detected; open the URL above manually.\n");
    }
    const code = await callback.waitForCode();
    const token = await jsonRequest(`${baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        code,
        redirect_uri: callback.redirectUri,
        code_verifier: verifier
      })
    });
    if (!token.access_token || !token.refresh_token) throw new Error("ContextKit OAuth token exchange failed.");

    return {
      baseUrl,
      clientId,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + Number(token.expires_in || 3600) * 1000,
      scope: token.scope || "context:write"
    };
  } finally {
    await callback.close();
  }
}

async function callbackServer(expectedState) {
  let settled = false;
  let resolveCode;
  let rejectCode;
  const codePromise = new Promise((resolvePromise, rejectPromise) => {
    resolveCode = resolvePromise;
    rejectCode = rejectPromise;
  });
  const server = createServer((request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (url.pathname !== "/oauth/callback") {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const valid = !error && state === expectedState && Boolean(code);
    response.writeHead(valid ? 200 : 400, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff"
    });
    response.end(oauthCallbackPage(valid));

    if (settled) return;
    settled = true;
    if (error) rejectCode(new Error(`ContextKit authorization was denied: ${error}`));
    else if (state !== expectedState) rejectCode(new Error("ContextKit OAuth state did not match."));
    else if (!code) rejectCode(new Error("ContextKit authorization did not return a code."));
    else resolveCode(code);
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not start the local ContextKit OAuth callback.");
  const timeout = setTimeout(() => {
    if (settled) return;
    settled = true;
    rejectCode(new Error("ContextKit sign-in timed out. Run setup again."));
  }, 5 * 60_000);
  timeout.unref();

  return {
    redirectUri: `http://127.0.0.1:${address.port}/oauth/callback`,
    waitForCode: () => codePromise,
    close: async () => {
      clearTimeout(timeout);
      if (!server.listening) return;
      await new Promise((resolveClose) => server.close(resolveClose));
    }
  };
}

function oauthCallbackPage(connected) {
  const stateClass = connected ? "connected" : "failed";
  const status = connected ? "Handshake complete" : "Handshake interrupted";
  const title = connected ? "ContextKit connected." : "Connection failed.";
  const detail = connected
    ? "Your scoped MCP credential is being stored locally. Auto-capture setup will finish in the terminal."
    : "No credential was stored. Return to the terminal to review the error and retry setup.";
  const terminalLine = connected
    ? "$ contextkit-autocapture setup  // connected"
    : "$ contextkit-autocapture setup  // retry";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>${connected ? "ContextKit connected" : "ContextKit connection failed"}</title>
  <style>
    :root{--ink:#f2fff9;--muted:#91a69d;--line:rgba(181,255,224,.14);--mint:#73f3c3;--cyan:#68d8ff;--coral:#ff7b6b;--bg:#040706}
    *{box-sizing:border-box}
    html{min-height:100%;background:var(--bg)}
    body{display:grid;min-height:100vh;margin:0;overflow:hidden;background:radial-gradient(circle at 50% 22%,rgba(115,243,195,.12),transparent 28rem),radial-gradient(circle at 90% 90%,rgba(104,216,255,.07),transparent 25rem),var(--bg);color:var(--ink);font:16px/1.5 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;place-items:center}
    body:before{position:fixed;inset:0;pointer-events:none;content:"";background-image:linear-gradient(rgba(219,255,239,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(219,255,239,.04) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(circle at 50% 40%,black,transparent 78%)}
    .wrap{position:relative;width:min(680px,calc(100% - 28px));padding:32px 0}
    .brand{display:flex;align-items:center;justify-content:center;gap:11px;margin-bottom:28px;color:#cce0d7;font:700 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase}
    .brand:before{width:8px;height:8px;border-radius:50%;background:var(--mint);content:"";box-shadow:0 0 16px var(--mint)}
    .card{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:26px;background:linear-gradient(145deg,rgba(255,255,255,.03),transparent 36%),rgba(8,15,12,.92);box-shadow:0 34px 110px rgba(0,0,0,.5),inset 0 1px rgba(255,255,255,.04);text-align:center}
    .card:before{position:absolute;inset:0;pointer-events:none;background:linear-gradient(120deg,rgba(115,243,195,.065),transparent 26%,transparent 74%,rgba(104,216,255,.04));content:""}
    .content{position:relative;padding:clamp(34px,8vw,68px)}
    .signal{position:relative;display:grid;width:82px;height:82px;margin:0 auto 30px;border:1px solid rgba(115,243,195,.3);border-radius:24px;background:rgba(115,243,195,.07);color:var(--mint);place-items:center;box-shadow:0 0 0 10px rgba(115,243,195,.025),0 0 50px rgba(115,243,195,.08)}
    .signal:before{font:800 31px/1 ui-monospace,SFMono-Regular,Menlo,monospace;content:"✓"}
    .signal:after{position:absolute;right:-4px;bottom:-4px;width:12px;height:12px;border:4px solid var(--bg);border-radius:50%;background:var(--mint);content:"";box-shadow:0 0 15px var(--mint);animation:pulse 2s ease-in-out infinite}
    .failed .signal{border-color:rgba(255,123,107,.35);background:rgba(255,123,107,.07);color:var(--coral);box-shadow:0 0 0 10px rgba(255,123,107,.025),0 0 50px rgba(255,123,107,.08)}
    .failed .signal:before{content:"!"}.failed .signal:after{background:var(--coral);box-shadow:0 0 15px var(--coral)}
    .eyebrow{margin:0 0 14px;color:var(--mint);font:700 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.18em;text-transform:uppercase}.failed .eyebrow{color:var(--coral)}
    h1{margin:0;font-size:clamp(38px,8vw,60px);line-height:1;letter-spacing:-.05em}
    .detail{max-width:510px;margin:20px auto 0;color:#a9bbb3;font-size:16px;line-height:1.7}
    .terminal{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:32px;padding:16px 18px;border:1px solid var(--line);border-radius:13px;background:rgba(2,5,4,.68);text-align:left}
    .terminal code{color:#c9ded4;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}.terminal span{flex:none;color:var(--mint);font:700 9px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.13em;text-transform:uppercase}.failed .terminal span{color:var(--coral)}
    .steps{display:grid;grid-template-columns:repeat(3,1fr);margin-top:22px;border:1px solid var(--line);border-radius:13px;overflow:hidden}
    .step{padding:13px 10px;color:#687a72;font:700 9px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase}.step+.step{border-left:1px solid var(--line)}.step.done{color:#b7cbc1}.step.active{background:rgba(115,243,195,.055);color:var(--mint)}.failed .step.active{background:rgba(255,123,107,.055);color:var(--coral)}
    .foot{position:relative;display:flex;align-items:center;justify-content:center;gap:9px;padding:16px 20px;border-top:1px solid var(--line);color:#73867d;font:9px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase}.foot:before{color:var(--cyan);content:"//"}
    @keyframes pulse{0%,100%{opacity:.55;transform:scale(.85)}50%{opacity:1;transform:scale(1.1)}}
    @media(max-width:540px){body{overflow:auto}.content{padding:36px 20px}.terminal{display:block}.terminal span{display:block;margin-top:12px}.steps{grid-template-columns:1fr}.step+.step{border-top:1px solid var(--line);border-left:0}}
    @media(prefers-reduced-motion:reduce){*{animation:none!important}}
  </style>
</head>
<body>
  <main class="wrap ${stateClass}">
    <div class="brand">ContextKit / secure agent link</div>
    <section class="card" aria-labelledby="callback-title">
      <div class="content">
        <div class="signal" aria-hidden="true"></div>
        <p class="eyebrow">${status}</p>
        <h1 id="callback-title">${title}</h1>
        <p class="detail">${detail}</p>
        <div class="terminal">
          <code>${terminalLine}</code>
          <span>${connected ? "Return to terminal" : "Retry in terminal"}</span>
        </div>
        <div class="steps" aria-label="Connection progress">
          <div class="step done">01 / Sign in</div>
          <div class="step done">02 / Authorize</div>
          <div class="step active">03 / ${connected ? "Finish setup" : "Retry"}</div>
        </div>
      </div>
      <footer class="foot">${connected ? "You may safely close this tab" : "No account changes were completed"}</footer>
    </section>
  </main>
</body>
</html>`;
}

async function selectedAgents(args) {
  const explicit = optionValue(args, "--agents");
  const supported = ["claude", "codex", "hermes", "opencode", "openclaw"];
  if (explicit) {
    const values = explicit === "all"
      ? supported
      : Array.from(new Set(explicit.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean)));
    const invalid = values.filter((value) => !supported.includes(value));
    if (invalid.length) throw new Error(`Unsupported agent host: ${invalid.join(", ")}.`);
    return values;
  }

  const home = process.env.HOME || "~";
  const candidates = [
    ["claude", "claude", resolve(home, ".claude")],
    ["codex", "codex", resolve(home, ".codex")],
    ["hermes", process.env.CONTEXTKIT_HERMES_BIN || "hermes", resolve(home, ".hermes")],
    ["opencode", "opencode", resolve(home, ".config", "opencode")],
    ["openclaw", process.env.CONTEXTKIT_OPENCLAW_BIN || "openclaw", resolve(home, ".openclaw")]
  ];
  const detected = [];
  for (const [name, executable, configPath] of candidates) {
    if (commandAvailable(executable) || await pathExists(configPath)) detected.push(name);
  }
  return detected;
}

async function installAgent(agent) {
  if (agent === "claude") return installClaude(true);
  if (agent === "codex") return installCodex(true);
  if (agent === "hermes") return installHermes();
  if (agent === "opencode") return installOpenCode(true);
  if (agent === "openclaw") {
    await installOpenClaw(true);
    const openclaw = process.env.CONTEXTKIT_OPENCLAW_BIN || "openclaw";
    const enabled = spawnSync(openclaw, ["config", "set", "plugins.entries.contextkit-autocapture.hooks.allowConversationAccess", "true"], {
      encoding: "utf8",
      stdio: "pipe"
    });
    if (enabled.status === 0) process.stdout.write("Enabled ContextKit OpenClaw conversation access.\n");
    else process.stdout.write("OpenClaw requires one host approval for conversation access; see `contextkit-autocapture --help`.\n");
  }
}

async function ensureGlobalInstall(args) {
  if (args.includes("--skip-global-install")) return;
  process.stdout.write(`Installing persistent ContextKit Auto-Capture ${packageMetadata.version}...\n`);
  const installed = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["install", "--global", `${packageMetadata.name}@${packageMetadata.version}`],
    { encoding: "utf8", stdio: "inherit" }
  );
  if (installed.error || installed.status !== 0) {
    throw new Error("Could not install the persistent ContextKit runner. Fix npm global permissions and retry setup.");
  }
}

async function verifyMcpConnection({ token, baseUrl }) {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "MCP-Protocol-Version": "2025-03-26"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "contextkit-autocapture", version: packageMetadata.version }
      }
    })
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`ContextKit connection check failed (HTTP ${response.status}).`);
  const parsed = JSON.parse(body);
  if (parsed?.result?.serverInfo?.name !== "contextkit") throw new Error("ContextKit MCP returned an invalid connection response.");
}

function openBrowser(url) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  if (process.platform !== "win32" && !commandAvailable(command)) return false;
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const opened = spawn(command, args, { detached: true, stdio: "ignore" });
  opened.on("error", () => {});
  opened.unref();
  return true;
}

function commandAvailable(commandName) {
  const command = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(command, [commandName], { stdio: "ignore" });
  return result.status === 0;
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function jsonRequest(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  if (!response.ok) {
    throw new Error(body?.error_description || body?.error?.message || `ContextKit returned HTTP ${response.status}.`);
  }
  return body || {};
}

function optionValue(args, name) {
  const inline = args.find((value) => value.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function normalizeBaseUrl(value) {
  return new URL(String(value)).toString().replace(/\/$/, "");
}

function printVersion() {
  process.stdout.write(`${packageMetadata.version}\n`);
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
  const pluginTarget = resolve(pluginDirectory, "contextkit-autocapture.js");
  const coreTarget = resolve(pluginDirectory, "contextkit-autocapture-core.mjs");

  await mkdir(pluginDirectory, { recursive: true, mode: 0o700 });
  await Promise.all([
    copyFile(resolve(packageRoot, "templates", "opencode-plugin.mjs"), pluginTarget),
    copyFile(resolve(packageRoot, "src", "core.mjs"), coreTarget),
    copyFile(
      resolve(packageRoot, "src", "contextkit-autocapture-auth.mjs"),
      resolve(pluginDirectory, "contextkit-autocapture-auth.mjs")
    )
  ]);
  process.stdout.write(`Installed ContextKit OpenCode auto-capture plugin in ${pluginTarget}\n`);
  process.stdout.write("Private drafts are automatic; public publishing still requires approval.\n");
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
  process.stdout.write("Run /hooks once inside Codex if it asks you to review hook trust.\n");
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
  process.stdout.write("Run `hermes hooks list`, then approve the hook on first use if Hermes asks.\n");
}

async function installOpenClaw(globalInstall) {
  const pluginDirectory = globalInstall
    ? resolve(process.env.HOME || "~", ".contextkit", "plugins", "openclaw-contextkit-autocapture")
    : resolve(process.cwd(), ".contextkit", "openclaw-contextkit-autocapture");
  const templateDirectory = resolve(packageRoot, "templates", "openclaw");
  await mkdir(pluginDirectory, { recursive: true, mode: 0o700 });
  await Promise.all([
    copyFile(resolve(templateDirectory, "index.mjs"), resolve(pluginDirectory, "index.mjs")),
    copyFile(resolve(templateDirectory, "package.json"), resolve(pluginDirectory, "package.json")),
    copyFile(resolve(templateDirectory, "openclaw.plugin.json"), resolve(pluginDirectory, "openclaw.plugin.json")),
    copyFile(resolve(packageRoot, "src", "core.mjs"), resolve(pluginDirectory, "contextkit-autocapture-core.mjs")),
    copyFile(
      resolve(packageRoot, "src", "contextkit-autocapture-auth.mjs"),
      resolve(pluginDirectory, "contextkit-autocapture-auth.mjs")
    )
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
  process.stdout.write("Enable raw conversation access for this plugin, then restart the OpenClaw Gateway:\n");
  process.stdout.write("openclaw config set plugins.entries.contextkit-autocapture.hooks.allowConversationAccess true\n");
}

async function installHookFiles(hookDirectory, templateName, hookTarget) {
  await mkdir(hookDirectory, { recursive: true, mode: 0o700 });
  await Promise.all([
    copyFile(resolve(packageRoot, "templates", templateName), hookTarget),
    copyFile(resolve(packageRoot, "src", "core.mjs"), resolve(hookDirectory, "contextkit-autocapture-core.mjs")),
    copyFile(
      resolve(packageRoot, "src", "contextkit-autocapture-auth.mjs"),
      resolve(hookDirectory, "contextkit-autocapture-auth.mjs")
    )
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
    process.stderr.write(`[ContextKit] Private skill draft saved: ${experience.id} (${experience.title}). Publish only when validation is eligible and the user explicitly approves.\n`);
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

function skillDraftMessage(experience) {
  const validation = experience?.validation;
  if (validation?.eligible) {
    const passedEvidenceTests = validation.requirements?.publish?.passedEvidenceTests ?? validation.tests?.filter((test) => test.passed).length ?? 0;
    return `ContextKit compiled verified private skill ${experience.id}: ${experience.title} (score ${validation.score}, ${passedEvidenceTests} source-grounded PASS results). Keep it private. Build its complete repository bundle, call contextkit_skill_validate_bundle, then contextkit_skill_push. Only after both pass, show the proof and ask the user whether to publish with contextkit_skill_repository_publish.`;
  }
  return `ContextKit saved private skill draft ${experience.id}: ${experience.title}. It is not publishable yet. Report validation findings and keep it private until corrected.`;
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
  process.stdout.write(`ContextKit Auto-Capture\n\nQuick setup:\n  npx @basedchef/contextkit-autocapture setup\n  npx @basedchef/contextkit-autocapture setup --agents claude,opencode\n\nCommands:\n  setup [--agents LIST] [--base-url URL]\n  doctor\n  logout\n  install claude [--global]\n  install codex [--global]\n  install hermes\n  install opencode [--global]\n  install openclaw [--global]\n  hook claude|codex|hermes\n  run cursor|claude|codex -- <task>\n  submit <transcript.jsonl>\n  version\n\nSetup opens browser login, stores a refreshable OAuth credential in:\n  ${defaultAuthorizationPath()}\n\nEnvironment overrides:\n  CONTEXTKIT_API_KEY       optional scoped API-key override\n  CONTEXTKIT_BASE_URL      defaults to https://contextkit.pro\n  CONTEXTKIT_CURSOR_BIN    defaults to cursor-agent\n  CONTEXTKIT_CLAUDE_BIN    defaults to claude\n  CONTEXTKIT_CODEX_BIN     defaults to codex\n  CONTEXTKIT_HERMES_BIN    defaults to hermes\n  CONTEXTKIT_OPENCLAW_BIN  defaults to openclaw\n`);
}
