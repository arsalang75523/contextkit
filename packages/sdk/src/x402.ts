export type X402Challenge = {
  accepts?: Array<{
    scheme: string;
    network: string;
    maxAmountRequired: string;
    resource: string;
    payTo: string;
    asset: string;
  }>;
};

export function getFirstX402Requirement(challenge: X402Challenge) {
  const requirement = challenge.accepts?.[0];
  if (!requirement) {
    throw new Error("ContextKit response did not include an x402 payment requirement.");
  }
  return requirement;
}

export function encodeX402Payment(payment: unknown) {
  return typeof payment === "string" ? payment : JSON.stringify(payment);
}
