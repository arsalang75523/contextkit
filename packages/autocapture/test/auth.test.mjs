import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readAuthorization,
  resolveAuthorization,
  saveAuthorization
} from "../src/contextkit-autocapture-auth.mjs";

function authorization(overrides = {}) {
  return {
    baseUrl: "https://contextkit.example",
    clientId: "ck_oauth_test_client",
    accessToken: "ck_oat_test_access",
    refreshToken: "ck_ort_test_refresh",
    expiresAt: Date.now() + 60 * 60_000,
    scope: "context:write",
    ...overrides
  };
}

test("stores OAuth credentials in a user-only file and resolves them", async () => {
  const directory = await mkdtemp(join(tmpdir(), "contextkit-auth-"));
  const credentialsPath = join(directory, "credentials.json");
  await saveAuthorization(authorization(), credentialsPath);

  const permissions = (await stat(credentialsPath)).mode & 0o777;
  assert.equal(permissions, 0o600);
  const stored = await readAuthorization(credentialsPath);
  assert.equal(stored.accessToken, "ck_oat_test_access");

  const resolved = await resolveAuthorization({
    credentialsPath,
    baseUrl: "https://contextkit.example",
    ignoreEnvironment: true
  });
  assert.deepEqual(resolved, {
    token: "ck_oat_test_access",
    transport: "mcp",
    source: "stored-oauth"
  });
});

test("refreshes an expired OAuth credential and persists the replacement", async () => {
  const directory = await mkdtemp(join(tmpdir(), "contextkit-auth-refresh-"));
  const credentialsPath = join(directory, "credentials.json");
  await saveAuthorization(authorization({ expiresAt: Date.now() - 1 }), credentialsPath);

  const requests = [];
  const resolved = await resolveAuthorization({
    credentialsPath,
    baseUrl: "https://contextkit.example",
    ignoreEnvironment: true,
    fetch: async (url, init) => {
      requests.push({ url, init });
      return {
        ok: true,
        json: async () => ({
          access_token: "ck_oat_refreshed_access",
          refresh_token: "ck_ort_refreshed_token",
          expires_in: 3600,
          scope: "context:write"
        })
      };
    }
  });

  assert.equal(requests[0].url, "https://contextkit.example/oauth/token");
  assert.match(String(requests[0].init.body), /grant_type=refresh_token/);
  assert.equal(resolved.token, "ck_oat_refreshed_access");
  assert.equal((await readAuthorization(credentialsPath)).refreshToken, "ck_ort_refreshed_token");
});

test("keeps explicit API keys backward compatible", async () => {
  const resolved = await resolveAuthorization({ apiKey: "ck_live_existing_key" });
  assert.deepEqual(resolved, {
    token: "ck_live_existing_key",
    transport: "api",
    source: "environment"
  });
});
