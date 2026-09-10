"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

interface Analytics {
  accountCount: number;
  transactionsByType: { type: string; count: number; totalAmount: string }[];
  recentTransactions: { id: string; type: string; amount: string; createdAt: string }[];
}

interface MerchantInfo { name?: string; status?: string; }

export default function OverviewPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [analytics, merchantRes] = await Promise.all([api.analytics(), api.merchant()]);
      setData(analytics);
      setMerchant(merchantRes.merchant);
      setError(null);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const issued = Number(data?.transactionsByType.find((t) => t.type === "ISSUE")?.totalAmount ?? 0);
  const redeemed = Number(data?.transactionsByType.find((t) => t.type === "REDEEM")?.totalAmount ?? 0);
  const outstanding = issued - redeemed;
  const transactionCount = data?.transactionsByType.reduce((sum, t) => sum + t.count, 0) ?? 0;
  const volumeTotal = Math.max(issued + redeemed, 1);
  const issuePct = Math.round((issued / volumeTotal) * 100);
  const redeemPct = 100 - issuePct;

  const recent = useMemo(() => data?.recentTransactions ?? [], [data]);

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="badge badge-blue">LIVE DEMO</span>
            <span className="text-xs text-muted">Sui Testnet · off-chain mode</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Overview</h1>
          <p className="mt-1.5 text-sm text-muted">
            Loyalty performance for <span className="font-medium text-ink">{merchant?.name ?? "your workspace"}</span>.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary self-start sm:self-auto">
          <RefreshIcon /> {loading ? "Refreshing…" : "Refresh data"}
        </button>
      </header>

      {error && (
        <div className="card border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
          Gateway unavailable: {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Enrolled members" value={data?.accountCount ?? "—"} detail="Loyalty accounts" icon="users" />
        <MetricCard label="Credits issued" value={loading && !data ? "—" : formatCredits(issued)} detail={`${transactionCount} total transactions`} icon="plus" tone="blue" />
        <MetricCard label="Credits redeemed" value={loading && !data ? "—" : formatCredits(redeemed)} detail="Customer redemptions" icon="redeem" tone="amber" />
        <MetricCard label="Outstanding balance" value={loading && !data ? "—" : formatCredits(outstanding)} detail="Issued minus redeemed" icon="wallet" tone="green" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-sm font-semibold text-ink">Recent activity</h2>
              <p className="mt-1 text-xs text-muted">Latest credit events across your program</p>
            </div>
            <a href="/history" className="text-xs font-semibold text-brand hover:underline">View all</a>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table min-w-[620px]">
              <thead>
                <tr><th>Transaction</th><th>Amount</th><th>Status</th><th>Date & time</th></tr>
              </thead>
              <tbody>
                {recent.length ? recent.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`grid h-8 w-8 place-items-center rounded-lg ${tx.type === "ISSUE" ? "bg-blue-50 text-brand" : "bg-amber-50 text-warning"}`}>
                          {tx.type === "ISSUE" ? "+" : "−"}
                        </div>
                        <div>
                          <div className="font-medium text-ink">{tx.type === "ISSUE" ? "Credits issued" : "Credits redeemed"}</div>
                          <div className="mt-0.5 max-w-[150px] truncate font-mono text-[10px] text-muted">{tx.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`font-mono font-medium tabular ${tx.type === "ISSUE" ? "text-positive" : "text-warning"}`}>
                      {tx.type === "ISSUE" ? "+" : "−"}{formatCredits(Number(tx.amount))}
                    </td>
                    <td><span className="badge badge-green">Completed</span></td>
                    <td className="text-muted">{formatDate(tx.createdAt)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="py-10 text-center text-muted">No transactions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">Credit volume</h2>
              <p className="mt-1 text-xs text-muted">Issue vs. redeem distribution</p>
            </div>
            <span className="badge badge-gray">ALL TIME</span>
          </div>

          <div className="mt-7 space-y-5">
            <VolumeRow label="Issued" value={issued} percentage={issuePct} dotClass="bg-brand" />
            <VolumeRow label="Redeemed" value={redeemed} percentage={redeemPct} dotClass="bg-amber-500" />
          </div>

          <div className="mt-7 overflow-hidden rounded-full bg-slate-100">
            <div className="flex h-2.5 w-full">
              <div className="bg-brand" style={{ width: `${issuePct}%` }} />
              <div className="bg-amber-500" style={{ width: `${redeemPct}%` }} />
            </div>
          </div>

          <div className="mt-7 border-t border-line pt-5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Workspace status</span>
              <span className="flex items-center gap-2 font-semibold text-positive"><span className="status-dot status-dot-ok" /> Operational</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted">Merchant status</span>
              <span className="font-semibold text-ink">{merchant?.status?.toLowerCase() ?? "active"}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MetricCard({ label, value, detail, icon, tone = "neutral" }: { label: string; value: string | number; detail: string; icon: string; tone?: "neutral" | "blue" | "amber" | "green" }) {
  const toneClass = tone === "blue" ? "bg-blue-50 text-brand" : tone === "amber" ? "bg-amber-50 text-warning" : tone === "green" ? "bg-emerald-50 text-positive" : "bg-slate-100 text-slate-600";
  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium text-muted">{label}</div>
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${toneClass}`}><MetricIcon name={icon} /></div>
      </div>
      <div className="mt-4 text-2xl font-semibold tracking-tight text-ink tabular">{value}</div>
      <div className="mt-1 text-[11px] text-muted">{detail}</div>
    </div>
  );
}

function VolumeRow({ label, value, percentage, dotClass }: { label: string; value: number; percentage: number; dotClass: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-ink"><span className={`h-2 w-2 rounded-full ${dotClass}`} />{label}</span>
        <span className="font-mono text-xs text-muted">{percentage}%</span>
      </div>
      <div className="mt-1.5 text-xl font-semibold text-ink tabular">{formatCredits(value)}</div>
    </div>
  );
}

function MetricIcon({ name }: { name: string }) {
  if (name === "users") return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3.3 2.4-5 5.5-5s4.9 1.7 5.5 5M15 6.5c2.3.2 3.5 1.4 3.5 3.2 0 1.7-1.1 2.7-2.8 3M16.5 14.5c2.2.5 3.4 2 3.8 4.5" strokeLinecap="round"/></svg>;
  if (name === "plus") return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 8v8m-4-4h8" strokeLinecap="round"/></svg>;
  if (name === "redeem") return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 7h14v10H5z"/><path d="M8 12h8M12 9v6" strokeLinecap="round"/></svg>;
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h14a2 2 0 0 1 2 2v9H6a2 2 0 0 1-2-2V7Z"/><path d="M4 7V6a2 2 0 0 1 2-2h10M15 12h5" strokeLinecap="round"/></svg>;
}

function RefreshIcon() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 7v5h-5M4 17v-5h5" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.2 10A7 7 0 0 0 6 7.8L4 10m2 4a7 7 0 0 0 12 2.2L20 14" strokeLinecap="round"/></svg>; }
function formatCredits(value: number) { return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value); }
function formatDate(value: string) { return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
