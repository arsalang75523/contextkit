export default async function handler(req: Request) {
  const body = await req.text();
  return forwardToContextKit(body, resolveCorePath(body), "contextkit-core");
}

function resolveCorePath(body: string) {
  let payload: { endpoint?: string; operation?: string; mode?: string } = {};
  try {
    payload = JSON.parse(body);
  } catch {
    return "/api/internal/summarize";
  }

  const operation = String(payload.endpoint ?? payload.operation ?? payload.mode ?? "").toLowerCase();
  if (operation === "compress" || operation === "compress-context") return "/api/internal/compress-context";
  if (operation === "handoff") return "/api/internal/handoff";
  if (operation === "profile" || operation === "extract-profile") return "/api/internal/extract-profile";
  if (operation === "memory" || operation === "memory-enrichment") return "/api/internal/extract-profile";
  return "/api/internal/summarize";
}

async function forwardToContextKit(body: string, path: string, service: string) {
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
    body
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" }
  });
}
