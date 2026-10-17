// Additional public MCP checks for the OAuth grant created by live-mcp.mjs.
// Uses only newly created synthetic records; revokes only that test grant at the end.
import { readFile, writeFile, lstat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import assert from "node:assert/strict";
const dir = join(homedir(), ".local/state/elo/live-validation"),
  file = join(dir, "client-tokens.json");
const stat = await lstat(file);
assert.ok(
  stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o600,
);
const { origin, client_id, tokens } = JSON.parse(await readFile(file, "utf8"));
assert.equal(origin, "https://elo.robsonlins.workers.dev");
assert.equal(typeof tokens.access_token, "string");
let rpcId = 0;
async function tool(name, args = {}) {
  const r = await fetch(origin + "/mcp", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-03-26",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: ++rpcId,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  assert.equal(r.status, 200);
  const b = await r.json();
  assert.ok(!b.error && !b.result.isError, "Operação sintética recusada");
  return JSON.parse(b.result.content[0].text);
}
const contact = await tool("contact_create", { alias: "Lia teste MCP" });
const source = await tool("source_import", {
  contact_id: contact.id,
  source_key: "synthetic-mcp-ops-" + Date.now(),
  occurred_at: Date.now(),
  text: "Minha meta é aprender italiano. Prefiro reuniões pela manhã.",
  kind: "note",
});
for (const [field, value] of [
  ["goals", "Aprender italiano."],
  ["preferences", "Prefere reuniões pela manhã."],
])
  await tool("memory_write", {
    contact_id: contact.id,
    source_id: source.source_id,
    field,
    value,
    certainty: "explicit",
  });
const first = await tool("memory_get", { contact_id: contact.id, limit: 1 });
assert.equal(first.items.length, 1);
assert.ok(first.next_cursor);
const second = await tool("memory_get", {
  contact_id: contact.id,
  limit: 1,
  cursor: first.next_cursor,
});
assert.equal(second.items.length, 1);
assert.notEqual(second.items[0].id, first.items[0].id);
assert.equal(second.next_cursor, null);
assert.ok(
  [...first.items, ...second.items].every(
    (x) =>
      x.state === "confirmed" &&
      x.source_id === source.source_id &&
      x.source_available,
  ),
);
const allowed = new Set([
  "id",
  "field",
  "value",
  "state",
  "reason",
  "source_id",
  "source_version",
  "occurred_at",
  "recorded_at",
  "confirmed_at",
  "needs_review",
  "source_available",
]);
assert.ok(
  [...first.items, ...second.items].every((x) =>
    Object.keys(x).every((k) => allowed.has(k)),
  ),
);
const contacts = await tool("contacts_list", { limit: 1 });
assert.ok(contacts.next_cursor);
const more = await tool("contacts_list", {
  limit: 1,
  cursor: contacts.next_cursor,
});
assert.notEqual(contacts.items[0].id, more.items[0].id);
assert.ok(
  [...contacts.items, ...more.items].every((x) =>
    Object.keys(x).every((k) =>
      ["id", "alias", "relationship", "cadence_days", "snooze_until"].includes(
        k,
      ),
    ),
  ),
);
const status = await tool("installation_status");
assert.equal(status.whatsapp, "not_configured");
const discovery = await (
  await fetch(origin + "/.well-known/oauth-authorization-server")
).json();
assert.equal(discovery.revocation_endpoint, origin + "/oauth/token");
const revoked = await fetch(discovery.revocation_endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    token: tokens.refresh_token,
    token_type_hint: "refresh_token",
    client_id,
  }),
});
assert.equal(revoked.status, 200);
const oldAccess = await fetch(origin + "/mcp", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${tokens.access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method: "tools/list" }),
});
assert.equal(oldAccess.status, 401);
const oldRefresh = await fetch(discovery.token_endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    client_id,
    refresh_token: tokens.refresh_token,
    resource: origin + "/mcp",
  }),
});
assert.equal(oldRefresh.status, 400);
const report = {
  synthetic: true,
  at: new Date().toISOString(),
  origin,
  version: status.version,
  commit: status.commit,
  checks: [
    "memory_write",
    "memory_read",
    "memory_pagination",
    "contact_pagination",
    "structured_projection",
    "safe_diagnostic",
    "test_grant_revocation",
    "revoked_access_denied",
    "revoked_refresh_denied",
  ],
  contact_id: contact.id,
  source_id: source.source_id,
  revoked_access_status: oldAccess.status,
  revoked_refresh_status: oldRefresh.status,
  scope:
    "Cliente HTTP próprio; não prova Claude/ChatGPT/celular ou cron. Renovação natural Access de15min não exercitada.",
};
await writeFile(
  join(dir, "operations-report.json"),
  JSON.stringify(report, null, 2),
  { mode: 0o600 },
);
console.log(JSON.stringify(report));
