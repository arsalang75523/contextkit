import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createContextKitMcpServer } from "@/lib/mcp-server";
import { ApiKeyService } from "@/services/api-key-service";
import { AppKV } from "@/storage/app-kv";
import { createId } from "@/utils/id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedOrigins = new Set(["https://contextkit.pro", "https://www.contextkit.pro", "http://localhost:3000"]);
const allowedHostNames = new Set(["contextkit.pro", "www.contextkit.pro", "localhost", "127.0.0.1"]);
const maxRequestsPerMinute = 60;

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return jsonError("origin_not_allowed", "Origin is not allowed.", 403, request);
  return withSecurityHeaders(new Response(null, { status: 204 }), request);
}

export async function GET(request: Request) {
  return handleMcpRequest(request);
}

export async function POST(request: Request) {
  return handleMcpRequest(request);
}

export async function DELETE(request: Request) {
  return handleMcpRequest(request);
}

async function handleMcpRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return jsonError("origin_not_allowed", "Origin is not allowed.", 403, request);

  if (!isTrustedHost(request)) return jsonError("host_not_allowed", "Host is not allowed.", 421, request);

  const apiKey = readBearerToken(request);
  if (!apiKey) return jsonError("unauthorized", "Authorization: Bearer <CONTEXTKIT_API_KEY> is required.", 401, request);

  const record = await new ApiKeyService().authenticate(apiKey);
  if (!record) return jsonError("invalid_api_key", "API key is invalid or revoked.", 401, request);
  if (!record.scopes.includes("context:write")) {
    return jsonError("insufficient_scope", "API key requires context:write.", 403, request);
  }

  const count = await new AppKV().increment(
    `rate:mcp:${record.id}:${Math.floor(Date.now() / 60_000)}`,
    60
  );
  if (count > maxRequestsPerMinute) {
    return jsonError("mcp_rate_limited", "MCP request limit exceeded. Retry after one minute.", 429, request);
  }

  try {
    const host = request.headers.get("host");
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      // The host was checked above in production. Passing the exact header also
      // keeps local MCP clients working on arbitrary development ports.
      allowedHosts: host ? [host] : undefined,
      allowedOrigins: Array.from(allowedOrigins),
      enableDnsRebindingProtection: true
    });
    const server = createContextKitMcpServer({
      apiKey,
      clientIp: trustedClientIp(request)
    });
    await server.connect(transport);
    return withSecurityHeaders(await transport.handleRequest(request), request);
  } catch {
    return jsonError("mcp_request_failed", "ContextKit MCP could not process this request.", 500, request);
  }
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.trim().split(/\s+/, 2);
  return scheme === "Bearer" && token ? token : null;
}

function trustedClientIp(request: Request) {
  // Cloudflare sets this header at the edge; do not accept arbitrary X-Forwarded-For values here.
  return request.headers.get("cf-connecting-ip") ?? undefined;
}

function isTrustedHost(request: Request) {
  if (process.env.NODE_ENV !== "production") return true;
  const host = request.headers.get("host")?.toLowerCase().split(":")[0];
  return Boolean(host && allowedHostNames.has(host));
}

function jsonError(code: string, message: string, status: number, request: Request) {
  const requestId = createId("req");
  return withSecurityHeaders(
    Response.json({ error: { code, message, requestId } }, { status }),
    request,
    requestId
  );
}

function withSecurityHeaders(response: Response, request: Request, requestId?: string) {
  const headers = new Headers(response.headers);
  const origin = request.headers.get("origin");

  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "false");
    headers.append("Vary", "Origin");
  }

  headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID"
  );
  headers.set("Access-Control-Expose-Headers", "MCP-Protocol-Version, MCP-Session-Id, X-Request-Id");
  headers.set("Access-Control-Max-Age", "600");
  headers.set("Cache-Control", "no-store");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Request-Id", requestId ?? headers.get("X-Request-Id") ?? createId("req"));

  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
