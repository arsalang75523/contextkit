"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  KeyRound,
  BarChart3,
  Webhook,
  CreditCard,
  Wallet,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
  { href: "/dashboard/keys", label: "API Keys", icon: <KeyRound className="h-4 w-4" /> },
  { href: "/dashboard/usage", label: "Usage", icon: <Activity className="h-4 w-4" /> },
  { href: "/dashboard/webhooks", label: "Webhooks", icon: <Webhook className="h-4 w-4" /> },
  { href: "/dashboard/payments", label: "Payments", icon: <CreditCard className="h-4 w-4" /> },
  { href: "/dashboard/credits", label: "Credits", icon: <Wallet className="h-4 w-4" /> },
];

export function DashboardShell({
  children,
  onLogout,
  account,
}: {
  children: React.ReactNode;
  onLogout: () => void;
  account: Record<string, unknown> | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-ink/95 backdrop-blur-xl transition-transform md:sticky md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-line px-5">
          <span className="grid h-8 w-8 place-items-center rounded-md border border-mint/30 bg-mint/10 shadow-glow">
            <Zap className="h-4 w-4 text-mint" />
          </span>
          <div>
            <span className="text-sm font-semibold tracking-wide text-white">ContextKit</span>
            <span className="ml-2 inline-flex items-center rounded-full border border-mint/20 bg-mint/10 px-2 py-0.5 text-[10px] font-medium text-mint">
              BETA
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto grid h-8 w-8 place-items-center rounded-md text-white/50 hover:text-white md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
            Dashboard
          </p>
          <div className="grid gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive(item.href)
                    ? "bg-mint/10 text-mint shadow-[inset_0_0_20px_rgba(115,243,195,0.05)]"
                    : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md transition",
                    isActive(item.href)
                      ? "bg-mint/15 text-mint"
                      : "bg-white/[0.04] text-white/40 group-hover:text-white/60"
                  )}
                >
                  {item.icon}
                </span>
                {item.label}
                {item.badge && (
                  <span className="ml-auto rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-semibold text-mint">
                    {item.badge}
                  </span>
                )}
                {isActive(item.href) && (
                  <ChevronRight className="ml-auto h-3.5 w-3.5 text-mint/50" />
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* Account footer */}
        <div className="border-t border-line p-4">
          <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mint/10 text-xs font-semibold text-mint">
              {account?.email ? String(account.email).charAt(0).toUpperCase() : "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white/80">
                {account?.email ? String(account.email) : "Not signed in"}
              </p>
              <p className="text-[10px] text-white/35">Developer account</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="grid h-7 w-7 place-items-center rounded-md text-white/30 transition hover:bg-coral/10 hover:text-coral"
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-ink/80 px-4 backdrop-blur-xl md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid h-8 w-8 place-items-center rounded-md text-white/60 hover:text-white"
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-white">ContextKit</span>
        </div>
        {children}
      </main>
    </div>
  );
}
