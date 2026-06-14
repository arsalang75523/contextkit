"use client";

import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  icon,
  trend,
  trendLabel,
  variant = "default",
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  variant?: "default" | "mint" | "aqua" | "amber" | "coral";
}) {
  const variantStyles = {
    default: "border-line bg-white/[0.03]",
    mint: "border-mint/20 bg-mint/[0.04]",
    aqua: "border-aqua/20 bg-aqua/[0.04]",
    amber: "border-amber/20 bg-amber/[0.04]",
    coral: "border-coral/20 bg-coral/[0.04]",
  };

  const iconStyles = {
    default: "bg-white/[0.06] text-white/40",
    mint: "bg-mint/10 text-mint",
    aqua: "bg-aqua/10 text-aqua",
    amber: "bg-amber/10 text-amber",
    coral: "bg-coral/10 text-coral",
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border p-5 transition-all hover:shadow-lg hover:shadow-black/20",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/40">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
          {(trend || trendLabel) && (
            <div className="flex items-center gap-1.5">
              {trend === "up" && (
                <span className="inline-flex items-center rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-semibold text-mint">
                  +{trendLabel ?? "↑"}
                </span>
              )}
              {trend === "down" && (
                <span className="inline-flex items-center rounded-full bg-coral/15 px-2 py-0.5 text-[10px] font-semibold text-coral">
                  {trendLabel ?? "↓"}
                </span>
              )}
              {trend === "neutral" && trendLabel && (
                <span className="inline-flex items-center rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/50">
                  {trendLabel}
                </span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg transition-transform group-hover:scale-110",
              iconStyles[variant]
            )}
          >
            {icon}
          </div>
        )}
      </div>
      {/* Subtle gradient accent */}
      <div
        className={cn(
          "pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-100",
          variant === "mint" && "bg-mint/20",
          variant === "aqua" && "bg-aqua/20",
          variant === "amber" && "bg-amber/20",
          variant === "coral" && "bg-coral/20",
          variant === "default" && "bg-white/10"
        )}
      />
    </div>
  );
}
