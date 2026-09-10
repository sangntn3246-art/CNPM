"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

interface Tx { id: string; externalUserId: string; type: string; amount: string; balanceAfter: string; reason: string | null; createdAt: string; }

type TypeFilter = "ALL" | "ISSUE" | "REDEEM" | "TRANSFER";

export default function HistoryPage() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TypeFilter>("ALL");
  const [error, setError] = useState<string | null>(null);

  const refresh = (userId?: string) => api.transactions(userId).then((r) => { setTxs(r.transactions); setError(null); }).catch((e) => setError(String(e?.message ?? e)));
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => type === "ALL" ? txs : txs.filter((tx) => tx.type === type), [txs, type]);
  const issued = txs.filter((t) => t.type === "ISSUE").reduce((s, t) => s + Number(t.amount), 0);
  const redeemed = txs.filter((t) => t.type === "REDEEM").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="space-y-7">
      <header>
        <div className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-brand">Audit trail</div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Transactions</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">Trace every issue, redeem, and transfer event with balance-after state and audit metadata.</p>
      </header>

      {error && <div className="card border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Events" value={txs.length} />
        <MiniStat label="Issued volume" value={formatCredits(issued)} tone="positive" />
        <MiniStat label="Redeemed volume" value={formatCredits(redeemed)} tone="warning" />
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-1 gap-2">
            <div className="relative max-w-sm flex-1"><SearchIcon /><input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && refresh(search || undefined)} placeholder="Search user ID" className="input !pl-9" /></div>
            <button onClick={() => refresh(search || undefined)} className="btn-secondary">Search</button>
          </div>
          <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
            {(["ALL", "ISSUE", "REDEEM", "TRANSFER"] as TypeFilter[]).map((v) => <button key={v} onClick={() => setType(v)} className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${type === v ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}>{v === "ALL" ? "All" : v[0] + v.slice(1).toLowerCase()}</button>)}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[920px]">
            <thead><tr><th>User</th><th>Type</th><th>Amount</th><th>Balance after</th><th>Reason</th><th>Date & time</th><th>Transaction ID</th></tr></thead>
            <tbody>
              {filtered.map((tx) => (
                <tr key={tx.id}>
                  <td className="font-mono text-[11px] font-medium text-slate-700">{tx.externalUserId}</td>
                  <td><span className={`badge ${tx.type === "ISSUE" ? "badge-blue" : tx.type === "REDEEM" ? "badge-amber" : "badge-gray"}`}>{tx.type}</span></td>
                  <td className={`font-mono font-medium tabular ${tx.type === "ISSUE" ? "text-positive" : tx.type === "REDEEM" ? "text-warning" : "text-ink"}`}>{tx.type === "ISSUE" ? "+" : tx.type === "REDEEM" ? "−" : ""}{formatCredits(Number(tx.amount))}</td>
                  <td className="font-mono tabular text-slate-600">{formatCredits(Number(tx.balanceAfter))}</td>
                  <td className="max-w-52 truncate text-muted" title={tx.reason ?? ""}>{tx.reason ?? "—"}</td>
                  <td className="text-muted">{formatDate(tx.createdAt)}</td>
                  <td><code className="text-[10px] text-slate-400">{shortId(tx.id)}</code></td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={7} className="py-12 text-center text-muted">No transactions match this view.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string | number; tone?: "positive" | "warning" }) { const cls = tone === "positive" ? "text-positive" : tone === "warning" ? "text-warning" : "text-ink"; return <div className="card px-5 py-4"><div className="text-xs font-medium text-muted">{label}</div><div className={`mt-2 text-xl font-semibold tabular ${cls}`}>{value}</div></div>; }
function SearchIcon() { return <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4" strokeLinecap="round"/></svg>; }
function formatCredits(v: number) { return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v); }
function formatDate(v: string) { return new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
function shortId(v: string) { return v.length > 14 ? `${v.slice(0, 8)}…${v.slice(-4)}` : v; }
