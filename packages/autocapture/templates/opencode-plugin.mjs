import { homedir } from "node:os";
import { join } from "node:path";
import { captureExperience, eventToMessages, redactSensitive } from "./contextkit-autocapture-core.mjs";

const active = new Set();
const failed = new Set();

export const ContextKitAutoCapture = async ({ client, directory }) => ({
  event: async ({ event }) => {
    const sessionId = event?.properties?.sessionID || event?.properties?.sessionId;
    if (!sessionId) return;

    if (event.type === "session.error") {
      failed.add(sessionId);
      return;
    }

    const status = event?.properties?.status;
    const statusType = typeof status === "string" ? status : status?.type;
    if (event.type === "session.status" && statusType && statusType !== "idle") {
      failed.delete(sessionId);
      return;
    }

    const isIdle = event.type === "session.idle" || (event.type === "session.status" && statusType === "idle");
    if (!isIdle || active.has(sessionId)) return;
    if (failed.delete(sessionId)) return;

    active.add(sessionId);
    try {
      const response = await client.session.messages({ path: { id: sessionId } });
      const records = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      const messages = records.flatMap(eventToMessages);
      const result = await captureExperience({
        messages,
        apiKey: process.env.CONTEXTKIT_API_KEY || process.env.CONTEXTKIT_MCP_KEY,
        baseUrl: process.env.CONTEXTKIT_BASE_URL,
        source: "opencode-session-idle",
        agent: "opencode",
        sessionId,
        workspace: directory,
        cachePath: join(homedir(), ".contextkit", "opencode-autocapture-cache.json"),
        outboxPath: join(homedir(), ".contextkit", "opencode-autocapture-outbox.json")
      });

      const experience = savedExperience(result);
      if (experience?.id) {
        await showToast(client, `ContextKit saved private draft: ${experience.title || experience.id}`, "success");
      }
    } catch (error) {
      await showToast(client, `ContextKit auto-capture: ${safeError(error)}`, "warning");
    } finally {
      active.delete(sessionId);
    }
  }
});

function savedExperience(result) {
  if (result?.shouldSave && result?.experience?.id) return result.experience;
  for (const recovered of result?.recovered || []) {
    if (recovered?.result?.shouldSave && recovered.result.experience?.id) return recovered.result.experience;
  }
  return undefined;
}

async function showToast(client, message, variant) {
  try {
    await client.tui.showToast({ body: { message: redactSensitive(message).slice(0, 240), variant } });
  } catch {
    // Headless OpenCode runs may not expose a TUI; capture still succeeds.
  }
}

function safeError(error) {
  return redactSensitive(error instanceof Error ? error.message : String(error)).slice(0, 180);
}
