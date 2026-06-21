import { McpOAuthService, OAuthRequestError } from "@/lib/mcp-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const client = await new McpOAuthService().registerClient(body);
    return Response.json(client, { status: 201, headers: noStoreHeaders() });
  } catch (error) {
    return oauthError(error);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function oauthError(error: unknown) {
  const oauthError = error instanceof OAuthRequestError ? error : new OAuthRequestError("server_error", 500);
  return Response.json({ error: oauthError.code, error_description: oauthError.message }, { status: oauthError.status, headers: noStoreHeaders() });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600"
  };
}

function noStoreHeaders() {
  return { ...corsHeaders(), "Cache-Control": "no-store" };
}
