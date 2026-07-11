#!/usr/bin/env node
import { captureExperience, eventToMessages, readTranscriptFile, redactSensitive } from "./contextkit-autocapture-core.mjs";

try {
  const payload = JSON.parse(await readStdin() || "{}");
  if (payload.stop_hook_active) {
    process.stdout.write("{}");
  } else {
    const messages = payload.transcript_path
      ? await readTranscriptFile(payload.transcript_path)
      : eventToMessages(payload);
    const result = await captureExperience({
      messages,
      source: "codex-stop-hook",
      agent: "codex",
      sessionId: payload.session_id,
      workspace: payload.cwd
    });
    const experience = savedExperience(result);
    process.stdout.write(JSON.stringify(experience?.id ? {
      systemMessage: experience.validation?.eligible
        ? `ContextKit compiled verified private skill ${experience.id}: ${experience.title} (score ${experience.validation.score}). Ask whether to publish it; never publish without explicit approval.`
        : `ContextKit saved private skill draft ${experience.id}: ${experience.title}. Keep it private and report validation findings.`
    } : {}));
  }
} catch (error) {
  process.stderr.write(`[ContextKit] ${redactSensitive(error instanceof Error ? error.message : String(error))}\n`);
  process.stdout.write("{}");
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
