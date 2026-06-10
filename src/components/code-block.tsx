"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="relative min-w-0 max-w-full overflow-hidden">
      <button
        type="button"
        aria-label="Copy code"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md border border-line bg-ink/80 text-white/70 transition hover:text-white"
      >
        {copied ? <Check className="h-4 w-4 text-mint" /> : <Copy className="h-4 w-4" />}
      </button>
      <pre className="code-block rounded-md pr-14">
        <code>{code}</code>
      </pre>
    </div>
  );
}
