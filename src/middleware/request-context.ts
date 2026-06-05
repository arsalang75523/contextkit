import type { MiddlewareHandler } from "hono";
import { createId } from "@/utils/id";
import type { AppBindings } from "@/types/bindings";

export const requestContext: MiddlewareHandler<AppBindings> = async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? createId("req");
  c.set("requestId", requestId);
  c.set("startedAt", Date.now());
  await next();
  c.header("x-request-id", requestId);
};
