const vscode = require("vscode");
const { spawn } = require("node:child_process");
const { readFile } = require("node:fs/promises");

const SECRET_KEY = "contextkit.autocapture.apiKey";

/** @param {vscode.ExtensionContext} context */
function activate(context) {
  const output = vscode.window.createOutputChannel("ContextKit Auto-Capture");
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 80);
  status.text = "$(sparkle) ContextKit Capture";
  status.tooltip = "Run an agent task with guaranteed ContextKit experience consideration";
  status.command = "contextkit.runCapturedAgent";
  status.show();

  context.subscriptions.push(
    output,
    status,
    vscode.commands.registerCommand("contextkit.configureApiKey", () => configureApiKey(context)),
    vscode.commands.registerCommand("contextkit.runCapturedAgent", () => runCapturedAgent(context, output, status)),
    vscode.commands.registerCommand("contextkit.captureTranscript", () => captureTranscript(context, output, status))
  );
}

async function configureApiKey(context) {
  const key = await vscode.window.showInputBox({
    title: "ContextKit API key",
    prompt: "Enter a dedicated context:write key. It is stored in VS Code SecretStorage and never written to settings.json.",
    password: true,
    ignoreFocusOut: true,
    validateInput: (value) => value.trim().length < 16 ? "Enter a valid scoped ContextKit API key." : undefined
  });
  if (!key) return false;
  await context.secrets.store(SECRET_KEY, key.trim());
  void vscode.window.showInformationMessage("ContextKit API key stored securely for this IDE profile.");
  return true;
}

async function runCapturedAgent(context, output, status) {
  const apiKey = await requireApiKey(context);
  if (!apiKey) return;
  const agent = await vscode.window.showQuickPick([
    { label: "Cursor Agent", id: "cursor", description: "cursor-agent stream-json" },
    { label: "Claude Code", id: "claude", description: "claude -p stream-json" },
    { label: "Codex CLI", id: "codex", description: "codex exec --json" }
  ], { title: "Run through the ContextKit guaranteed capture lane" });
  if (!agent) return;
  const prompt = await vscode.window.showInputBox({
    title: `Task for ${agent.label}`,
    prompt: "This request and the completed agent stream will be considered for a private reusable-experience draft.",
    ignoreFocusOut: true
  });
  if (!prompt?.trim()) return;

  const config = vscode.workspace.getConfiguration("contextkit.autoCapture");
  const executableSetting = agent.id === "cursor"
    ? "cursorExecutable"
    : agent.id === "codex"
      ? "codexExecutable"
      : "claudeExecutable";
  const executable = config.get(executableSetting);
  const args = agent.id === "cursor"
    ? ["-p", "--output-format", "stream-json", prompt.trim()]
    : agent.id === "codex"
      ? ["exec", "--json", prompt.trim()]
      : ["-p", "--verbose", "--output-format", "stream-json", prompt.trim()];
  const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  output.clear();
  output.show(true);
  output.appendLine(`[ContextKit] Starting ${agent.label}. Secrets are redacted before capture.`);
  status.text = "$(sync~spin) ContextKit running";
  const chunks = [];
  try {
    const exitCode = await new Promise((resolve, reject) => {
      const child = spawn(executable, args, { cwd: workspace, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
      child.on("error", reject);
      child.stdout.on("data", (chunk) => {
        const text = chunk.toString();
        chunks.push(text);
        output.append(text);
      });
      child.stderr.on("data", (chunk) => output.append(chunk.toString()));
      child.on("close", resolve);
    });
    if (exitCode !== 0) throw new Error(`${agent.label} exited with status ${exitCode}; capture was not submitted.`);

    status.text = "$(sync~spin) ContextKit considering";
    const core = await import("./dist/src/core.mjs");
    const messages = core.parseTranscript(chunks.join(""));
    const result = await core.captureExperience({
      messages,
      userRequest: prompt.trim(),
      apiKey,
      baseUrl: config.get("baseUrl"),
      minConfidence: config.get("minConfidence"),
      priceUsd: 0.05,
      source: "vscode-extension-runner",
      agent: agent.id,
      workspace,
      cachePath: context.globalStorageUri.fsPath + "/capture-cache.json"
    });
    await presentResult(result, apiKey, config, output);
  } catch (error) {
    const message = safeError(error);
    output.appendLine(`\n[ContextKit] ${message}`);
    void vscode.window.showErrorMessage(`ContextKit auto-capture failed: ${message}`);
  } finally {
    status.text = "$(sparkle) ContextKit Capture";
  }
}

async function captureTranscript(context, output, status) {
  const apiKey = await requireApiKey(context);
  if (!apiKey) return;
  const selected = await vscode.window.showOpenDialog({
    title: "Select an agent JSON or JSONL transcript",
    canSelectMany: false,
    filters: { "Agent transcripts": ["json", "jsonl", "ndjson"] }
  });
  if (!selected?.[0]) return;
  const config = vscode.workspace.getConfiguration("contextkit.autoCapture");
  status.text = "$(sync~spin) ContextKit considering";
  try {
    const core = await import("./dist/src/core.mjs");
    const messages = core.parseTranscript(await readFile(selected[0].fsPath, "utf8"));
    const result = await core.captureExperience({
      messages,
      apiKey,
      baseUrl: config.get("baseUrl"),
      minConfidence: config.get("minConfidence"),
      priceUsd: 0.05,
      source: "vscode-extension-transcript",
      workspace: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      cachePath: context.globalStorageUri.fsPath + "/capture-cache.json"
    });
    await presentResult(result, apiKey, config, output);
  } catch (error) {
    void vscode.window.showErrorMessage(`ContextKit transcript capture failed: ${safeError(error)}`);
  } finally {
    status.text = "$(sparkle) ContextKit Capture";
  }
}

async function presentResult(result, apiKey, config, output) {
  const experience = savedExperience(result);
  if (!experience?.id) {
    const reason = result?.reason || "No reusable completed experience detected.";
    output.appendLine(`\n[ContextKit] ${reason}`);
    void vscode.window.showInformationMessage(`ContextKit: ${reason}`);
    return;
  }
  output.appendLine(`\n[ContextKit] Private draft saved: ${experience.id} (${experience.title})`);
  if (!experience.validation?.eligible) {
    const findings = experience.validation?.findings?.join(" ") || "The draft did not pass verified-skill validation.";
    output.appendLine(`[ContextKit] Kept private: ${findings}`);
    void vscode.window.showWarningMessage(`ContextKit kept this skill private: ${findings}`);
    return;
  }
  const action = await vscode.window.showInformationMessage(
    `ContextKit compiled a verified private skill: ${experience.title} (score ${experience.validation.score}). Publish it for Bankr x402 installation?`,
    "Publish for $0.05",
    "Keep private"
  );
  if (!action?.startsWith("Publish")) return;
  await publishExperience(experience.id, apiKey, config.get("baseUrl"));
  output.appendLine(`[ContextKit] Published ${experience.id} after explicit IDE approval.`);
  void vscode.window.showInformationMessage("ContextKit verified skill published successfully.");
}

function savedExperience(result) {
  if (result?.shouldSave && result?.experience?.id) return result.experience;
  for (const recovered of result?.recovered || []) {
    if (recovered?.result?.shouldSave && recovered.result.experience?.id) return recovered.result.experience;
  }
  return undefined;
}

async function publishExperience(skillId, apiKey, baseUrl) {
  const response = await fetch(String(baseUrl).replace(/\/$/, "") + "/api/skills/publish", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ skillId, priceUsd: 0.05, userApproved: true })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Publish failed with HTTP ${response.status}: ${body.slice(0, 300)}`);
  }
}

async function requireApiKey(context) {
  let key = await context.secrets.get(SECRET_KEY);
  if (key) return key;
  const configure = await vscode.window.showWarningMessage("ContextKit needs a dedicated context:write API key.", "Configure key");
  if (configure !== "Configure key" || !await configureApiKey(context)) return undefined;
  key = await context.secrets.get(SECRET_KEY);
  return key;
}

function safeError(error) {
  return String(error instanceof Error ? error.message : error)
    .replace(/\b(?:sk|bk|ck|re|ghp|github_pat)_[A-Za-z0-9_-]{10,}\b/g, "[redacted-secret]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted-secret]")
    .slice(0, 600);
}

function deactivate() {}

module.exports = { activate, deactivate };
