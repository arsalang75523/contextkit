import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "@/types/bindings";

export function payloadLimit(maxBytes = 512_000): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const routeLimit = skillBundleRoute(c.req.path) ? 1_000_000 : maxBytes;
    const length = Number(c.req.header("content-length") ?? 0);
    if (length > routeLimit) {
      return c.json(
        {
          error: {
            code: "payload_too_large",
            message: `Payload exceeds ${routeLimit} bytes.`,
            requestId: c.get("requestId")
          }
        },
        413
      );
    }

    await next();
  };
}

function skillBundleRoute(path: string) {
  return ["/api/skills/validate", "/api/skills/push", "/api/internal/skills/push"].includes(path);
}
