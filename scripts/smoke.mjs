import assert from "node:assert/strict";
const origin = process.argv[2] ?? "https://elo.robsonlins.workers.dev";
if (!origin.startsWith("https://")) throw new Error("HTTPS obrigatório");
const health = await fetch(origin + "/health");
assert.equal(health.status, 200);
const info = await health.json();
assert.equal(info.ok, true);
const home = await fetch(origin + "/");
assert.equal(home.status, 200);
assert.match(await home.text(), /Cloudflare Access/);
const mcp = await fetch(origin + "/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
});
assert.equal(mcp.status, 401);
assert.match(
  mcp.headers.get("WWW-Authenticate") ?? "",
  /oauth-protected-resource/,
);
const forged = await fetch(origin + "/mcp", {
  method: "POST",
  headers: {
    Authorization: "Bearer synthetic-invalid",
    "Content-Type": "application/json",
  },
  body: "{}",
});
assert.equal(forged.status, 401);
const cb = await fetch(origin + "/webhooks/zapi/synthetic-invalid", {
  method: "POST",
  body: "{}",
});
assert.ok([401, 503].includes(cb.status));
const md = await fetch(origin + "/.well-known/oauth-authorization-server");
assert.equal(md.status, 200);
const discovery = await md.json();
assert.equal(discovery.issuer, origin);
assert.ok(discovery.code_challenge_methods_supported.includes("S256"));
console.log(
  JSON.stringify({
    origin,
    health: info,
    checks: [
      "home",
      "health_D1",
      "unauthenticated_MCP",
      "invalid_bearer",
      "protected_webhook",
      "OAuth_discovery_PKCE",
    ],
    passed: 6,
  }),
);
