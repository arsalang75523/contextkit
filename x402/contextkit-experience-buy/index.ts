export default async function handler(req: Request) {
  return forwardToContextKit(req, await req.text(), "/api/internal/experience/buy", "contextkit-experience-buy");
}

async function forwardToContextKit(req: Request, body: string, path: string, service: string) {
  const baseUrl = process.env.CONTEXTKIT_BACKEND_URL;
  const token = process.env.CONTEXTKIT_INTERNAL_TOKEN;
  if (!baseUrl || !token) {
    return Response.json({ error: "ContextKit backend is not configured." }, { status: 500 });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-ContextKit-X402-Hosted": "bankr",
    "X-ContextKit-X402-Service": service
  };
  const delegation = req.headers.get("X-ContextKit-Delegation");
  const paymentId = req.headers.get("X-ContextKit-X402-Payment-Id");
  if (delegation) headers["X-ContextKit-Delegation"] = delegation;
  if (paymentId) headers["X-ContextKit-X402-Payment-Id"] = paymentId;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers,
    body
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" }
  });
}
