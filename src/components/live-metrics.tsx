"use client";

import { useEffect, useState } from "react";

type Metrics = {
  totalRequests: number;
  averageTokenReduction: number;
  webhookDeliveries: number;
  compressionSavings: number;
  paymentTotal: number;
};

export function LiveMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    fetch("/api/public/metrics")
      .then((response) => response.json() as Promise<Metrics>)
      .then((value) => setMetrics(value))
      .catch(() => setMetrics(null));
  }, []);

  const items = [
    ["Requests processed", metrics?.totalRequests ?? 0],
    ["Avg token reduction", `${metrics?.averageTokenReduction ?? 0}%`],
    ["Saved tokens", metrics?.compressionSavings ?? 0],
    ["x402 revenue", `$${(metrics?.paymentTotal ?? 0).toFixed(3)}`]
  ];

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-md border border-line bg-white/[0.035] p-5">
          <p className="text-sm text-white/48">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}
