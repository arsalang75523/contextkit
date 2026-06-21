import { authorizationFormHtml, contextKitOrigin, McpOAuthService, OAuthRequestError, redirectWithAuthorizationResult } from "@/lib/mcp-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const service = new McpOAuthService();
    const authorization = await service.authorizeRequest(new URL(request.url).searchParams, request);
    const account = await service.signedInAccount(request);
    if (!account) return redirectToLogin(request);
    return html(authorizationFormHtml(authorization, account));
  } catch (error) {
    return authorizationError(error);
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const params = new URLSearchParams();
    for (const [key, value] of form.entries()) params.set(key, typeof value === "string" ? value : "");
    const service = new McpOAuthService();
    const authorization = await service.authorizeRequest(params, request);
    if (params.get("decision") !== "allow") {
      return Response.redirect(redirectWithAuthorizationResult(authorization, { error: "access_denied" }), 302);
    }
    const account = await service.signedInAccount(request);
    if (!account) return redirectToLogin(request);
    const code = await service.issueAuthorizationCode(authorization, account.id);
    return Response.redirect(redirectWithAuthorizationResult(authorization, { code }), 302);
  } catch (error) {
    return authorizationError(error);
  }
}

function redirectToLogin(request: Request) {
  const current = new URL(request.url);
  const login = new URL("/dashboard/login", contextKitOrigin(request));
  login.searchParams.set("returnTo", `${current.pathname}${current.search}`);
  return Response.redirect(login, 302);
}

function authorizationError(error: unknown) {
  const oauthError = error instanceof OAuthRequestError ? error : new OAuthRequestError("server_error", 500);
  return html(`<!doctype html><title>ContextKit OAuth error</title><main><h1>Connection could not be authorized</h1><p>${escapeHtml(oauthError.message)}</p></main>`, oauthError.status);
}

function html(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action https://contextkit.pro https://www.contextkit.pro; base-uri 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
