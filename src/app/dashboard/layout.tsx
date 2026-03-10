"use client";

import { usePathname, useRouter } from "next/navigation";
import ServerStatus from "@/components/ServerStatus";

const NAV_ITEMS = [
  { href: "/dashboard/logs", label: "Live Logs", icon: "▸" },
  { href: "/dashboard/whitelist", label: "Whitelist", icon: "▹" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-bg-card flex flex-col shrink-0">
        {/* Logo area */}
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 bg-accent rounded-sm glow-green" />
            <span className="font-display text-lg font-bold text-text-primary tracking-tight">
              MC Admin
            </span>
          </div>
          <p className="text-xs text-text-muted font-mono mt-1">
            server dashboard v1.0
          </p>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4 flex-1">
          <p className="px-2 text-[10px] text-text-muted font-mono uppercase tracking-widest mb-3">
            Navigation
          </p>
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-sm font-mono transition-all ${
                    active
                      ? "bg-accent/10 text-accent border border-accent/20"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-transparent"
                  }`}
                >
                  <span className={active ? "text-accent" : "text-text-muted"}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Server Status */}
        <div className="px-4 py-4 border-t border-border">
          <ServerStatus />
        </div>

        {/* Logout */}
        <div className="px-4 py-3 border-t border-border">
          <button
            onClick={() => {
              document.cookie =
                "mc_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
              router.push("/login");
            }}
            className="w-full text-xs font-mono text-text-muted hover:text-status-offline transition-colors text-left"
          >
            ⏻ SIGN OUT
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen overflow-hidden">{children}</main>
    </div>
  );
}
