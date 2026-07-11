import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { captureExperience, eventToMessages, redactSensitive } from "./contextkit-autocapture-core.mjs";

const activeRuns = new Set();

export default definePluginEntry({
  id: "contextkit-autocapture",
  name: "ContextKit Auto-Capture",
  description: "Compile qualified OpenClaw outcomes into private tested ContextKit skill drafts.",
  register(api) {
    api.on("agent_end", async (event, context) => {
      const runId = event?.runId || context?.sessionKey || context?.sessionId || "openclaw-agent-end";
      if (event?.success === false || activeRuns.has(runId)) return;
      activeRuns.add(runId);
      try {
        const messages = Array.isArray(event.messages) ? event.messages.flatMap(eventToMessages) : [];
        const result = await captureExperience({
          messages,
          source: "openclaw-agent-end",
          agent: "openclaw",
          sessionId: String(runId),
          workspace: context?.workspaceDir || process.cwd()
        });
        const experience = savedExperience(result);
        if (experience?.id) {
          api.logger?.info?.(`ContextKit saved private skill draft ${experience.id}: ${redactSensitive(experience.title)}; verified=${Boolean(experience.validation?.eligible)}`);
        }
      } catch (error) {
        api.logger?.warn?.(`ContextKit auto-capture skipped: ${redactSensitive(error instanceof Error ? error.message : String(error))}`);
      } finally {
        activeRuns.delete(runId);
      }
    }, { timeoutMs: 30_000 });
  }
});

function savedExperience(result) {
  if (result?.shouldSave && result?.experience?.id) return result.experience;
  return result?.recovered?.find((item) => item?.result?.shouldSave && item.result.experience?.id)?.result?.experience;
}
