"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyMcpButton({ endpoint }: { endpoint: string }) {
  const [copied, setCopied] = useState(false);

  async function copyEndpoint() {
    await navigator.clipboard.writeText(endpoint);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return <button type="button" onClick={copyEndpoint} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-aqua px-4 text-sm font-semibold text-ink transition hover:bg-mint">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy MCP"}</button>;
}
