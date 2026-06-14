import { cn } from "@/lib/cn";

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral" | "mint" | "aqua";

const variantStyles: Record<BadgeVariant, string> = {
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  warning: "border-amber/20 bg-amber/10 text-amber",
  error: "border-coral/20 bg-coral/10 text-coral",
  info: "border-aqua/20 bg-aqua/10 text-aqua",
  neutral: "border-white/10 bg-white/[0.05] text-white/50",
  mint: "border-mint/20 bg-mint/10 text-mint",
  aqua: "border-aqua/20 bg-aqua/10 text-aqua",
};

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-5",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
