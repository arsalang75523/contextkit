import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "@/types/bindings";

export function payloadLimit(maxBytes = 512_000): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const length = Number(c.req.header("content-length") ?? 0);
    if (length > maxBytes) {
      return c.json(
        {
          error: {
            code: "payload_too_large",
            message: `Payload exceeds ${maxBytes} bytes.`,
            requestId: c.get("requestId")
          }
        },
        413
      );
    }

    await next();
  };
}
