import { AccountService } from "@/services/account-service";
import { ApiKeyService } from "@/services/api-key-service";
import { AppKV } from "@/storage/app-kv";
import { base64Url, randomSecret, sha256 } from "@/utils/crypto";

const accessTokenTtlSeconds = 60 * 60;
const authorizationCodeTtlSeconds = 5 * 60;
const refreshTokenTtlSeconds = 30 * 24 * 60 * 60;
const supportedScopes = ["context:write"];

type OAuthClient = {
  clientId: string;
  clientName: string;
  redirectUris: string[];
  createdAt: string;
};

type AuthorizationRequest = {
  client: OAuthClient;
  redirectUri: string;
  state?: string;
  codeChallenge: string;
  scopes: string[];
  resource: string;
};

type AuthorizationCode = {
  clientId: string;
  accountId: string;
  redirectUri: string;
  codeChallenge: string;
  scopes: string[];
  resource: string;
  usedAt?: string;
};

type OAuthAccessToken = {
  apiKey: string;
  clientId: string;
  accountId: string;
  scopes: string[];
  resource: string;
  expiresAt: number;
};

type OAuthRefreshToken = {
  apiKey: string;
  clientId: string;
  accountId: string;
  scopes: string[];
  resource: string;
  expiresAt: number;
};

export class OAuthRequestError extends Error {
  constructor(readonly code: string, readonly status = 400, message?: string) {
    super(message ?? code);
  }
}

export function contextKitOrigin(request?: Request) {
  const configured = process.env.CONTEXTKIT_BASE_URL ?? process.env.CONTEXTKIT_BACKEND_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall through to the safe production default.
    }
  }

  if (request) {
    const url = new URL(request.url);
    if (["localhost", "127.0.0.1"].includes(url.hostname)) return url.origin;
  }

  return "https://contextkit.pro";
}

export function oauthMetadata(request?: Request) {
  const origin = contextKitOrigin(request);
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: supportedScopes
  };
}

export function protectedResourceMetadata(request?: Request) {
  const origin = contextKitOrigin(request);
  return {
    resource: `${origin}/mcp`,
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
    scopes_supported: supportedScopes,
    resource_name: "ContextKit MCP"
  };
}

export function oauthChallenge(request: Request) {
  const origin = contextKitOrigin(request);
  return `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp", scope="context:write"`;
}

export class McpOAuthService {
  private readonly kv: AppKV;

  constructor(kv?: AppKV) {
    this.kv = kv ?? new AppKV();
  }

  async registerClient(input: unknown) {
    const record = asRecord(input);
    const redirectUris = uniqueStrings(stringArray(record.redirect_uris));
    if (redirectUris.length === 0 || redirectUris.length > 8 || redirectUris.some((uri) => !isValidRedirectUri(uri))) {
      throw new OAuthRequestError("invalid_redirect_uri", 400, "A valid redirect_uris array is required.");
    }

    const requestedAuthMethod = String(record.token_endpoint_auth_method ?? "none");
    if (requestedAuthMethod !== "none") {
      throw new OAuthRequestError("invalid_client_metadata", 400, "Only public PKCE clients are supported.");
    }

    const client: OAuthClient = {
      clientId: `ck_oauth_${randomSecret(18)}`,
      clientName: truncateText(String(record.client_name ?? "ContextKit MCP client"), 120) || "ContextKit MCP client",
      redirectUris,
      createdAt: new Date().toISOString()
    };
    await this.kv.set(`oauth-client:${client.clientId}`, client);

    return {
      client_id: client.clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"]
    };
  }

  async authorizeRequest(params: URLSearchParams, request: Request): Promise<AuthorizationRequest> {
    if (params.get("response_type") !== "code") {
      throw new OAuthRequestError("unsupported_response_type", 400, "response_type=code is required.");
    }

    const clientId = params.get("client_id");
    const redirectUri = params.get("redirect_uri");
    const codeChallenge = params.get("code_challenge");
    if (!clientId || !redirectUri || !codeChallenge) {
      throw new OAuthRequestError("invalid_request", 400, "client_id, redirect_uri, and code_challenge are required.");
    }
    if (params.get("code_challenge_method") !== "S256" || !isPkceChallenge(codeChallenge)) {
      throw new OAuthRequestError("invalid_request", 400, "PKCE S256 is required.");
    }

    const client = await this.kv.get<OAuthClient>(`oauth-client:${clientId}`);
    if (!client || !client.redirectUris.includes(redirectUri)) {
      throw new OAuthRequestError("invalid_client", 400, "Client or redirect URI is not registered.");
    }

    const scopes = requestedScopes(params.get("scope"));
    const resource = params.get("resource") || `${contextKitOrigin(request)}/mcp`;
    if (normalizeResource(resource) !== `${contextKitOrigin(request)}/mcp`) {
      throw new OAuthRequestError("invalid_target", 400, "OAuth token is only valid for the ContextKit MCP resource.");
    }

    return {
      client,
      redirectUri,
      state: params.get("state") ?? undefined,
      codeChallenge,
      scopes,
      resource
    };
  }

  async signedInAccount(request: Request) {
    const sessionId = readCookie(request.headers.get("cookie"), "ck_session");
    const session = await new AccountService().getSession(sessionId);
    if (!session?.accountId) return null;
    return new AccountService().get(session.accountId);
  }

  async issueAuthorizationCode(authorization: AuthorizationRequest, accountId: string) {
    const code = `ck_oac_${randomSecret(32)}`;
    const hash = await sha256(code);
    const value: AuthorizationCode = {
      clientId: authorization.client.clientId,
      accountId,
      redirectUri: authorization.redirectUri,
      codeChallenge: authorization.codeChallenge,
      scopes: authorization.scopes,
      resource: authorization.resource
    };
    await this.kv.set(`oauth-code:${hash}`, value, authorizationCodeTtlSeconds);
    return code;
  }

  async exchangeCode(input: Record<string, string>) {
    const clientId = input.client_id;
    const code = input.code;
    const redirectUri = input.redirect_uri;
    const verifier = input.code_verifier;
    if (!clientId || !code || !redirectUri || !verifier) {
      throw new OAuthRequestError("invalid_request", 400, "client_id, code, redirect_uri, and code_verifier are required.");
    }

    const codeHash = await sha256(code);
    const stored = await this.kv.get<AuthorizationCode>(`oauth-code:${codeHash}`);
    if (!stored || stored.usedAt || stored.clientId !== clientId || stored.redirectUri !== redirectUri) {
      throw new OAuthRequestError("invalid_grant", 400, "Authorization code is invalid or already used.");
    }
    if (await pkceChallenge(verifier) !== stored.codeChallenge) {
      throw new OAuthRequestError("invalid_grant", 400, "PKCE verifier does not match.");
    }

    await this.kv.set(`oauth-code:${codeHash}`, { ...stored, usedAt: new Date().toISOString() }, 1);
    const apiKey = await new ApiKeyService().create({
      name: `MCP OAuth: ${clientId.slice(0, 20)}`,
      environment: "live",
      scopes: ["context:write"]
    }, stored.accountId);
    return this.issueTokens({
      apiKey: apiKey.key,
      clientId,
      accountId: stored.accountId,
      scopes: stored.scopes,
      resource: stored.resource
    });
  }

  async refresh(input: Record<string, string>) {
    const clientId = input.client_id;
    const refreshToken = input.refresh_token;
    if (!clientId || !refreshToken) {
      throw new OAuthRequestError("invalid_request", 400, "client_id and refresh_token are required.");
    }

    const refresh = await this.kv.get<OAuthRefreshToken>(`oauth-refresh:${await sha256(refreshToken)}`);
    if (!refresh || refresh.clientId !== clientId || refresh.expiresAt <= Date.now()) {
      throw new OAuthRequestError("invalid_grant", 400, "Refresh token is invalid or expired.");
    }
    if (!await new ApiKeyService().authenticate(refresh.apiKey)) {
      throw new OAuthRequestError("invalid_grant", 400, "OAuth authorization was revoked.");
    }
    return this.issueTokens(refresh);
  }

  async resolveAccessToken(token: string) {
    const access = await this.kv.get<OAuthAccessToken>(`oauth-access:${await sha256(token)}`);
    if (!access || access.expiresAt <= Date.now() || normalizeResource(access.resource) !== `${contextKitOrigin()}/mcp`) return null;
    return access;
  }

  private async issueTokens(identity: Omit<OAuthAccessToken, "expiresAt">) {
    const accessToken = `ck_oat_${randomSecret(32)}`;
    const refreshToken = `ck_ort_${randomSecret(32)}`;
    const access: OAuthAccessToken = {
      ...identity,
      expiresAt: Date.now() + accessTokenTtlSeconds * 1000
    };
    const refresh: OAuthRefreshToken = {
      ...identity,
      expiresAt: Date.now() + refreshTokenTtlSeconds * 1000
    };
    await Promise.all([
      this.kv.set(`oauth-access:${await sha256(accessToken)}`, access, accessTokenTtlSeconds),
      this.kv.set(`oauth-refresh:${await sha256(refreshToken)}`, refresh, refreshTokenTtlSeconds)
    ]);
    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: accessTokenTtlSeconds,
      refresh_token: refreshToken,
      scope: identity.scopes.join(" ")
    };
  }
}

export function redirectWithAuthorizationResult(authorization: AuthorizationRequest, values: Record<string, string>) {
  const redirect = new URL(authorization.redirectUri);
  for (const [key, value] of Object.entries(values)) redirect.searchParams.set(key, value);
  if (authorization.state) redirect.searchParams.set("state", authorization.state);
  return redirect.toString();
}

export function authorizationFormHtml(authorization: AuthorizationRequest, account: { email: string; name: string }) {
  const fields = [
    ["response_type", "code"],
    ["client_id", authorization.client.clientId],
    ["redirect_uri", authorization.redirectUri],
    ["code_challenge", authorization.codeChallenge],
    ["code_challenge_method", "S256"],
    ["scope", authorization.scopes.join(" ")],
    ["resource", authorization.resource],
    ...(authorization.state ? [["state", authorization.state]] : [])
  ].map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}">`).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Authorize ContextKit MCP</title><style>body{margin:0;background:#07100f;color:#edf8f4;font:16px ui-sans-serif,system-ui;display:grid;min-height:100vh;place-items:center}.card{max-width:540px;margin:24px;padding:32px;border:1px solid #24443a;border-radius:18px;background:#0b1915;box-shadow:0 24px 80px #0008}h1{margin:0 0 12px;font-size:28px}.muted{color:#a7c4b8;line-height:1.6}.scope{margin:20px 0;padding:16px;border-radius:12px;background:#10251f}.actions{display:flex;gap:12px;margin-top:24px}button{border:0;border-radius:10px;padding:12px 16px;font:inherit;font-weight:700;cursor:pointer}.allow{background:#82f5bd;color:#062116}.deny{background:#26342f;color:#eaf7f1}</style></head><body><main class="card"><p class="muted">ContextKit MCP authorization</p><h1>Connect ${escapeHtml(authorization.client.clientName)}</h1><p class="muted">Signed in as ${escapeHtml(account.email)}. This client will be able to call ContextKit MCP tools and spend credits from this account.</p><div class="scope"><strong>Requested permission</strong><br><span class="muted">context:write</span></div><form method="post" action="/oauth/authorize">${fields}<div class="actions"><button class="allow" name="decision" value="allow">Allow connection</button><button class="deny" name="decision" value="deny">Cancel</button></div></form></main></body></html>`;
}

function requestedScopes(scope: string | null) {
  const scopes = uniqueStrings((scope || "context:write").split(/\s+/).filter(Boolean));
  if (scopes.length === 0 || scopes.some((item) => !supportedScopes.includes(item))) {
    throw new OAuthRequestError("invalid_scope", 400, "Requested OAuth scope is not supported.");
  }
  return scopes;
}

function normalizeResource(value: string) {
  return value.replace(/\/$/, "");
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function truncateText(value: string, length: number) {
  return value.trim().replace(/\s+/g, " ").slice(0, length);
}

function isValidRedirectUri(value: string) {
  try {
    const url = new URL(value);
    if (url.hash) return false;
    if (url.protocol === "https:") return true;
    if (url.protocol === "http:") return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return /^[a-z][a-z0-9+.-]*:$/i.test(url.protocol);
  } catch {
    return false;
  }
}

function isPkceChallenge(value: string) {
  return /^[A-Za-z0-9~._-]{43,128}$/.test(value);
}

async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

function readCookie(cookie: string | null, name: string) {
  return cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
