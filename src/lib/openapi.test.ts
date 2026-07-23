import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createOpenApiDocument } from "@/lib/openapi";

test("publishes pre-token hardening contracts without claiming a token launch", () => {
  const document = createOpenApiDocument() as unknown as {
    paths: Record<string, Record<string, unknown>>;
  };

  const expected = [
    ["/api/health", "get"],
    ["/api/ready", "get"],
    ["/api/public/launch-readiness", "get"],
    ["/api/skills/access", "post"],
    ["/api/dashboard/skills/library", "get"],
    ["/api/dashboard/skills/{skillId}/lifecycle", "post"],
    ["/api/admin/skills/{skillId}/moderation", "post"],
    ["/api/dashboard/payout/wallet/challenge", "post"],
    ["/api/dashboard/payout/wallet/verify", "post"],
    ["/api/dashboard/payout/request", "post"],
    ["/api/admin/payouts", "get"],
    ["/api/admin/payouts/{payoutId}", "post"]
  ] as const;

  for (const [path, method] of expected) {
    assert.ok(document.paths[path]?.[method], `${method.toUpperCase()} ${path} must be documented`);
  }

  const serialized = JSON.stringify(document);
  assert.match(serialized, /tokenLaunch=not-started|tokenLaunch.*not-started/);
  assert.doesNotMatch(serialized, /token launch is live/i);
});

test("Bankr skill purchases require a stable buyer identity before payment", () => {
  const config = JSON.parse(readFileSync("bankr.x402.json", "utf8")) as {
    services: {
      "contextkit-experience-buy": {
        schema: {
          input: {
            properties: Record<string, unknown>;
            required: string[];
          };
        };
      };
    };
  };
  const input = config.services["contextkit-experience-buy"].schema.input;

  assert.ok(
    input.properties.buyerId,
    "Bankr cannot preserve permanent access unless its paid request schema accepts buyerId"
  );
  assert.ok(
    input.required.includes("buyerId"),
    "buyerId must be collected before Bankr settles the paid request"
  );
});
