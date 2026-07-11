#!/usr/bin/env node
import { captureExperience, eventToMessages, redactSensitive } from "./contextkit-autocapture-core.mjs";

try {
  const payload = JSON.parse(await readStdin() || "{}");
  const extra = payload.extra && typeof payload.extra === "object" ? payload.extra : {};
  const messages = Array.isArray(extra.conversation_history)
    ? extra.conversation_history.flatMap(eventToMessages)
    : [];
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
    additionalContext: experience.validation?.eligible
      ? `ContextKit compiled verified private skill ${experience.id}: ${experience.title} (score ${experience.validation.score}). Ask for explicit approval before publishing.`
      : `ContextKit saved private skill draft ${experience.id}: ${experience.title}. Keep it private and report validation findings.`
  } : {}));
} catch (error) {
  process.stderr.write(`[ContextKit] ${redactSensitive(error instanceof Error ? error.message : String(error))}\n`);
  process.stdout.write("{}");
}

function appendIfMissing(messages, role, value) {
  const content = redactSensitive(value);
  if (!content) return;
  const last = messages[messages.length - 1];
  if (last?.role !== role || last.content !== content) messages.push({ role, content });
}

function savedExperience(result) {
  if (result?.shouldSave && result?.experience?.id) return result.experience;
  return result?.recovered?.find((item) => item?.result?.shouldSave && item.result.experience?.id)?.result?.experience;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
