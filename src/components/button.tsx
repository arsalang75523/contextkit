import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = ComponentProps<typeof Link> & {
  variant?: "primary" | "secondary";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <Link
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium transition",
        variant === "primary"
          ? "bg-mint text-ink hover:bg-aqua"
          : "border border-line bg-white/[0.03] text-white hover:border-mint/50",
        className
      )}
      {...props}
    />
  );
}
