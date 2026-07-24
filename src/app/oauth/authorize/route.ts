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
  return html(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>ContextKit connection error</title>
  <style>
    *{box-sizing:border-box}body{display:grid;min-height:100vh;margin:0;padding:24px;background:radial-gradient(circle at 50% 10%,rgba(255,123,107,.1),transparent 28rem),#040706;color:#f2fff9;font:16px/1.6 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;place-items:center}main{width:min(560px,100%);padding:38px;border:1px solid rgba(255,123,107,.25);border-radius:22px;background:rgba(10,15,13,.94);box-shadow:0 30px 100px rgba(0,0,0,.45)}.label{margin:0 0 12px;color:#ff7b6b;font:700 10px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.18em;text-transform:uppercase}h1{margin:0;font-size:clamp(34px,7vw,52px);line-height:1;letter-spacing:-.045em}p:last-child{margin:20px 0 0;padding:15px;border:1px solid rgba(181,255,224,.12);border-radius:12px;background:#050807;color:#a9bbb3;font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}
  </style>
</head>
<body><main><p class="label">OAuth handshake interrupted</p><h1>Connection could not be authorized.</h1><p>${escapeHtml(oauthError.message)}</p></main></body>
</html>`, oauthError.status);
}

function html(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      // OAuth desktop clients can cross a canonical-host boundary before this form renders.
      // Omitting form-action avoids a false CSP block while the POST remains same-route and PKCE protected.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
