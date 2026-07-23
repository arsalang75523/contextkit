import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureExperience, latestCompletedTask, parseTranscript, redactSensitive } from "../src/core.mjs";

test("redacts common credentials before upload", () => {
  const value = redactSensitive("Authorization: Bearer abcdefghijklmnop api_key=sk_1234567890123456 code 123456");
  assert.equal(value.includes("abcdefghijklmnop"), false);
  assert.equal(value.includes("sk_1234567890123456"), false);
  assert.equal(value.includes("123456"), false);
});

test("extracts only the latest completed user task", () => {
  const messages = parseTranscript([
    JSON.stringify({ type: "user", message: { role: "user", content: "old task" } }),
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "old result" }] } }),
    JSON.stringify({ type: "user", message: { role: "user", content: "fix checkout tests" } }),
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", name: "Write", input: { file_path: "tests/checkout.test.ts", content: "secret source" } }] } }),
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "tests now pass" }] } })
  ].join("\n"));
  const task = latestCompletedTask(messages);
  assert.equal(task[0].content, "fix checkout tests");
  assert.equal(JSON.stringify(task).includes("old task"), false);
  assert.equal(JSON.stringify(task).includes("secret source"), false);
  assert.equal(JSON.stringify(task).includes("tests/checkout.test.ts"), true);
});

test("parses OpenCode session message records", () => {
  const messages = parseTranscript(JSON.stringify([
    { info: { role: "user" }, parts: [{ type: "text", text: "Fix webhook retries" }] },
    { info: { role: "assistant" }, parts: [
      { type: "tool", tool: "apply_patch", state: { status: "completed", input: { patchText: "secret source" }, output: "Done" } },
      { type: "text", text: "Added bounded retry and tests pass." }
    ] }
  ]));
  assert.equal(messages[0].content, "Fix webhook retries");
  assert.equal(messages.some((message) => message.content.includes("tests pass")), true);
  assert.equal(JSON.stringify(messages).includes("secret source"), false);
});

test("parses Codex JSONL completed items without retaining raw write payloads", () => {
  const messages = parseTranscript([
    JSON.stringify({ type: "item.completed", item: { type: "command_execution", command: "npm test", status: "completed", aggregated_output: "12 tests passed" } }),
    JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "Fixed the retry policy and verified all tests." } })
  ].join("\n"));
  assert.equal(messages.some((message) => message.content.includes("npm test")), true);
  assert.equal(messages.some((message) => message.content.includes("all tests")), true);
});

test("preserves the final PASS summary from long Claude and OpenCode tool output", () => {
  const longPrefix = "setup output\n".repeat(500);
  const finalSummary = "Tests: 24 passed, 0 failed. Build completed with exit code 0.";
  const messages = parseTranscript(JSON.stringify([
    { info: { role: "user" }, parts: [{ type: "text", text: "Verify the release" }] },
    { info: { role: "assistant" }, parts: [{
      type: "tool",
      tool: "bash",
      state: {
        status: "completed",
        input: { command: "npm test && npm run build" },
        output: `${longPrefix}${finalSummary}`
      }
    }] }
  ]));

  assert.equal(messages.some((message) => message.content.includes(finalSummary)), true);
  assert.equal(messages.some((message) => message.content.includes("[tool-result:middle-truncated]")), true);
});

test("queues a sanitized task and recovers it after a temporary failure", async () => {
  const directory = await mkdtemp(join(tmpdir(), "contextkit-autocapture-"));
  const cachePath = join(directory, "cache.json");
  const outboxPath = join(directory, "outbox.json");
  const options = {
    messages: [
      { role: "user", content: "Fix webhook retry with token=sk_1234567890123456" },
      { role: "assistant", content: "Added bounded exponential retry and tests pass." }
    ],
    apiKey: "ck_test_not_uploaded",
    baseUrl: "https://contextkit.invalid",
    cachePath,
    outboxPath,
    retryBaseMs: 1
  };

  await assert.rejects(() => captureExperience({ ...options, fetch: async () => { throw new Error("offline"); } }), /queued/);
  const queued = await readFile(outboxPath, "utf8");
  assert.equal(queued.includes("sk_1234567890123456"), false);

  const response = { ok: true, status: 200, text: async () => JSON.stringify({ shouldSave: false, reason: "not reusable" }) };
  const recovered = await captureExperience({ ...options, fetch: async () => response });
  assert.equal(recovered.skipped, true);
  assert.equal(recovered.recovered.length, 1);
});
