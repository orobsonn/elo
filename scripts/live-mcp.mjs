// OAuth+PKCE smoke through the real Access login. Never prints codes or tokens.
import { createServer } from "node:http";
import { randomBytes, createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
const origin = process.argv[2] ?? "https://elo.robsonlins.workers.dev";
const dir = join(homedir(), ".local/state/elo/live-validation");
await mkdir(dir, { recursive: true, mode: 0o700 });
const verifier = randomBytes(32).toString("base64url"),
  state = randomBytes(32).toString("base64url");
let callbackResolve;
const callback = new Promise((r) => (callbackResolve = r));
const server = createServer((request, response) => {
  const u = new URL(request.url, "http://127.0.0.1");
  if (u.pathname !== "/callback" || u.searchParams.get("state") !== state) {
    response.writeHead(400).end("Retorno inválido.");
    return;
  }
  if (u.searchParams.get("error")) {
    callbackResolve(null);
    response.end("Conexão cancelada.");
    return;
  }
  const code = u.searchParams.get("code");
  response
    .writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
    .end(
      "<h1>Conexão Elo autorizada.</h1><p>Você pode voltar ao Codex. Os testes usam apenas dados sintéticos.</p>",
    );
  callbackResolve(code);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const redirect = `http://127.0.0.1:${server.address().port}/callback`;
const discovery = await (
  await fetch(origin + "/.well-known/oauth-authorization-server")
).json();
const registration = await fetch(discovery.registration_endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    client_name: "Elo validação sintética",
    redirect_uris: [redirect],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  }),
});
assert.equal(registration.status, 201);
const client = await registration.json();
const authorize = new URL(discovery.authorization_endpoint);
for (const [k, v] of Object.entries({
  client_id: client.client_id,
  redirect_uri: redirect,
  response_type: "code",
  scope: "elo offline_access",
  resource: origin + "/mcp",
  state,
  code_challenge: createHash("sha256").update(verifier).digest("base64url"),
  code_challenge_method: "S256",
}))
  authorize.searchParams.set(k, v);
await writeFile(join(dir, "authorize-url.txt"), authorize.toString(), {
  mode: 0o600,
});
console.log(
  JSON.stringify({
    stage: "awaiting_access_login",
    authorizeFile: join(dir, "authorize-url.txt"),
    redirect,
  }),
);
const deadline = setTimeout(
  () => {
    callbackResolve(null);
  },
  25 * 60 * 1000,
);
const code = await callback;
clearTimeout(deadline);
server.close();
if (!code)
  throw new Error("Login não concluído; nenhuma autenticação simulada.");
const tokenResponse = await fetch(discovery.token_endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    client_id: client.client_id,
    redirect_uri: redirect,
    resource: origin + "/mcp",
    code,
    code_verifier: verifier,
  }),
});
assert.equal(tokenResponse.status, 200);
let tokens = await tokenResponse.json();
await writeFile(
  join(dir, "client-tokens.json"),
  JSON.stringify({ origin, client_id: client.client_id, tokens }),
  { mode: 0o600 },
);
let rpcId = 0;
async function rpc(method, params = {}) {
  const r = await fetch(origin + "/mcp", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-03-26",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
  });
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.ok(!body.error);
  return body.result;
}
async function tool(name, args = {}) {
  const r = await rpc("tools/call", { name, arguments: args });
  assert.ok(!r.isError, `Tool ${name} recusou a operação sintética.`);
  return JSON.parse(r.content[0].text);
}
const initialized = await rpc("initialize", {
  protocolVersion: "2025-03-26",
  capabilities: {},
  clientInfo: { name: "elo-synthetic-smoke", version: "1" },
});
assert.equal(initialized.serverInfo.name, "elo");
const tools = await rpc("tools/list");
assert.ok(tools.tools.some((t) => t.name === "memory_get"));
const tag = Date.now().toString(36);
const contact = await tool("contact_create", { alias: "Mario sintético" });
const source = await tool("source_import", {
  contact_id: contact.id,
  source_key: "synthetic-live-" + tag,
  occurred_at: Date.now(),
  text: "Quero aprender italiano no próximo ano.",
  kind: "meeting",
});
await writeFile(
  join(dir, "synthetic-created.json"),
  JSON.stringify({ contact, source }),
  { mode: 0o600 },
);
const listed = await tool("contacts_list", { limit: 1 });
assert.ok(Array.isArray(listed.items));
const status = await tool("installation_status");
assert.equal(status.whatsapp, "not_configured");
assert.ok(
  !JSON.stringify([contact, source, listed, status]).match(
    /instance_token|client_token|provider_key|55119999/,
  ),
);
const refreshed = await fetch(discovery.token_endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    client_id: client.client_id,
    refresh_token: tokens.refresh_token,
    resource: origin + "/mcp",
  }),
});
assert.equal(refreshed.status, 200);
tokens = await refreshed.json();
await writeFile(
  join(dir, "client-tokens.json"),
  JSON.stringify({ origin, client_id: client.client_id, tokens }),
  { mode: 0o600 },
);
const report = {
  origin,
  passed: [
    "Access_OIDC_login",
    "OAuth_PKCE",
    "MCP_initialize",
    "tools_list",
    "contact_create",
    "source_import",
    "contacts_page",
    "safe_diagnostic",
    "MCP_refresh",
  ],
  tool_count: tools.tools.length,
  contact_id: contact.id,
  source_id: source.id ?? source.source_id,
  at: new Date().toISOString(),
};
await writeFile(join(dir, "report.json"), JSON.stringify(report, null, 2), {
  mode: 0o600,
});
console.log(JSON.stringify(report));
