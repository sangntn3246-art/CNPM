"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const nav = [
  { href: "/", label: "Overview", icon: "overview" },
  { href: "/campaigns", label: "Campaigns", icon: "campaign" },
  { href: "/api-keys", label: "API Keys", icon: "key" },
  { href: "/history", label: "Transactions", icon: "history" },
] as const;

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-canvas text-ink lg:flex">
      <aside className="border-b border-line bg-white/95 lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-5 py-5 lg:px-6 lg:py-7">
            <Link href="/" className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-white shadow-soft">
                <span className="text-sm font-semibold tracking-tight">OP</span>
              </div>
              <div>
                <div className="text-[15px] font-semibold tracking-tight text-ink">OctaPoint</div>
                <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Merchant Console</div>
              </div>
            </Link>
            <div className="status-pill lg:hidden"><span className="status-dot status-dot-ok" />Live</div>
          </div>

          <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-4 lg:block lg:space-y-1 lg:overflow-visible lg:px-4 lg:pb-0">
            {nav.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${active ? "nav-item-active" : ""}`}
                >
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto hidden px-4 pb-5 lg:block">
            <div className="rounded-2xl border border-line bg-subtle p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">Demo workspace</span>
                <span className="status-dot status-dot-ok" />
              </div>
              <div className="truncate text-xs text-muted">Demo Mall Co.</div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
                <span className="rounded-md border border-line bg-white px-2 py-1 font-mono">TESTNET</span>
                <span>Off-chain fast path</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:ml-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}

function NavIcon({ name }: { name: (typeof nav)[number]["icon"] }) {
  const common = "h-[18px] w-[18px] shrink-0";
  if (name === "overview") {
    return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 13h6V4H4v9Zm10 7h6v-9h-6v9ZM4 20h6v-3H4v3Zm10-13h6V4h-6v3Z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  }
  if (name === "campaign") {
    return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 13V7l14-3v12L4 13Z" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 14.5 8.5 20h3L10 14" strokeLinecap="round"/></svg>;
  }
  if (name === "key") {
    return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="8" cy="12" r="4"/><path d="M12 12h8m-3 0v3m-3-3v2" strokeLinecap="round"/></svg>;
  }
  return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round"/><circle cx="18" cy="18" r="2"/></svg>;
}
