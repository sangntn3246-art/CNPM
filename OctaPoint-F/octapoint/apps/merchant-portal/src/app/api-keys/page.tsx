"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface ApiKey { id: string; keyId: string; label: string; isActive: boolean; createdAt: string; lastUsedAt: string | null; }

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [label, setLabel] = useState("");
  const [justCreated, setJustCreated] = useState<{ keyId: string; secret: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => api.apiKeys().then((r) => setKeys(r.apiKeys)).catch((e) => setError(String(e?.message ?? e)));
  useEffect(() => { refresh(); }, []);

  async function handleCreate() {
    try { const created = await api.createApiKey(label || "Development key"); setJustCreated(created); setLabel(""); setError(null); await refresh(); }
    catch (e: any) { setError(String(e?.message ?? e)); }
  }
  async function handleRevoke(keyId: string) { try { await api.revokeApiKey(keyId); await refresh(); } catch (e: any) { setError(String(e?.message ?? e)); } }
  async function copy(value: string, name: string) { await navigator.clipboard.writeText(value); setCopied(name); setTimeout(() => setCopied(null), 1200); }

  return (
    <div className="space-y-7">
      <header>
        <div className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-brand">Developer access</div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">API keys</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">Manage credentials used by your SDK integrations and MCP agents. Requests are signed with HMAC-SHA256.</p>
      </header>

      {error && <div className="card border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">{error}</div>}

      {justCreated && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-warning"><ShieldIcon /></div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900">Save this secret now</div>
              <p className="mt-1 text-xs text-slate-600">For security, the secret is displayed only once. Store it in a secure environment variable.</p>
              <SecretRow label="Key ID" value={justCreated.keyId} onCopy={() => copy(justCreated.keyId, "id")} copied={copied === "id"} />
              <SecretRow label="Secret" value={justCreated.secret} onCopy={() => copy(justCreated.secret, "secret")} copied={copied === "secret"} />
            </div>
          </div>
        </div>
      )}

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <label className="flex-1"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Key label</span><input value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate()} placeholder='e.g. "POS production"' className="input" /></label>
          <button onClick={handleCreate} className="btn-primary md:mb-0"><PlusIcon /> Generate key</button>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6"><div><h2 className="text-sm font-semibold">Credentials</h2><p className="mt-1 text-xs text-muted">{keys.filter((k) => k.isActive).length} active key{keys.filter((k) => k.isActive).length === 1 ? "" : "s"}</p></div><span className="badge badge-green"><span className="mr-1.5 status-dot status-dot-ok" />HMAC enabled</span></div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[760px]">
            <thead><tr><th>Label</th><th>Key ID</th><th>Status</th><th>Created</th><th>Last used</th><th></th></tr></thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td className="font-medium text-ink">{k.label}</td>
                  <td><button onClick={() => copy(k.keyId, k.keyId)} className="rounded-md bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-600 hover:bg-slate-100">{maskKey(k.keyId)} {copied === k.keyId ? "✓" : ""}</button></td>
                  <td><span className={`badge ${k.isActive ? "badge-green" : "badge-gray"}`}>{k.isActive ? "Active" : "Revoked"}</span></td>
                  <td className="text-muted">{formatDate(k.createdAt)}</td>
                  <td className="text-muted">{k.lastUsedAt ? formatDate(k.lastUsedAt) : "Never"}</td>
                  <td className="text-right">{k.isActive && <button onClick={() => handleRevoke(k.keyId)} className="text-xs font-semibold text-danger hover:underline">Revoke</button>}</td>
                </tr>
              ))}
              {!keys.length && <tr><td colSpan={6} className="py-10 text-center text-muted">No API keys created yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SecretRow({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) { return <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-white/70 p-2.5"><div className="min-w-16 text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</div><code className="min-w-0 flex-1 break-all text-xs text-slate-700">{value}</code><button onClick={onCopy} className="btn-secondary !px-2.5 !py-1.5 text-xs">{copied ? "Copied" : "Copy"}</button></div>; }
function maskKey(v: string) { return v.length <= 12 ? v : `${v.slice(0, 8)}••••${v.slice(-4)}`; }
function formatDate(v: string) { return new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
function PlusIcon() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>; }
function ShieldIcon() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3 5 6v5c0 4.7 2.8 8 7 10 4.2-2 7-5.3 7-10V6l-7-3Z" strokeLinejoin="round"/><path d="m9.5 12 1.7 1.7 3.5-4" strokeLinecap="round"/></svg>; }
