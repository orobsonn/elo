import { readConfig } from "./read-config.mjs";
// Administration-only synthetic benchmark. No route or fake provider is deployed.
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
const config = await readConfig("wrangler.jsonc");
if (
  config.name !== "elo" ||
  config.account_id !== "ab9f6d8988145943bf8bbab313e45e6e" ||
  config.d1_databases[0].database_name !== "elo-data"
)
  throw new Error("Alvo pessoal Elo não confirmado");
const file = "docs/implementacao/benchmark-inputs.json";
let manifest;
try {
  manifest = JSON.parse(await readFile(file, "utf8"));
} catch {
  manifest = {
    synthetic: true,
    created_at: new Date().toISOString(),
    contacts: [
      { id: "ct_" + randomUUID().replaceAll("-", ""), alias: "Mario viagem" },
      { id: "ct_" + randomUUID().replaceAll("-", ""), alias: "Bia exemplo" },
      { id: "ct_" + randomUUID().replaceAll("-", ""), alias: "Lia exemplo" },
    ],
    sources: [],
  };
  await writeFile(file, JSON.stringify(manifest, null, 2));
}
const stage = process.argv[2] ?? "first";
if (!["first", "second"].includes(stage)) throw new Error("Etapa inválida");
const texts =
  stage === "first"
    ? [
        "Minha meta é viajar ao Chile em novembro de 2027. Prefiro reuniões pela manhã.",
        "Meu irmão tem três filhos. Não tenho filhos.",
        "Tenho dois filhos.",
      ]
    : [
        "Corrigindo: a viagem ao Chile será em dezembro de 2027, não em novembro.",
        "Podemos conversar em novembro, mas ainda não sei o dia.",
        "Minha meta é aprender italiano no próximo ano.",
      ];
const q = (v) =>
  typeof v === "number"
    ? String(v)
    : "'" + String(v).replaceAll("'", "''") + "'";
let statements = [];
const t = Date.now();
for (let i = 0; i < 3; i++) {
  const c = manifest.contacts[i];
  statements.push(
    `INSERT OR IGNORE INTO contacts(id,alias,created_at) VALUES(${q(c.id)},${q(c.alias)},${t})`,
  );
  let s = manifest.sources.find(
    (s) => s.stage === stage && s.contact_id === c.id,
  );
  if (!s) {
    s = {
      id: "src_" + randomUUID().replaceAll("-", ""),
      message_id: "msg_" + randomUUID().replaceAll("-", ""),
      contact_id: c.id,
      stage,
      text: texts[i],
      direction: stage === "first" && i === 2 ? "out" : "in",
      occurred_at: t,
    };
    manifest.sources.push(s);
  }
  const key = createHash("sha256")
    .update("synthetic-benchmark:" + s.id)
    .digest("hex");
  statements.push(
    `INSERT OR IGNORE INTO sources(id,contact_id,dedup_key,kind,occurred_at,received_at,expires_at,content) VALUES(${q(s.id)},${q(c.id)},${q(key)},'message',${s.occurred_at},${t},${s.occurred_at + 30 * 86400000},${q(s.text)})`,
  );
  statements.push(
    `INSERT OR IGNORE INTO messages(id,source_id,provider_key,contact_id,direction,kind,mutation_at) VALUES(${q(s.message_id)},${q(s.id)},${q(key)},${q(c.id)},${q(s.direction)},'text',${s.occurred_at})`,
  );
}
await writeFile(file, JSON.stringify(manifest, null, 2) + "\n");
const run = spawnSync(
  "npx",
  [
    "wrangler",
    "d1",
    "execute",
    "elo-data",
    "--remote",
    "--command",
    statements.join(";") + ";",
    "--json",
  ],
  { encoding: "utf8" },
);
if (run.status !== 0)
  throw new Error("Seed sintético falhou; verificar administração Elo.");
const result = JSON.parse(run.stdout);
console.log(
  JSON.stringify({
    stage,
    sources: 3,
    rows_written: result.reduce((a, r) => a + (r.meta?.rows_written ?? 0), 0),
    synthetic: true,
  }),
);
