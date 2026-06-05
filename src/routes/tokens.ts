import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { tokenEstimateSchema } from "@/types/api";
import { TokenService } from "@/services/token-service";
import { requireApiKey } from "@/middleware/auth";
import type { AppBindings } from "@/types/bindings";

export const tokenRoutes = new Hono<AppBindings>();

tokenRoutes.post("/tokens/estimate", requireApiKey("context:write"), zValidator("json", tokenEstimateSchema), async (c) => {
  const input = c.req.valid("json");
  return c.json(new TokenService().estimate(input.input, input.compressed, input.modelFamily));
});
