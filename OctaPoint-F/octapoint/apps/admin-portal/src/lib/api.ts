const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:4000";
// Reference-build simplification: a static operator token from env, instead
// of a full SSO/session flow, authorizes calls to the /admin/* routes.
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? "";

async function authedJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export const adminApi = {
  tenants: () => authedJson<{ merchants: any[] }>("/admin/tenants"),
  setStatus: (id: string, status: "PENDING" | "ACTIVE" | "SUSPENDED") =>
    authedJson<{ merchant: any }>(`/admin/tenants/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  analyticsOverview: () => authedJson<any>("/admin/analytics/overview"),
  infraStatus: () => authedJson<any>("/admin/infra/status"),
};
