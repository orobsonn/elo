import { readConfig } from "./read-config.mjs";
// Run by the installation assistant after an explicit restore request.
// Maintenance and a new epoch live in Worker config, outside the D1 backup.
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
const configPath = resolve(process.env.ELO_WRANGLER_PATH ?? "wrangler.jsonc");
const config = await readConfig(configPath);
if (
  !/^elo(?:-[a-z0-9-]+)?$/.test(config.name) ||
  config.d1_databases?.length !== 1 ||
  !config.account_id ||
  !/^elo(?:-[a-z0-9-]+)?$/.test(config.d1_databases[0].database_name)
)
  throw new Error("Alvo Elo não confirmado.");
const target = process.argv[2];
const isBookmark = /^[a-f0-9]{8}-[a-f0-9]{8}-[a-f0-9]{8}-[a-f0-9]{32}$/i.test(
  target ?? "",
);
if (!target || (!isBookmark && !Number.isFinite(Date.parse(target))))
  throw new Error("A IA deve fornecer a data/hora exata de recuperação.");
function cli(args) {
  const r = spawnSync("npx", ["wrangler", "--config", configPath, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: config.account_id },
  });
  if (r.status !== 0)
    throw new Error(
      "Recuperação interrompida; manter manutenção. A IA deve verificar a etapa.",
    );
  return r.stdout;
}
const state = join(homedir(), ".local/state/elo/restore", randomUUID());
await mkdir(state, { recursive: true, mode: 0o700 });
const secrets = join(state, "epoch.json");
await writeFile(secrets, JSON.stringify({ AUTH_EPOCH: randomUUID() }), {
  mode: 0o600,
});
function upload(mode) {
  const output = cli([
    "versions",
    "upload",
    "--var",
    `MAINTENANCE:${mode}`,
    "--secrets-file",
    secrets,
    "--message",
    "Elo controlled restore",
  ]);
  const match =
    output.match(/Worker Version ID:\s*([a-f0-9-]{36})/i) ??
    output.match(/Version ID:\s*([a-f0-9-]{36})/i);
  if (!match)
    throw new Error(
      "Versão de manutenção não identificada. Não continuar restore.",
    );
  return match[1];
}
const maintenance = upload("true");
cli(["versions", "deploy", `${maintenance}@100%`, "--yes"]);
const probe = await fetch(config.vars.PUBLIC_ORIGIN + "/mcp", {
  method: "POST",
  body: "{}",
});
if (probe.status !== 503)
  throw new Error("Gate de manutenção não confirmado. Restore não executado.");
// Drain bounded sends (12s status +12s device +12s POST) and 40s inference.
await new Promise((r) => setTimeout(r, 55000));
cli([
  "d1",
  "time-travel",
  "restore",
  config.d1_databases[0].database_name,
  isBookmark ? "--bookmark" : "--timestamp",
  target,
  "--json",
]);
const sql =
  "UPDATE settings SET sends_paused=1,data_generation=data_generation+1; UPDATE actions SET status=CASE WHEN status IN ('prepared','awaiting_approval','authorized') THEN 'cancelled' WHEN status='executing' THEN 'uncertain' ELSE status END; UPDATE sources SET content=NULL,extract_state='done',lease=NULL WHERE expires_at<=unixepoch()*1000; DELETE FROM auth_state WHERE key!='owner_binding';";
cli([
  "d1",
  "execute",
  config.d1_databases[0].database_name,
  "--remote",
  "--command",
  sql,
]);
if (!process.argv.includes("--reopen")) {
  console.log(
    JSON.stringify({
      status: "restored_maintenance_active",
      maintenanceVersion: maintenance,
      sendsPaused: true,
      next: "IA deve validar dados e publicar MAINTENANCE:false com o NOVO epoch antes de reabrir.",
    }),
  );
  process.exit(0);
}
const version = upload("false");
cli(["versions", "deploy", `${version}@100%`, "--yes"]);
try {
  const health = await fetch(config.vars.PUBLIC_ORIGIN + "/health");
  const live = await health.json();
  if (!health.ok || live.ok !== true || live.version !== version)
    throw new Error("Versão reaberta não confirmada.");
  const unauthorized = await fetch(config.vars.PUBLIC_ORIGIN + "/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (unauthorized.status !== 401)
    throw new Error("Proteção MCP não confirmada.");
} catch {
  cli(["versions", "deploy", `${maintenance}@100%`, "--yes"]);
  throw new Error("Validação pós-restore falhou; manutenção reaplicada.");
}
console.log(
  JSON.stringify({
    status: "restored",
    version,
    sendsPaused: true,
    epochRotated: true,
  }),
);
