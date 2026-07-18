import test from "node:test";
import assert from "node:assert/strict";
import { ContextService } from "./context-service";

test("micro accepts an LLM-generated action-led goal for a short task", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return Response.json({
      choices: [{
        message: {
          content: JSON.stringify({
            micro: "Deployment validation completed.",
            state: {
              goal: "Validate the new ContextKit deployment",
              status: "Production build passed and all four Bankr endpoints are active",
              blockers: [],
              decisions: [],
              priorities: [],
              nextSteps: []
            }
          })
        }
      }]
    });
  };

  try {
    const service = new ContextService({
      requestId: "req_micro_smoke",
      env: {
        BANKR_LLM_KEY: "bk_test_server_only",
        BANKR_LLM_BASE_URL: "https://llm.test/v1"
      }
    });
    const result = await service.summarize({
      mode: "micro",
      messages: [{
        role: "user",
        content: "The goal is to validate the new ContextKit deployment. All four Bankr endpoints are active and the production build passed."
      }]
    });

    assert.equal(result.mode, "micro");
    assert.match(result.micro, /goal:Validate (?:the )?new ContextKit deployment/i);
    assert.equal(calls, 1, "A valid LLM goal must not trigger repair calls.");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
