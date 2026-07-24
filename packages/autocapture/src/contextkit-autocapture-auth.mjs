import { chmod, lstat, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const REFRESH_SKEW_MS = 60_000;

export function defaultAuthorizationPath() {
  return join(homedir(), ".contextkit", "autocapture-credentials.json");
}

export async function saveAuthorization(value, explicitPath) {
  const path = explicitPath || defaultAuthorizationPath();
  const authorization = normalizeAuthorization(value);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(authorization, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, path);
  await chmod(path, 0o600);
  return path;
}

export async function readAuthorization(explicitPath) {
  const path = explicitPath || defaultAuthorizationPath();
  try {
    const stats = await lstat(path);
    if (stats.isSymbolicLink() || !stats.isFile()) {
      throw new Error(`Refusing unsafe ContextKit credential path: ${path}`);
    }
    if (typeof process.getuid === "function" && stats.uid !== process.getuid()) {
      throw new Error(`ContextKit credential file is not owned by the current user: ${path}`);
    }
    return normalizeAuthorization(JSON.parse(await readFile(path, "utf8")));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export async function removeAuthorization(explicitPath) {
  try {
    await unlink(explicitPath || defaultAuthorizationPath());
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

export async function resolveAuthorization(options = {}) {
  const directToken = options.apiKey
    || options.oauthToken
    || (!options.ignoreEnvironment && (process.env.CONTEXTKIT_API_KEY || process.env.CONTEXTKIT_MCP_KEY));
  if (directToken) {
    return {
      token: String(directToken),
      transport: isOAuthAccessToken(directToken) ? "mcp" : "api",
      source: "environment"
    };
  }

  const path = options.credentialsPath || defaultAuthorizationPath();
  let stored = await readAuthorization(path);
  if (!stored) {
    throw new Error("ContextKit is not connected. Run `npx @basedchef/contextkit-autocapture setup` once.");
  }

  const requestedBaseUrl = normalizeBaseUrl(options.baseUrl || process.env.CONTEXTKIT_BASE_URL || stored.baseUrl);
  if (requestedBaseUrl !== stored.baseUrl) {
    throw new Error(`Stored ContextKit login belongs to ${stored.baseUrl}. Run setup again for ${requestedBaseUrl}.`);
  }

  if (stored.expiresAt <= Date.now() + REFRESH_SKEW_MS) {
    stored = await refreshAuthorization(stored, { ...options, credentialsPath: path });
  }

  return {
    token: stored.accessToken,
    transport: "mcp",
    source: "stored-oauth"
  };
}

export async function refreshAuthorization(stored, options = {}) {
  const fetcher = options.fetch ?? fetch;
  const response = await fetcher(`${stored.baseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: stored.clientId,
      refresh_token: stored.refreshToken
    })
  });
  const body = await readJson(response);
  if (!response.ok || !body?.access_token) {
    throw new Error("ContextKit login expired or was revoked. Run `npx @basedchef/contextkit-autocapture setup` again.");
  }

  const refreshed = {
    ...stored,
    accessToken: body.access_token,
    refreshToken: body.refresh_token || stored.refreshToken,
    expiresAt: Date.now() + Number(body.expires_in || 3600) * 1000,
    scope: body.scope || stored.scope
  };
  await saveAuthorization(refreshed, options.credentialsPath);
  return refreshed;
}

function normalizeAuthorization(value) {
  if (!value || typeof value !== "object") throw new Error("ContextKit credential file is invalid.");
  const normalized = {
    version: 1,
    type: "oauth",
    baseUrl: normalizeBaseUrl(value.baseUrl),
    clientId: String(value.clientId || ""),
    accessToken: String(value.accessToken || ""),
    refreshToken: String(value.refreshToken || ""),
    expiresAt: Number(value.expiresAt || 0),
    scope: String(value.scope || "context:write")
  };
  if (
    !normalized.clientId.startsWith("ck_oauth_")
    || !isOAuthAccessToken(normalized.accessToken)
    || !normalized.refreshToken.startsWith("ck_ort_")
    || !Number.isFinite(normalized.expiresAt)
  ) {
    throw new Error("ContextKit credential file is invalid.");
  }
  return normalized;
}

function normalizeBaseUrl(value) {
  const url = new URL(String(value || "https://contextkit.pro"));
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("ContextKit base URL is invalid.");
  }
  return url.toString().replace(/\/$/, "");
}

function isOAuthAccessToken(value) {
  return String(value).startsWith("ck_oat_");
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
