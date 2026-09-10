"use client";

import { useEffect, useMemo, useState } from "react";
import { adminApi } from "@/lib/api";

interface Merchant {
  id: string;
  name: string;
  slug: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  earnRateBps: number;
  redeemRateBps: number;
  createdAt: string;
  _count: { accounts: number; apiKeys: number };
}

interface Overview {
  merchantCount: number;
  activeMerchants: number;
  accountCount: number;
  transactionsByType: { type: string; count: number; totalAmount: string }[];
}

export default function TenantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const [tenants, analytics] = await Promise.all([adminApi.tenants(), adminApi.analyticsOverview()]);
      setMerchants(tenants.merchants);
      setOverview(analytics);
      setError(null);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(); }, []);

  async function setStatus(id: string, status: Merchant["status"]) {
    try { await adminApi.setStatus(id, status); await refresh(); }
    catch (e: any) { setError(String(e?.message ?? e)); }
  }

  const issue = Number(overview?.transactionsByType.find((t) => t.type === "ISSUE")?.totalAmount ?? 0);
  const redeem = Number(overview?.transactionsByType.find((t) => t.type === "REDEEM")?.totalAmount ?? 0);
  const txCount = useMemo(() => overview?.transactionsByType.reduce((s, t) => s + t.count, 0) ?? 0, [overview]);

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2"><span className="admin-badge admin-badge-blue">PLATFORM ADMIN</span><span className="text-xs text-mist">Multi-tenant control plane</span></div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Tenants</h1>
          <p className="mt-1.5 text-sm text-mist">Monitor merchant workspaces, account growth, and platform access.</p>
        </div>
        <button onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 self-start rounded-xl border border-wire bg-steel px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-[#151e2c] sm:self-auto">
          <RefreshIcon /> {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="admin-card border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          {error.includes("401") ? "Unauthorized — verify NEXT_PUBLIC_ADMIN_TOKEN matches ADMIN_TOKEN." : error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total merchants" value={overview?.merchantCount ?? "—"} detail="Onboarded workspaces" icon="building" />
        <Metric label="Active merchants" value={overview?.activeMerchants ?? "—"} detail="Currently enabled" icon="active" tone="green" />
        <Metric label="Loyalty accounts" value={overview?.accountCount ?? "—"} detail="Across all tenants" icon="users" tone="blue" />
        <Metric label="Credit activity" value={formatCredits(issue + redeem)} detail={`${txCount} recorded events`} icon="activity" tone="amber" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <section className="admin-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-wire px-5 py-4 sm:px-6">
            <div><h2 className="text-sm font-semibold text-white">Merchant directory</h2><p className="mt-1 text-xs text-mist">Tenant status and credential footprint</p></div>
            <span className="admin-badge admin-badge-gray">{merchants.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[850px]">
              <thead><tr><th>Merchant</th><th>Status</th><th>Accounts</th><th>API keys</th><th>Earn / Redeem</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {merchants.map((m) => (
                  <tr key={m.id}>
                    <td><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl border border-wire bg-[#151e2b] text-xs font-semibold text-slate-300">{initials(m.name)}</div><div><div className="font-medium text-white">{m.name}</div><div className="mt-0.5 font-mono text-[10px] text-mist">{m.slug}</div></div></div></td>
                    <td><StatusBadge status={m.status} /></td>
                    <td className="font-mono tabular text-slate-300">{m._count.accounts}</td>
                    <td className="font-mono tabular text-slate-300">{m._count.apiKeys}</td>
                    <td className="font-mono text-xs tabular text-mist">{m.earnRateBps} / {m.redeemRateBps} bps</td>
                    <td className="text-mist">{formatDate(m.createdAt)}</td>
                    <td className="text-right"><div className="flex justify-end gap-3">{m.status !== "ACTIVE" && <button onClick={() => setStatus(m.id, "ACTIVE")} className="text-xs font-semibold text-emerald-400 hover:underline">Activate</button>}{m.status !== "SUSPENDED" && <button onClick={() => setStatus(m.id, "SUSPENDED")} className="text-xs font-semibold text-red-400 hover:underline">Suspend</button>}</div></td>
                  </tr>
                ))}
                {!merchants.length && !error && <tr><td colSpan={7} className="py-12 text-center text-mist">No merchants onboarded yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="admin-card p-5">
          <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-white">Platform summary</h2><span className="admin-dot admin-dot-ok"/></div>
          <p className="mt-1 text-xs text-mist">Current aggregate credit state.</p>
          <div className="mt-6 space-y-5">
            <SummaryRow label="Credits issued" value={formatCredits(issue)} valueClass="text-emerald-400" />
            <SummaryRow label="Credits redeemed" value={formatCredits(redeem)} valueClass="text-amber-400" />
            <SummaryRow label="Outstanding" value={formatCredits(issue - redeem)} valueClass="text-blue-300" />
          </div>
          <div className="mt-6 border-t border-wire pt-5">
            <div className="flex items-center justify-between text-xs"><span className="text-mist">Gateway</span><span className="flex items-center gap-2 font-semibold text-emerald-400"><span className="admin-dot admin-dot-ok"/>Healthy</span></div>
            <div className="mt-3 flex items-center justify-between text-xs"><span className="text-mist">Settlement</span><span className="admin-badge admin-badge-amber">Off-chain</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value, detail, icon, tone = "neutral" }: { label: string; value: string | number; detail: string; icon: string; tone?: "neutral" | "green" | "blue" | "amber" }) {
  const cls = tone === "green" ? "bg-emerald-500/10 text-emerald-400" : tone === "blue" ? "bg-blue-500/10 text-blue-300" : tone === "amber" ? "bg-amber-500/10 text-amber-300" : "bg-slate-500/10 text-slate-300";
  return <div className="admin-card admin-card-hover p-5"><div className="flex items-start justify-between"><div className="text-xs font-medium text-mist">{label}</div><div className={`grid h-9 w-9 place-items-center rounded-xl ${cls}`}><MetricIcon name={icon}/></div></div><div className="mt-4 text-2xl font-semibold tabular text-white">{value}</div><div className="mt-1 text-[11px] text-mist">{detail}</div></div>;
}
function SummaryRow({ label, value, valueClass }: { label: string; value: string; valueClass: string }) { return <div><div className="text-xs text-mist">{label}</div><div className={`mt-1 text-xl font-semibold tabular ${valueClass}`}>{value}</div></div>; }
function StatusBadge({ status }: { status: Merchant["status"] }) { const cls = status === "ACTIVE" ? "admin-badge-green" : status === "SUSPENDED" ? "admin-badge-red" : "admin-badge-amber"; return <span className={`admin-badge ${cls}`}><span className={`mr-1.5 admin-dot ${status === "ACTIVE" ? "admin-dot-ok" : status === "SUSPENDED" ? "admin-dot-bad" : "admin-dot-warn"}`}/>{status[0] + status.slice(1).toLowerCase()}</span>; }
function MetricIcon({ name }: { name: string }) { if (name === "building") return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 20V7l7-3 7 3v13M9 10h1m4 0h1M9 14h1m4 0h1" strokeLinecap="round" strokeLinejoin="round"/></svg>; if (name === "users") return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3.3 2.4-5 5.5-5s4.9 1.7 5.5 5M15 6.5c2.3.2 3.5 1.4 3.5 3.2M16 14.5c2.3.5 3.7 2 4 4.5" strokeLinecap="round"/></svg>; if (name === "activity") return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 12h3l2-5 4 10 2-5h5" strokeLinecap="round" strokeLinejoin="round"/></svg>; return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.2 2.2 4.8-5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function RefreshIcon() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 7v5h-5M4 17v-5h5" strokeLinecap="round"/><path d="M18 10A7 7 0 0 0 6 8l-2 2m2 4a7 7 0 0 0 12 2l2-2" strokeLinecap="round"/></svg>; }
function formatCredits(v: number) { return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v); }
function formatDate(v: string) { return new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function initials(v: string) { return v.split(/\s+/).slice(0,2).map((x) => x[0]?.toUpperCase() ?? "").join(""); }
