// Run after live-mcp.mjs and before live-mcp-operations.mjs (which revokes the test grant).
// Waits 16 minutes from this run. Do not use this authorization in other clients during the wait.
// Never changes the database or prints tokens.
import { readFile, writeFile, lstat } from "node:fs/promises";
import assert from "node:assert/strict";
import { join } from "node:path";
import { homedir } from "node:os";
async function run() {
  const dir = join(homedir(), ".local/state/elo/live-validation");
  const p = join(dir, "client-tokens.json");
  async function protectedCredentials() {
    const st = await lstat(p);
    assert(st.isFile() && !st.isSymbolicLink() && (st.mode & 0o777) === 0o600);
    const value = JSON.parse(await readFile(p, "utf8"));
    assert.equal(value.origin, "https://elo.robsonlins.workers.dev");
    assert.equal(typeof value.client_id, "string");
    assert.equal(typeof value.tokens?.refresh_token, "string");
    return value;
  }
  const snapshot = await protectedCredentials();
  const began = Date.now();
  const until = began + 16 * 60 * 1000;
  console.log(
    JSON.stringify({
      stage: "awaiting_natural_Access_expiry",
      at: new Date().toISOString(),
      resumeAt: new Date(until).toISOString(),
    }),
  );
  await new Promise((r) => setTimeout(r, Math.max(0, until - Date.now())));
  const current = await protectedCredentials();
  assert.equal(current.client_id, snapshot.client_id);
  // Only one writer: a replacement/rotation during the wait invalidates this run.
  assert(current.tokens.refresh_token === snapshot.tokens.refresh_token);
  const r = await fetch(current.origin + "/oauth/token", {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(20000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: current.client_id,
      refresh_token: current.tokens.refresh_token,
      resource: current.origin + "/mcp",
    }),
  });
  const report = {
    at: new Date().toISOString(),
    origin: current.origin,
    elapsed_this_run_seconds: Math.floor((Date.now() - began) / 1000),
    refresh_status: r.status,
    scope:
      "Cliente HTTP proprio apos expirar janela Access de15min; sem alterar relogio ou banco.",
  };
  if (r.status === 200) {
    current.tokens = await r.json();
    await writeFile(p, JSON.stringify(current), { mode: 0o600 });
    const tool = await fetch(current.origin + "/mcp", {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(20000),
      headers: {
        Authorization: `Bearer ${current.tokens.access_token}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "MCP-Protocol-Version": "2025-03-26",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 801,
        method: "tools/call",
        params: { name: "installation_status", arguments: {} },
      }),
    });
    report.mcp_status = tool.status;
    const b = await tool.json();
    assert.equal(tool.status, 200);
    assert(!b.error && b.result && !b.result.isError);
    assert.equal(b.result.content?.[0]?.type, "text");
    const status = JSON.parse(b.result.content[0].text);
    assert.equal(typeof status.version, "string");
    assert.equal(typeof status.commit, "string");
    assert.equal(status.whatsapp, "not_configured");
    report.tool_ok = true;
    report.version = status.version;
    report.commit = status.commit;
  }
  await writeFile(
    join(dir, "upstream-renewal-report.json"),
    JSON.stringify(report, null, 2),
    { mode: 0o600 },
  );
  console.log(JSON.stringify(report));
  assert.equal(r.status, 200);
}
run().catch(() => {
  console.error(
    "Renovação live não comprovada; verificar relatório seguro. Nenhum token foi exibido.",
  );
  process.exitCode = 1;
});
