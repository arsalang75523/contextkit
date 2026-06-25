export default async function handler(req: Request) {
  return forwardToContextKit(req, "/api/internal/experience/buy", "contextkit-experience-buy");
}

async function forwardToContextKit(req: Request, path: string, service: string) {
  const baseUrl = process.env.CONTEXTKIT_BACKEND_URL;
  const token = process.env.CONTEXTKIT_INTERNAL_TOKEN;
  if (!baseUrl || !token) {
    return Response.json({ error: "ContextKit backend is not configured." }, { status: 500 });
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-ContextKit-X402-Hosted": "bankr",
      "X-ContextKit-X402-Service": service
    },
    body: await req.text()
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" }
  });
}
