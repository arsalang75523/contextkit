"use client";

import { cn } from "@/lib/cn";

export function ListCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-line bg-white/[0.03] transition-all",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ListCardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-white/40">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ListCardEmpty({ message }: { message: string }) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-sm text-white/35">{message}</p>
    </div>
  );
}

export function ListItem({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 border-b border-line/50 px-5 py-3.5 transition last:border-b-0 hover:bg-white/[0.02]",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
