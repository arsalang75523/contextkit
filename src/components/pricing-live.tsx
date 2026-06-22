"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

type EndpointMetric = {
  endpoint: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  savedTokens: number;
  averageReductionPercent: number;
  averageLatencyMs: number;
  paymentTotal: number;
  lastRequestAt?: string;
};

type EndpointMetricsResponse = {
  endpoints: EndpointMetric[];
};

export function PricingEndpointStats({ endpoint }: { endpoint: string }) {
  const [metric, setMetric] = useState<EndpointMetric | null>(null);

  useEffect(() => {
    fetch("/api/public/endpoint-metrics")
      .then((response) => response.json() as Promise<EndpointMetricsResponse>)
      .then((payload) => setMetric(payload.endpoints.find((item) => item.endpoint === endpoint) ?? null))
      .catch(() => setMetric(null));
  }, [endpoint]);

  const stats = endpointStats(endpoint, metric);

  return (
    <div className="mt-5 rounded-lg border border-line bg-ink/55 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/35">{stats.title}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {stats.items.map((item) => (
          <EndpointStat key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-white/45">
        {stats.note}{metric?.lastRequestAt ? ` · Last request: ${new Date(metric.lastRequestAt).toLocaleDateString()}` : ""}
      </p>
    </div>
  );
}

function endpointStats(endpoint: string, metric: EndpointMetric | null) {
  const requests = metric?.requests ?? 0;
  const revenue = `$${(metric?.paymentTotal ?? 0).toFixed(3)}`;
  const inputTokens = metric?.inputTokens ?? 0;
  const outputTokens = metric?.outputTokens ?? 0;
  const savedTokens = metric?.savedTokens ?? 0;
  const latency = `${metric?.averageLatencyMs ?? 0}ms`;

  if (endpoint === "summarize") {
    return {
      title: "Live summarize usage",
      items: [
        { label: "Summaries", value: requests },
        { label: "Revenue", value: revenue },
        { label: "Saved tokens", value: savedTokens },
        { label: "Avg latency", value: latency }
      ],
      note: `Input ${inputTokens} -> output ${outputTokens} tokens.`
    };
  }

  if (endpoint === "compress-context") {
    return {
      title: "Live compression usage",
      items: [
        { label: "Compression runs", value: requests },
        { label: "Revenue", value: revenue },
        { label: "Compressed tokens", value: outputTokens },
        { label: "Avg latency", value: latency }
      ],
      note: `Processed ${inputTokens} source tokens into ${outputTokens} compressed-state tokens.`
    };
  }

  if (endpoint === "handoff") {
    return {
      title: "Live handoff usage",
      items: [
        { label: "Handoffs", value: requests },
        { label: "Revenue", value: revenue },
        { label: "Source tokens", value: inputTokens },
        { label: "Avg latency", value: latency }
      ],
      note: `Generated ${outputTokens} agent-transfer payload tokens.`
    };
  }

  if (endpoint === "extract-profile") {
    return {
      title: "Live profile + memory usage",
      items: [
        { label: "Profile runs", value: requests },
        { label: "Revenue", value: revenue },
        { label: "Memory output", value: outputTokens },
        { label: "Avg latency", value: latency }
      ],
      note: `Extract-profile includes durable profile and hosted memory extraction from ${inputTokens} input tokens.`
    };
  }

  return {
    title: "Live memory usage",
    items: [
      { label: "Enrichments", value: requests },
      { label: "Direct revenue", value: revenue },
      { label: "Memory tokens", value: outputTokens },
      { label: "Avg latency", value: latency }
    ],
    note: `Direct API-key memory route processed ${inputTokens} input tokens.`
  };
}

function EndpointStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-white/40">{label}</p>
      <p className="mt-1 font-mono text-mint">{value}</p>
    </div>
  );
}
