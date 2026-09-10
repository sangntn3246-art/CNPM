const baseUrl = process.env.OCTAPOINT_BASE_URL ?? "http://localhost:4000";
const token = process.env.DEMO_BOOTSTRAP_TOKEN ?? "dev-demo-bootstrap";

async function waitForGateway() {
  for (let attempt = 1; attempt <= 60; attempt++) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`API Gateway did not become ready at ${baseUrl}`);
}

await waitForGateway();
const res = await fetch(`${baseUrl}/demo/bootstrap`, {
  method: "POST",
  headers: { "x-demo-token": token },
});
if (!res.ok) throw new Error(`Demo bootstrap failed: ${res.status} ${await res.text()}`);
const body = await res.json();
console.log("[demo-seed] OctaPoint demo is ready:", body);
