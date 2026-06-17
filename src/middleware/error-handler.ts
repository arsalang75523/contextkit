import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { log } from "@/lib/logger";
import type { AppBindings } from "@/types/bindings";

export const errorHandler: ErrorHandler<AppBindings> = (error, c) => {
  const requestId = c.get("requestId") ?? "unknown";
  const status = error instanceof ZodError ? 400 : error instanceof HTTPException ? error.status : 500;
  const code = error instanceof ZodError ? "validation_failed" : error instanceof HTTPException ? "request_failed" : "internal_error";

  log(status >= 500 ? "error" : "warn", "Request failed", {
    requestId,
    status,
    error: error.message
  });

  return c.json(
    {
      error: {
        code,
        message: status >= 500 ? "ContextKit could not complete the request." : error.message,
        requestId,
        details: error instanceof ZodError ? error.flatten() : undefined
      }
    },
    status
  );
};
