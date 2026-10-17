// Read only the persisted synthetic manifest, never credentials or arbitrary contacts.
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { readConfig } from "./read-config.mjs";
const c = await readConfig("wrangler.jsonc");
if (
  c.name !== "elo" ||
  c.account_id !== "ab9f6d8988145943bf8bbab313e45e6e" ||
  c.d1_databases[0].database_name !== "elo-data"
)
  throw new Error("Alvo pessoal Elo não confirmado");
const stage = process.argv[2];
if (!/^[a-z][a-z0-9-]{0,50}$/.test(stage ?? ""))
  throw new Error("Nome de snapshot inválido");
const m = JSON.parse(
  await readFile("docs/implementacao/benchmark-inputs.json", "utf8"),
);
const ids = m.sources.map((s) => s.id).concat("src_retention_live");
if (!ids.every((id) => /^src_[a-zA-Z0-9_-]+$/.test(id)))
  throw new Error("Manifesto inválido");
const list = ids.map((id) => `'${id}'`).join(",");
const queries = [
  `SELECT c.alias,s.id,s.extract_state,s.attempts,s.safe_error,s.content IS NULL raw_removed FROM sources s JOIN contacts c ON c.id=s.contact_id WHERE s.id IN (${list}) ORDER BY s.seq`,
  `SELECT c.alias,m.field,m.value,m.state,m.reason,m.source_id FROM memory m JOIN contacts c ON c.id=m.contact_id WHERE m.source_id IN (${list}) ORDER BY m.recorded_at,m.id`,
  `SELECT subject,due_date,date_note,state,source_id FROM tasks WHERE source_id IN (${list})`,
  `SELECT * FROM usage`,
];
const r = spawnSync(
  "npx",
  [
    "wrangler",
    "d1",
    "execute",
    "elo-data",
    "--remote",
    "--command",
    queries.join(";") + ";",
    "--json",
  ],
  { encoding: "utf8" },
);
if (r.status) throw new Error("Snapshot sintético indisponível");
const rows = JSON.parse(r.stdout);
if (rows.some((r) => !r.success)) throw new Error("Consulta incompleta");
const health = await (await fetch(c.vars.PUBLIC_ORIGIN + "/health")).json();
const report = {
  synthetic: true,
  stage,
  at: new Date().toISOString(),
  boundary:
    "D1 administrativo; processamento pelo cron publicado. Não prova recebimento Z-API nem cliente MCP.",
  health,
  jobs: rows[0].results,
  memory: rows[1].results,
  tasks: rows[2].results,
  usage: rows[3].results,
  query_meta: rows.map((r) => r.meta),
};
await writeFile(
  `docs/implementacao/benchmark-${stage}.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    saved: stage,
    jobs: report.jobs.length,
    facts: report.memory.length,
    tasks: report.tasks.length,
    usage: report.usage,
  }),
);
