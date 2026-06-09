import type { MiddlewareHandler } from "hono";
import { log } from "@/lib/logger";
import type { AppBindings } from "@/types/bindings";
import type { ContextEndpoint } from "@/types/api";
import { PaymentService } from "@/services/payment-service";
import { endpointPricing } from "@/lib/pricing";

export function x402PaymentRequired(endpoint: ContextEndpoint): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const amountUsd = endpointPricing[endpoint];
    const paymentHeader =
      c.req.header("x-payment") ??
      c.req.header("x402-payment") ??
      c.req.header("payment-signature") ??
      c.req.header("x-payment-payload");
    const paymentService = new PaymentService(c.env ?? {});

    if (!paymentHeader) {
      const accepts = paymentService.paymentRequirements(c.req.url, amountUsd);
      addPaymentRequiredHeaders(c, accepts);
      return c.json(
        {
          x402Version: 1,
          error: "Payment required to access this resource",
          accepts,
          requestId: c.get("requestId")
        },
        402
      );
    }

    const verification = await paymentService.verify(paymentHeader, c.req.url, amountUsd);
    if (!verification.ok || !verification.paymentId) {
      const accepts = paymentService.paymentRequirements(c.req.url, amountUsd);
      addPaymentRequiredHeaders(c, accepts);
      return c.json(
        {
          x402Version: 1,
          error: "Payment verification failed",
          accepts,
          requestId: c.get("requestId"),
          details: verification.error
        },
        402
      );
    }

    const payment = {
      route: `/${endpoint}`,
      amountUsd,
      paymentId: verification.paymentId,
      payer: verification.payer ?? c.req.header("x-agent-id") ?? c.get("apiKey")?.id
    };

    c.set("payment", payment);
    await paymentService.recordPayment({
      ...payment,
      requestId: c.get("requestId"),
      apiKeyId: c.get("apiKey")?.id,
      facilitatorResponse: verification.facilitatorResponse
    });

    log("info", "x402 payment accepted", { requestId: c.get("requestId"), ...payment });
    await next();
  };
}

function addPaymentRequiredHeaders(c: Parameters<MiddlewareHandler<AppBindings>>[0], accepts: unknown) {
  const payload = JSON.stringify({ x402Version: 1, accepts });
  const encoded =
    typeof btoa === "function"
      ? btoa(payload)
      : Buffer.from(payload, "utf8").toString("base64");
  c.header("PAYMENT-REQUIRED", encoded);
  c.header("X-PAYMENT-REQUIRED", encoded);
}
