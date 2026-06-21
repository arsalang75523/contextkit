import { McpOAuthService, OAuthRequestError } from "@/lib/mcp-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = await formFields(request);
    const service = new McpOAuthService();
    const response = input.grant_type === "authorization_code"
      ? await service.exchangeCode(input)
      : input.grant_type === "refresh_token"
        ? await service.refresh(input)
        : (() => { throw new OAuthRequestError("unsupported_grant_type", 400); })();
    return Response.json(response, { headers: noStoreHeaders() });
  } catch (error) {
    const oauthError = error instanceof OAuthRequestError ? error : new OAuthRequestError("server_error", 500);
    return Response.json({ error: oauthError.code, error_description: oauthError.message }, { status: oauthError.status, headers: noStoreHeaders() });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

async function formFields(request: Request) {
  const form = await request.formData();
  return Object.fromEntries(Array.from(form.entries()).map(([key, value]) => [key, typeof value === "string" ? value : ""]));
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "600"
  };
}

function noStoreHeaders() {
  return { ...corsHeaders(), "Cache-Control": "no-store", Pragma: "no-cache" };
}
