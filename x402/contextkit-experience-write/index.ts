export default async function handler(req: Request) {
  const body = await req.text();
  return forwardToContextKit(req, body, resolveExperienceWritePath(body), "contextkit-experience-write");
}

function resolveExperienceWritePath(body: string) {
  let payload: { mode?: string; operation?: string; action?: string; experience?: { priceUsd?: number }; priceUsd?: number } = {};
  try {
    payload = JSON.parse(body);
  } catch {
    return "/api/internal/experience/save";
  }

  const operation = String(payload.mode ?? payload.operation ?? payload.action ?? "").toLowerCase();
  if (["skill-validate", "skill-push"].includes(operation)) return "/api/internal/skills/push";
  if (["consider", "experience-consider", "skill-compile", "compile"].includes(operation)) return "/api/internal/experience/consider";
  if (["publish", "experience-publish", "skill-publish", "skill-repository-publish"].includes(operation)) return "/api/internal/experience/publish";
  if (typeof payload.priceUsd === "number" || typeof payload.experience?.priceUsd === "number") return "/api/internal/experience/publish";
  return "/api/internal/experience/save";
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
