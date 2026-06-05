import type { MiddlewareHandler } from "hono";
import { log } from "@/lib/logger";
import type { AppBindings } from "@/types/bindings";
import type { ContextEndpoint } from "@/types/api";
import { PaymentService } from "@/services/payment-service";
import { endpointPricing } from "@/lib/pricing";

export function x402PaymentRequired(endpoint: ContextEndpoint): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const amountUsd = endpointPricing[endpoint];
    const paymentHeader = c.req.header("x-payment") ?? c.req.header("x402-payment");
    const paymentService = new PaymentService(c.env ?? {});

    if (!paymentHeader) {
      return c.json(
        {
          error: {
            code: "payment_required",
            message: "This endpoint requires an x402 payment.",
            requestId: c.get("requestId")
          },
          accepts: paymentService.paymentRequirements(c.req.url, amountUsd)
        },
        402
      );
    }

    const verification = await paymentService.verify(paymentHeader, c.req.url, amountUsd);
    if (!verification.ok || !verification.paymentId) {
      return c.json(
        {
          error: {
            code: "payment_verification_failed",
            message: "x402 payment could not be verified.",
            requestId: c.get("requestId"),
            details: verification.error
          },
          accepts: paymentService.paymentRequirements(c.req.url, amountUsd)
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
