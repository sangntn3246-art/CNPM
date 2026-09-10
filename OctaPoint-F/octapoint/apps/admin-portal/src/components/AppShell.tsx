"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const nav = [
  { href: "/", label: "Tenants", icon: "tenants" },
  { href: "/infra", label: "Infrastructure", icon: "infra" },
] as const;

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-void text-white lg:flex">
      <aside className="border-b border-wire bg-[#0C111B]/95 lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-5 py-5 lg:px-6 lg:py-7">
            <Link href="/" className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-semibold shadow-glow">OP</div>
              <div>
                <div className="text-[15px] font-semibold tracking-tight text-white">OctaPoint</div>
                <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-mist">Operator Console</div>
              </div>
            </Link>
            <span className="admin-status lg:hidden"><span className="admin-dot admin-dot-ok"/>Live</span>
          </div>

          <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-4 lg:block lg:space-y-1 lg:overflow-visible lg:px-4 lg:pb-0">
            {nav.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return <Link key={item.href} href={item.href} className={`admin-nav ${active ? "admin-nav-active" : ""}`}><AdminIcon name={item.icon}/><span>{item.label}</span></Link>;
            })}
          </nav>

          <div className="mt-auto hidden px-4 pb-5 lg:block">
            <div className="rounded-2xl border border-wire bg-steel/70 p-4">
              <div className="flex items-center justify-between"><span className="text-xs font-semibold text-white">Platform status</span><span className="admin-dot admin-dot-ok"/></div>
              <p className="mt-2 text-xs leading-relaxed text-mist">Local demo stack is online. Operator routes are protected by the configured bearer token.</p>
              <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-mist"><span className="rounded-md border border-wire px-2 py-1">Testnet</span><span>Off-chain</span></div>
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

function AdminIcon({ name }: { name: (typeof nav)[number]["icon"] }) {
  if (name === "tenants") return <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20V8l8-4 8 4v12" strokeLinejoin="round"/><path d="M8 12h2m4 0h2M8 16h2m4 0h2" strokeLinecap="round"/></svg>;
  return <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="16" height="6" rx="2"/><rect x="4" y="14" width="16" height="6" rx="2"/><path d="M8 7h.01M8 17h.01M12 7h5M12 17h5" strokeLinecap="round"/></svg>;
}
