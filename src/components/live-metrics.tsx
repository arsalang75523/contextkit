"use client";

import { useEffect, useState } from "react";

type Metrics = {
  totalRequests: number;
  averageTokenReduction: number;
  webhookDeliveries: number;
  compressionSavings: number;
  paymentTotal: number;
  totalRevenue: number;
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
    ["Paid endpoints", 4],
    ["Starting price", "$0.03"],
    ["Total revenue", `$${(metrics?.totalRevenue ?? 0).toFixed(3)}`]
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
