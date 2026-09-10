"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Campaign { id: string; name: string; multiplierBps: number; startsAt: string; endsAt: string; isActive: boolean; }

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState({ name: "", multiplier: "2.0", startsAt: "", endsAt: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = () => api.campaigns().then((r) => setCampaigns(r.campaigns)).catch((e) => setError(String(e?.message ?? e)));
  useEffect(() => { refresh(); }, []);

  async function handleCreate() {
    if (!form.name || !form.startsAt || !form.endsAt) { setError("Complete the campaign name, start time, and end time."); return; }
    setSaving(true); setError(null);
    try {
      await api.createCampaign({
        name: form.name,
        multiplierBps: Math.round(parseFloat(form.multiplier || "1") * 10000),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      });
      setForm({ name: "", multiplier: "2.0", startsAt: "", endsAt: "" });
      await refresh();
    } catch (e: any) { setError(String(e?.message ?? e)); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-7">
      <header>
        <div className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-brand">Growth automation</div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Campaigns</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">Create time-bound point multipliers that can be launched by your ops team or AI agent.</p>
      </header>

      {error && <div className="card border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">{error}</div>}

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <section className="card h-fit p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-brand"><SparkIcon /></div>
            <div><h2 className="text-sm font-semibold">Launch campaign</h2><p className="mt-0.5 text-xs text-muted">Configure a new loyalty multiplier.</p></div>
          </div>
          <div className="mt-6 space-y-4">
            <Field label="Campaign name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Weekend 2x points" /></Field>
            <Field label="Multiplier"><div className="relative"><input className="input pr-10" inputMode="decimal" value={form.multiplier} onChange={(e) => setForm({ ...form, multiplier: e.target.value })} placeholder="2.0" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">×</span></div></Field>
            <Field label="Starts"><input type="datetime-local" className="input" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></Field>
            <Field label="Ends"><input type="datetime-local" className="input" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></Field>
            <button onClick={handleCreate} disabled={saving} className="btn-primary w-full">{saving ? "Launching…" : "Launch campaign"}</button>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-muted">10000 bps = 1.0×. Campaign windows are stored in UTC and validated by the gateway.</p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1"><div><h2 className="text-sm font-semibold">All campaigns</h2><p className="mt-0.5 text-xs text-muted">{campaigns.length} configured campaign{campaigns.length === 1 ? "" : "s"}</p></div><span className="badge badge-gray">{campaigns.filter((c) => c.isActive).length} active</span></div>
          {campaigns.length ? campaigns.map((c) => <CampaignCard key={c.id} campaign={c} />) : (
            <div className="card grid min-h-52 place-items-center p-8 text-center"><div><div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-muted"><SparkIcon /></div><div className="mt-3 text-sm font-semibold">No campaigns yet</div><div className="mt-1 text-xs text-muted">Create your first multiplier campaign from the panel.</div></div></div>
          )}
        </section>
      </div>
    </div>
  );
}

function CampaignCard({ campaign: c }: { campaign: Campaign }) {
  const now = Date.now(); const start = new Date(c.startsAt).getTime(); const end = new Date(c.endsAt).getTime();
  const state = c.isActive || (now >= start && now <= end) ? "Active" : now < start ? "Scheduled" : "Expired";
  const badge = state === "Active" ? "badge-green" : state === "Scheduled" ? "badge-blue" : "badge-gray";
  return (
    <div className="card card-hover p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold text-ink">{c.name}</h3><span className={`badge ${badge}`}>{state}</span></div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted"><span>Starts {formatDate(c.startsAt)}</span><span>Ends {formatDate(c.endsAt)}</span></div>
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:text-right"><div><div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Multiplier</div><div className="mt-1 text-xl font-semibold text-brand">{(c.multiplierBps / 10000).toFixed(1)}×</div></div></div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>; }
function SparkIcon() { return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" strokeLinejoin="round"/><path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" strokeLinejoin="round"/></svg>; }
function formatDate(value: string) { return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
