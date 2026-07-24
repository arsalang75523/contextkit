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

  const clientName = escapeHtml(authorization.client.clientName);
  const accountName = escapeHtml(account.name || "your ContextKit account");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Connect ${clientName} | ContextKit</title>
  <style>
    :root{--ink:#f2fff9;--muted:#91a69d;--line:rgba(181,255,224,.14);--line-strong:rgba(115,243,195,.34);--panel:rgba(9,16,13,.88);--mint:#73f3c3;--cyan:#68d8ff;--coral:#ff7b6b;--bg:#040706}
    *{box-sizing:border-box}
    html{min-height:100%;background:var(--bg)}
    body{min-height:100vh;margin:0;overflow-x:hidden;background:radial-gradient(circle at 12% 9%,rgba(115,243,195,.13),transparent 28rem),radial-gradient(circle at 92% 84%,rgba(104,216,255,.08),transparent 28rem),var(--bg);color:var(--ink);font:16px/1.5 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    body:before{position:fixed;inset:0;pointer-events:none;content:"";background-image:linear-gradient(rgba(219,255,239,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(219,255,239,.04) 1px,transparent 1px);background-size:48px 48px;mask-image:linear-gradient(to bottom,black,transparent 88%)}
    .shell{position:relative;display:grid;grid-template-columns:minmax(0,.9fr) minmax(480px,1.1fr);gap:clamp(36px,7vw,112px);width:min(1120px,calc(100% - 40px));min-height:100vh;margin:auto;padding:clamp(32px,6vh,72px) 0;align-items:center}
    .brand{display:flex;align-items:center;gap:13px;margin-bottom:clamp(56px,10vh,112px)}
    .brand-mark{position:relative;display:grid;width:44px;height:44px;border:1px solid var(--line-strong);border-radius:13px;background:linear-gradient(145deg,rgba(115,243,195,.12),rgba(104,216,255,.04));place-items:center;box-shadow:inset 0 0 24px rgba(115,243,195,.06)}
    .brand-mark:before{width:19px;height:12px;border-left:2px solid var(--mint);border-right:2px solid var(--mint);content:"";transform:skew(-15deg);box-shadow:7px 0 0 -5px var(--mint)}
    .brand-mark:after{position:absolute;right:-3px;bottom:-3px;width:8px;height:8px;border:3px solid var(--bg);border-radius:50%;background:var(--mint);content:"";box-shadow:0 0 16px var(--mint)}
    .brand-copy strong{display:block;font-size:17px;letter-spacing:.08em}.brand-copy span{display:block;margin-top:2px;color:var(--muted);font:10px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.2em;text-transform:uppercase}
    .eyebrow{display:flex;align-items:center;gap:10px;margin:0 0 18px;color:var(--mint);font:700 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.19em;text-transform:uppercase}
    .pulse{width:7px;height:7px;border-radius:50%;background:var(--mint);box-shadow:0 0 0 5px rgba(115,243,195,.08),0 0 18px rgba(115,243,195,.6);animation:pulse 2.4s ease-in-out infinite}
    h1{max-width:620px;margin:0;font-size:clamp(42px,5.4vw,70px);line-height:.96;letter-spacing:-.055em}
    h1 em{display:block;margin-top:8px;background:linear-gradient(90deg,var(--mint),var(--cyan));background-clip:text;-webkit-background-clip:text;color:transparent;font-style:normal}
    .lead{max-width:540px;margin:26px 0 0;color:#b8c9c1;font-size:17px;line-height:1.75}
    .trust-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:32px}
    .trust{display:flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid var(--line);border-radius:999px;background:rgba(9,16,13,.54);color:#b8c9c1;font:600 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase}
    .trust:before{width:6px;height:6px;border-radius:50%;background:var(--mint);content:"";box-shadow:0 0 9px rgba(115,243,195,.45)}
    .card{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:24px;background:linear-gradient(145deg,rgba(255,255,255,.025),transparent 36%),var(--panel);box-shadow:0 32px 100px rgba(0,0,0,.42),inset 0 1px rgba(255,255,255,.035);backdrop-filter:blur(18px)}
    .card:before{position:absolute;inset:0;pointer-events:none;background:linear-gradient(120deg,rgba(115,243,195,.06),transparent 25%,transparent 72%,rgba(104,216,255,.04));content:""}
    .card-head,.client,.permission,.identity,.actions,.card-foot{position:relative}
    .card-head{display:flex;align-items:center;justify-content:space-between;padding:20px 22px;border-bottom:1px solid var(--line)}
    .overline{color:var(--muted);font:700 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.18em;text-transform:uppercase}
    .live{display:flex;align-items:center;gap:8px;color:var(--mint);font:700 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase}.live:before{width:6px;height:6px;border-radius:50%;background:var(--mint);content:"";box-shadow:0 0 12px var(--mint)}
    .client{display:grid;grid-template-columns:54px 1fr;gap:16px;padding:26px 24px 20px;align-items:center}
    .client-icon{display:grid;width:54px;height:54px;border:1px solid var(--line-strong);border-radius:16px;background:rgba(115,243,195,.07);color:var(--mint);font:700 17px ui-monospace,SFMono-Regular,Menlo,monospace;place-items:center}
    .client-icon:before{content:"MCP"}
    .client-label{margin:0 0 5px;color:var(--muted);font:700 10px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase}
    .client-name{margin:0;font-size:21px;line-height:1.25;letter-spacing:-.02em;overflow-wrap:anywhere}
    .identity{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 24px;padding:14px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
    .identity span{color:var(--muted);font:10px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.13em;text-transform:uppercase}.identity strong{max-width:60%;font-size:13px;font-weight:650;text-align:right;overflow-wrap:anywhere}
    .permission{margin:20px 24px;padding:18px;border:1px solid rgba(115,243,195,.2);border-radius:15px;background:rgba(115,243,195,.055)}
    .permission-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
    .permission h2{margin:4px 0 5px;font:700 14px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--ink)}.permission p{margin:0;color:var(--muted);font-size:13px;line-height:1.55}
    .scope{flex:none;padding:7px 9px;border:1px solid rgba(104,216,255,.23);border-radius:7px;background:rgba(104,216,255,.06);color:var(--cyan);font:700 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
    .permission-note{display:flex;gap:9px;margin-top:14px;padding-top:14px;border-top:1px solid rgba(115,243,195,.11);color:#a9bbb3;font-size:12px;line-height:1.5}.permission-note:before{color:var(--mint);content:"//";font:700 11px ui-monospace,SFMono-Regular,Menlo,monospace}
    form{margin:0}
    .actions{display:grid;grid-template-columns:1fr auto;gap:10px;padding:4px 24px 24px}
    button{min-height:50px;border-radius:12px;padding:0 18px;font:750 14px ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer;transition:transform .18s ease,border-color .18s ease,background .18s ease,box-shadow .18s ease}
    button:focus-visible{outline:2px solid var(--cyan);outline-offset:3px}
    button:hover{transform:translateY(-1px)}
    .allow{border:1px solid var(--mint);background:var(--mint);color:#031a10;box-shadow:0 12px 34px rgba(115,243,195,.16)}.allow:hover{background:#8bffd0;box-shadow:0 14px 40px rgba(115,243,195,.24)}
    .deny{border:1px solid var(--line);background:rgba(255,255,255,.025);color:#b8c9c1}.deny:hover{border-color:rgba(255,123,107,.35);color:#fff}
    .card-foot{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 24px;border-top:1px solid var(--line);color:#71857c;font:9px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase}
    @keyframes pulse{0%,100%{opacity:.55;transform:scale(.9)}50%{opacity:1;transform:scale(1.08)}}
    @media(max-width:880px){.shell{grid-template-columns:1fr;width:min(620px,calc(100% - 32px));padding:28px 0 48px}.brand{margin-bottom:64px}.intro{padding:0 4px}h1{font-size:clamp(40px,12vw,62px)}.card{margin-top:4px}}
    @media(max-width:520px){.shell{width:min(100% - 24px,620px)}.brand{margin-bottom:46px}.lead{font-size:15px}.trust-row{gap:7px}.trust{padding:8px 9px;font-size:9px}.card{border-radius:19px}.client{grid-template-columns:45px 1fr;padding:22px 18px 17px}.client-icon{width:45px;height:45px;border-radius:13px;font-size:13px}.identity,.permission{margin-left:18px;margin-right:18px}.permission-top{display:block}.scope{display:inline-block;margin-top:13px}.actions{grid-template-columns:1fr;padding:2px 18px 18px}.allow{order:1}.deny{order:2}.card-foot{align-items:flex-start;padding:14px 18px}.card-foot span:last-child{text-align:right}}
    @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
  </style>
</head>
<body>
  <main class="shell">
    <section class="intro" aria-labelledby="connection-title">
      <div class="brand" aria-label="ContextKit">
        <span class="brand-mark" aria-hidden="true"></span>
        <span class="brand-copy"><strong>ContextKit</strong><span>Agent continuity layer</span></span>
      </div>
      <p class="eyebrow"><span class="pulse" aria-hidden="true"></span>Secure MCP handshake</p>
      <h1 id="connection-title">Connect your agent.<em>Keep control.</em></h1>
      <p class="lead">Authorize a scoped connection for automatic skill capture and agent continuity. No API key copying, no private wallet access, and no public publishing without your approval.</p>
      <div class="trust-row" aria-label="Connection safeguards">
        <span class="trust">PKCE S256</span>
        <span class="trust">Scoped access</span>
        <span class="trust">Revocable</span>
      </div>
    </section>
    <section class="card" aria-label="ContextKit connection approval">
      <header class="card-head">
        <span class="overline">Connection request</span>
        <span class="live">Verified origin</span>
      </header>
      <div class="client">
        <span class="client-icon" aria-hidden="true"></span>
        <div>
          <p class="client-label">Agent client</p>
          <h2 class="client-name">${clientName}</h2>
        </div>
      </div>
      <div class="identity">
        <span>Signed in as</span>
        <strong>${accountName}</strong>
      </div>
      <div class="permission">
        <div class="permission-top">
          <div>
            <h2>Context write access</h2>
            <p>Call ContextKit MCP tools and use credits from this account.</p>
          </div>
          <span class="scope">context:write</span>
        </div>
        <div class="permission-note">Private drafts may be captured automatically. Public marketplace publishing still requires explicit approval.</div>
      </div>
      <form method="post" action="/oauth/authorize">
        ${fields}
        <div class="actions">
          <button class="allow" type="submit" name="decision" value="allow">Allow secure connection &rarr;</button>
          <button class="deny" type="submit" name="decision" value="deny">Cancel</button>
        </div>
      </form>
      <footer class="card-foot">
        <span>OAuth 2.0 + PKCE</span>
        <span>Resource: contextkit.pro/mcp</span>
      </footer>
    </section>
  </main>
</body>
</html>`;
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
