import { Hono } from "hono";
import type { AppBindings } from "@/types/bindings";

export const healthRoutes = new Hono<AppBindings>().get("/health", (c) =>
  c.json({
    name: "ContextKit",
    status: "ok",
    time: new Date().toISOString()
  })
);
