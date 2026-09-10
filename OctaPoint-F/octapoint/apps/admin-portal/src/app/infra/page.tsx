"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";

interface InfraStatus {
  gatewayUptime: number;
  approxRequestsLast5s: number;
  chainMode: string;
  gasTreasury: { note: string; network: string };
}

export default function InfraPage() {
  const [status, setStatus] = useState<InfraStatus | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => adminApi.infraStatus().then((v) => { setStatus(v); setLastUpdated(new Date()); setError(null); }).catch((e) => setError(String(e?.message ?? e)));
    load(); const id = setInterval(load, 5000); return () => clearInterval(id);
  }, []);

  const onchain = status?.chainMode === "onchain";
  const enokiConfigured = status?.gasTreasury.note ? !/need|requires?|missing|not configured/i.test(status.gasTreasury.note) : false;

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2"><span className="admin-badge admin-badge-blue">OBSERVABILITY</span><span className="text-xs text-mist">Auto-refresh every 5 seconds</span></div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Infrastructure</h1>
          <p className="mt-1.5 text-sm text-mist">Runtime health, blockchain settlement, and sponsorship readiness.</p>
        </div>
        <div className="admin-status self-start sm:self-auto"><span className={`admin-dot ${error ? "admin-dot-bad" : "admin-dot-ok"}`}/>{error ? "Degraded" : "Operational"}</div>
      </header>

      {error && <div className="admin-card border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-300">Infrastructure endpoint error: {error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HealthCard title="API Gateway" state="Healthy" detail="Port 4000" metric={status ? formatUptime(status.gatewayUptime) : "—"} metricLabel="uptime" tone="green" icon="gateway" />
        <HealthCard title="Request activity" state="Live" detail="Sampled window" metric={String(status?.approxRequestsLast5s ?? "—")} metricLabel="last ~5s" tone="blue" icon="pulse" />
        <HealthCard title="Sui settlement" state={onchain ? "On-chain" : "Off-chain"} detail={status?.gasTreasury.network ?? "testnet"} metric={onchain ? "Enabled" : "Demo"} metricLabel="mode" tone={onchain ? "green" : "amber"} icon="chain" />
        <HealthCard title="Enoki sponsor" state={enokiConfigured ? "Configured" : "Not configured"} detail="Sponsored gas" metric={enokiConfigured ? "Ready" : "Optional"} metricLabel="integration" tone={enokiConfigured ? "green" : "neutral"} icon="shield" />
      </div>

      {!onchain && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[.06] p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-300"><InfoIcon/></div>
            <div><div className="text-sm font-semibold text-amber-200">Local demo uses the off-chain fast path</div><p className="mt-1 text-xs leading-relaxed text-amber-100/60">The application, database, cache, SDK, and MCP flow are operational. Sui Testnet settlement remains disabled until real package/object IDs and signer credentials are configured.</p></div>
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <section className="admin-card p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Service topology</h2><p className="mt-1 text-xs text-mist">Runtime path used by the local product demo.</p></div><span className="admin-badge admin-badge-green">Core online</span></div>
          <div className="mt-6 space-y-3">
            <TopologyRow name="Merchant / Admin portals" subtitle="Next.js presentation layer" status="Running" />
            <Connector />
            <TopologyRow name="API Gateway" subtitle="Hono · HMAC · rate limiting" status="Healthy" />
            <Connector />
            <div className="grid gap-3 sm:grid-cols-2"><TopologyRow name="PostgreSQL" subtitle="Transactional source of truth" status="Healthy" compact /><TopologyRow name="Redis" subtitle="Cache + replay protection" status="Healthy" compact /></div>
            <Connector />
            <TopologyRow name="MCP Server" subtitle="AI-ready Streamable HTTP tools" status="Running" />
          </div>
        </section>

        <section className="admin-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-white">Settlement & sponsorship</h2>
          <p className="mt-1 text-xs text-mist">Configuration exposed by the gateway.</p>
          <div className="mt-6 divide-y divide-wire">
            <ConfigRow label="Settlement mode" value={status?.chainMode ?? "—"} badge={onchain ? "green" : "amber"} />
            <ConfigRow label="Sui network" value={status?.gasTreasury.network ?? "—"} />
            <ConfigRow label="Enoki" value={enokiConfigured ? "configured" : "credential required"} badge={enokiConfigured ? "green" : "gray"} />
          </div>
          <div className="mt-5 rounded-xl border border-wire bg-[#0c131d] p-4"><div className="text-[10px] font-semibold uppercase tracking-wider text-mist">Gateway note</div><p className="mt-2 text-xs leading-relaxed text-slate-300">{status?.gasTreasury.note ?? "Loading infrastructure metadata…"}</p></div>
          <div className="mt-4 text-[10px] text-mist">Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}</div>
        </section>
      </div>
    </div>
  );
}

function HealthCard({ title, state, detail, metric, metricLabel, tone, icon }: { title: string; state: string; detail: string; metric: string; metricLabel: string; tone: "green" | "blue" | "amber" | "neutral"; icon: string }) {
  const iconCls = tone === "green" ? "bg-emerald-500/10 text-emerald-400" : tone === "blue" ? "bg-blue-500/10 text-blue-300" : tone === "amber" ? "bg-amber-500/10 text-amber-300" : "bg-slate-500/10 text-slate-300";
  const badgeCls = tone === "green" ? "admin-badge-green" : tone === "blue" ? "admin-badge-blue" : tone === "amber" ? "admin-badge-amber" : "admin-badge-gray";
  return <div className="admin-card admin-card-hover p-5"><div className="flex items-start justify-between"><div className={`grid h-9 w-9 place-items-center rounded-xl ${iconCls}`}><ServiceIcon name={icon}/></div><span className={`admin-badge ${badgeCls}`}>{state}</span></div><div className="mt-4 text-sm font-semibold text-white">{title}</div><div className="mt-1 text-[11px] text-mist">{detail}</div><div className="mt-5 flex items-end justify-between border-t border-wire pt-4"><span className="text-lg font-semibold tabular text-white">{metric}</span><span className="text-[10px] uppercase tracking-wider text-mist">{metricLabel}</span></div></div>;
}
function TopologyRow({ name, subtitle, status, compact }: { name: string; subtitle: string; status: string; compact?: boolean }) { return <div className={`rounded-xl border border-wire bg-[#0d141e] ${compact ? "p-3.5" : "p-4"}`}><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-xs font-semibold text-slate-200">{name}</div><div className="mt-1 truncate text-[10px] text-mist">{subtitle}</div></div><span className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold text-emerald-400"><span className="admin-dot admin-dot-ok"/>{status}</span></div></div>; }
function Connector() { return <div className="ml-5 h-3 border-l border-dashed border-slate-700"/>; }
function ConfigRow({ label, value, badge }: { label: string; value: string; badge?: "green" | "amber" | "gray" }) { const cls = badge === "green" ? "admin-badge-green" : badge === "amber" ? "admin-badge-amber" : "admin-badge-gray"; return <div className="flex items-center justify-between gap-4 py-4 first:pt-0"><span className="text-xs text-mist">{label}</span>{badge ? <span className={`admin-badge ${cls}`}>{value}</span> : <span className="font-mono text-xs text-slate-200">{value}</span>}</div>; }
function ServiceIcon({ name }: { name: string }) { if (name === "gateway") return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="5" width="16" height="14" rx="3"/><path d="M8 10h8M8 14h5" strokeLinecap="round"/></svg>; if (name === "pulse") return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 12h4l2-5 4 10 2-5h6" strokeLinecap="round" strokeLinejoin="round"/></svg>; if (name === "chain") return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m9.5 14.5-2 2a3.5 3.5 0 1 1-5-5l3-3a3.5 3.5 0 0 1 5 0M14.5 9.5l2-2a3.5 3.5 0 1 1 5 5l-3 3a3.5 3.5 0 0 1-5 0M8.5 15.5l7-7" strokeLinecap="round"/></svg>; return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3 5 6v5c0 4.7 2.8 8 7 10 4.2-2 7-5.3 7-10V6l-7-3Z" strokeLinejoin="round"/></svg>; }
function InfoIcon() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01" strokeLinecap="round"/></svg>; }
function formatUptime(seconds: number) { const s = Math.max(0, Math.floor(seconds)); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); if (h) return `${h}h ${m}m`; if (m) return `${m}m ${s % 60}s`; return `${s}s`; }
