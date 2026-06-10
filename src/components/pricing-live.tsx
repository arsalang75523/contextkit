"use client";

import { useEffect, useState } from "react";

type PublicMetrics = {
  totalRequests: number;
  averageTokenReduction: number;
  webhookDeliveries: number;
  compressionSavings: number;
  paymentTotal: number;
};

export function PricingLive() {
  const [metrics, setMetrics] = useState<PublicMetrics | null>(null);

  useEffect(() => {
    fetch("/api/public/metrics")
      .then((response) => response.json() as Promise<PublicMetrics>)
      .then(setMetrics)
      .catch(() => setMetrics(null));
  }, []);

  const savedTokens = metrics?.compressionSavings ?? 0;
  const monthlySavings = Number(((savedTokens / 1_000_000) * 15).toFixed(2));
  const items = [
    ["Real requests processed", String(metrics?.totalRequests ?? 0), "Pulled from ContextKit analytics storage."],
    ["Actual average reduction", `${metrics?.averageTokenReduction ?? 0}%`, "Computed from recorded request token counts."],
    ["Recorded saved tokens", String(savedTokens), "Only positive savings from real processed requests."],
    ["Estimated model savings", `$${monthlySavings}`, "Uses $15 per 1M saved tokens as a transparent estimate."]
  ];

  return (
    <div className="mt-10 grid gap-5 lg:grid-cols-4">
      {items.map(([title, metric, text]) => (
        <div key={title} className="rounded-md border border-line bg-mint/10 p-6">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-4 text-3xl font-semibold text-mint">{metric}</p>
          <p className="mt-3 leading-7 text-white/62">{text}</p>
        </div>
      ))}
    </div>
  );
}
