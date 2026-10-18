import { env } from "cloudflare:test";
import { expect, it } from "vitest";
import { DAY, id, now, sql } from "../src/core";
import { runExtraction } from "../src/extraction";
import type { AppEnv } from "../src/env";
async function fixture(
  texts = [
    "Prefiro conversar à tarde.",
    "Combinado.",
    "Vou enviar os documentos.",
  ],
) {
  const c = id("ct");
  await sql(
    env.DB,
    "INSERT INTO contacts(id,alias,created_at) VALUES(?,?,?)",
    c,
    "SIM bloco",
    now(),
  ).run();
  const ids: string[] = [];
  for (const [i, text] of texts.entries()) {
    const s = id("src");
    ids.push(s);
    await sql(
      env.DB,
      "INSERT INTO sources(id,contact_id,dedup_key,kind,occurred_at,received_at,expires_at,content) VALUES(?,?,?,'message',?,?,?,?)",
      s,
      c,
      s,
      now() + i,
      now(),
      now() + 30 * DAY,
      text,
    ).run();
    await sql(
      env.DB,
      "INSERT INTO messages(id,source_id,provider_key,contact_id,direction,kind) VALUES(?,?,?,?,'in','text')",
      id("msg"),
      s,
      s,
      c,
    ).run();
  }
  return { c, ids };
}
function runtime(run: (m: string, p: any) => Promise<any>, limit?: string) {
  return {
    ...env,
    AI_ENABLED: "true",
    AI_MODEL: "synthetic",
    EXTRACTION_CALLS_DAILY: limit,
    AI: { run },
  } as unknown as AppEnv;
}
function response(p: any, facts: any[] = [], tasks: any[] = []) {
  return {
    response: JSON.stringify(
      p.sources
        ? {
            contact_id: p.contact_id,
            source_ids: p.sources.map((s: any) => s.source_id),
            complete: true,
            facts,
            tasks,
          }
        : { contact_id: p.contact_id, source_id: p.source_id, facts, tasks },
    ),
  };
}
async function done() {
  return (await sql(
    env.DB,
    "SELECT COUNT(*) n FROM sources WHERE extract_state='done'",
  ).first<{ n: number }>())!.n;
}
it("extracts a contact conversation in one call and keeps each original source", async () => {
  const f = await fixture();
  let calls = 0;
  await runExtraction(
    runtime(async (_m, input) => {
      calls++;
      const p = JSON.parse(input.messages[1].content);
      return response(p, [
        {
          ...(p.sources ? { source_id: f.ids[0] } : {}),
          field: "preferences",
          value: "Prefere tarde",
          certainty: "explicit",
          evidence: "Prefiro conversar à tarde.",
        },
      ]);
    }),
    1,
  );
  expect(calls).toBe(1);
  expect(await done()).toBe(3);
  expect(
    await sql(env.DB, "SELECT source_id,state FROM memory").first(),
  ).toMatchObject({ source_id: f.ids[0], state: "confirmed" });
});
it("keeps other contacts out of a block and leaves excluded messages pending", async () => {
  const a = await fixture(Array.from({ length: 22 }, () => "x".repeat(1000)));
  await fixture(["PRIVATE OTHER CONTACT"]);
  let count = 0;
  await runExtraction(
    runtime(async (_m, input) => {
      const p = JSON.parse(input.messages[1].content);
      expect(JSON.stringify(p)).not.toContain("PRIVATE OTHER CONTACT");
      expect(p.sources.length).toBeLessThanOrEqual(20);
      expect(
        p.sources.reduce((n: number, s: any) => n + s.source_text.length, 0),
      ).toBeLessThanOrEqual(12000);
      count = p.sources.length;
      return response(p);
    }),
    1,
  );
  expect(count).toBeGreaterThan(1);
  expect(await done()).toBe(count);
  expect(
    await sql(
      env.DB,
      "SELECT COUNT(*) n FROM sources WHERE contact_id=? AND extract_state='pending'",
      a.c,
    ).first(),
  ).toMatchObject({ n: 22 - count });
});
it.each([
  "edit",
  "delete",
  "lease",
  "contact_generation",
  "data_generation",
  "expiry",
])(
  "rejects the entire block after a member %s during inference",
  async (change) => {
    const f = await fixture();
    await runExtraction(
      runtime(async (_m, input) => {
        const p = JSON.parse(input.messages[1].content);
        const query =
          change === "edit"
            ? "UPDATE sources SET version=version+1,content='Mudou' WHERE id=?"
            : change === "delete"
              ? "DELETE FROM messages WHERE source_id=?"
              : change === "lease"
                ? "UPDATE sources SET lease='other' WHERE id=?"
                : change === "contact_generation"
                  ? "UPDATE contacts SET generation=generation+1 WHERE id=?"
                  : change === "data_generation"
                    ? "UPDATE settings SET data_generation=data_generation+1 WHERE id=?"
                    : "UPDATE sources SET expires_at=1 WHERE id=?";
        await sql(
          env.DB,
          query,
          change === "contact_generation"
            ? f.c
            : change === "data_generation"
              ? 1
              : f.ids[1],
        ).run();
        if (change === "delete")
          await sql(env.DB, "DELETE FROM sources WHERE id=?", f.ids[1]).run();
        return response(p, [
          {
            source_id: f.ids[0],
            field: "preferences",
            value: "Prefere tarde",
            certainty: "explicit",
            evidence: "Prefiro conversar à tarde.",
          },
        ]);
      }),
      1,
    );
    expect(
      await sql(env.DB, "SELECT COUNT(*) n FROM memory").first(),
    ).toMatchObject({ n: 0 });
    expect(await done()).toBeLessThan(3);
    expect(
      await sql(
        env.DB,
        "SELECT attempts,extract_state FROM sources WHERE id=?",
        f.ids[0],
      ).first(),
    ).toMatchObject({ attempts: 0, extract_state: "pending" });
  },
);
it("rolls back earlier facts when an insert trigger invalidates a different member", async () => {
  const f = await fixture();
  await sql(
    env.DB,
    `CREATE TRIGGER invalidate_block_member AFTER INSERT ON memory BEGIN UPDATE sources SET expires_at=1 WHERE id='${f.ids[1]}'; END`,
  ).run();
  try {
    await runExtraction(
      runtime(async (_m, input) =>
        response(JSON.parse(input.messages[1].content), [
          {
            source_id: f.ids[0],
            field: "preferences",
            value: "Prefere tarde",
            certainty: "explicit",
            evidence: "Prefiro conversar à tarde.",
          },
        ]),
      ),
      1,
    );
    expect(
      await sql(env.DB, "SELECT COUNT(*) n FROM memory").first(),
    ).toMatchObject({ n: 0 });
    expect(await done()).toBe(0);
  } finally {
    await sql(env.DB, "DROP TRIGGER invalidate_block_member").run();
  }
});
it.each(["foreign_source", "wrong_evidence", "incomplete", "saturated"])(
  "splits an invalid %s block without exhausting its neighbours",
  async (reason) => {
    const f = await fixture();
    await runExtraction(
      runtime(async (_m, input) => {
        const p = JSON.parse(input.messages[1].content);
        const r = response(
          p,
          reason === "incomplete"
            ? []
            : [
                {
                  source_id: reason === "foreign_source" ? id("src") : f.ids[0],
                  field: "preferences",
                  value: "Prefere tarde",
                  certainty: "explicit",
                  evidence:
                    reason === "wrong_evidence"
                      ? "Vou enviar os documentos."
                      : "Prefiro conversar à tarde.",
                },
              ],
        );
        const data = JSON.parse(r.response);
        if (reason === "incomplete") data.complete = false;
        if (reason === "saturated")
          data.facts = Array.from({ length: 12 }, () => data.facts[0]);
        return { response: JSON.stringify(data) };
      }),
      1,
    );
    expect(await done()).toBe(0);
    expect(
      await sql(env.DB, "SELECT COUNT(*) n FROM memory").first(),
    ).toMatchObject({ n: 0 });
    expect(
      (
        await sql(env.DB, "SELECT attempts,extract_state FROM sources").all()
      ).results.every((r) => r.attempts === 0 && r.extract_state === "pending"),
    ).toBe(true);
    await sql(env.DB, "UPDATE sources SET next_attempt=0").run();
    await runExtraction(
      runtime(async (_m, input) =>
        response(JSON.parse(input.messages[1].content)),
      ),
      1,
    );
    expect(await done()).toBeGreaterThan(0);
  },
);
it("uses a default daily allowance of 200 blocks and resumes after a budget-limited day", async () => {
  await fixture();
  const day = new Date().toISOString().slice(0, 10);
  await sql(env.DB, "INSERT INTO usage(day,calls) VALUES(?,199)", day).run();
  let calls = 0;
  const ai = runtime(async (_m, input) => {
    calls++;
    return response(JSON.parse(input.messages[1].content));
  });
  await Promise.all([runExtraction(ai, 1), runExtraction(ai, 1)]);
  expect(calls).toBe(1);
  expect(
    await sql(env.DB, "SELECT calls FROM usage WHERE day=?", day).first(),
  ).toMatchObject({ calls: 200 });
  expect(await done()).toBe(3);
});
it("retains context provenance and flags memory and tasks after a secondary message changes", async () => {
  const f = await fixture();
  await runExtraction(
    runtime(async (_m, input) =>
      response(
        JSON.parse(input.messages[1].content),
        [
          {
            source_id: f.ids[0],
            field: "preferences",
            value: "Prefere tarde",
            certainty: "explicit",
            evidence: "Prefiro conversar à tarde.",
          },
        ],
        [
          {
            source_id: f.ids[2],
            subject: "Enviar documentos",
            reason: "Combinado no bloco",
            evidence: "Vou enviar os documentos.",
          },
        ],
      ),
    ),
    1,
  );
  const { getMemory, getTasks, attention } = await import("../src/memory");
  const before = await getMemory(env.DB, { contact_id: f.c });
  expect(before.items[0]).toHaveProperty("context_sources");
  expect((await getTasks(env.DB, { contact_id: f.c })).items[0]).toHaveProperty(
    "source_version",
    1,
  );
  await sql(
    env.DB,
    "UPDATE sources SET version=version+1,content='Não combinado' WHERE id=?",
    f.ids[1],
  ).run();
  expect((await getMemory(env.DB, { contact_id: f.c })).items[0]).toMatchObject(
    { needs_review: true },
  );
  expect((await getTasks(env.DB, { contact_id: f.c })).items[0]).toMatchObject({
    needs_review: true,
    state: "open",
  });
  expect((await attention(env.DB, { contact_id: f.c })).tasks[0]).toMatchObject(
    { needs_review: true, source_version: 1 },
  );
});
it("rolls back a partial claim without using budget or calling AI", async () => {
  const f = await fixture();
  let calls = 0,
    intercepted = false;
  const db = new Proxy(env.DB, {
    get(target, key) {
      if (key === "batch")
        return async (statements: D1PreparedStatement[]) => {
          if (!intercepted) {
            intercepted = true;
            await sql(
              env.DB,
              "UPDATE sources SET version=version+1 WHERE id=?",
              f.ids[1],
            ).run();
          }
          return target.batch(statements);
        };
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  await runExtraction(
    {
      ...runtime(async () => {
        calls++;
        return {};
      }),
      DB: db,
    },
    1,
  );
  expect(calls).toBe(0);
  expect(
    await sql(env.DB, "SELECT COALESCE(SUM(calls),0) calls FROM usage").first(),
  ).toMatchObject({ calls: 0 });
  expect(
    (
      await sql(env.DB, "SELECT attempts,extract_state FROM sources").all()
    ).results.every((x) => x.attempts === 0 && x.extract_state === "pending"),
  ).toBe(true);
});
it("does not clear an existing review alert when a secondary context changes during confirmation", async () => {
  const f = await fixture();
  await runExtraction(
    runtime(async (_m, input) =>
      response(JSON.parse(input.messages[1].content), [
        {
          source_id: f.ids[0],
          field: "preferences",
          value: "Prefere tarde",
          certainty: "explicit",
          evidence: "Prefiro conversar à tarde.",
        },
      ]),
    ),
    1,
  );
  await sql(
    env.DB,
    "UPDATE sources SET version=version+1 WHERE id=?",
    f.ids[1],
  ).run();
  const m = (await sql(env.DB, "SELECT id FROM memory").first<{
    id: string;
  }>())!;
  const db = new Proxy(env.DB, {
    get(target, key) {
      if (key === "batch")
        return async (statements: D1PreparedStatement[]) => {
          await sql(
            env.DB,
            "UPDATE sources SET version=version+1 WHERE id=?",
            f.ids[1],
          ).run();
          return target.batch(statements);
        };
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const { reviewMemory } = await import("../src/memory");
  await expect(
    reviewMemory(db, { id: m.id, decision: "confirm" }),
  ).rejects.toThrow("memoria_alterada_recarregue");
  expect(
    await sql(env.DB, "SELECT state,needs_review FROM memory").first(),
  ).toMatchObject({ state: "confirmed", needs_review: 1 });
});
it("expires context text without invalidating concise facts and forgets dependency links with the contact", async () => {
  const f = await fixture();
  await runExtraction(
    runtime(async (_m, input) =>
      response(JSON.parse(input.messages[1].content), [
        {
          source_id: f.ids[0],
          field: "preferences",
          value: "Prefere tarde",
          certainty: "explicit",
          evidence: "Prefiro conversar à tarde.",
        },
      ]),
    ),
    1,
  );
  const { expire, getMemory } = await import("../src/memory");
  await sql(
    env.DB,
    "UPDATE sources SET expires_at=1 WHERE id=?",
    f.ids[1],
  ).run();
  await expire(env.DB);
  const m = (await getMemory(env.DB, { contact_id: f.c })).items[0];
  expect(m.needs_review).toBe(false);
  expect(
    m.context_sources.some((x) => x.source_id === f.ids[1] && !x.available),
  ).toBe(true);
  const { deleteContact } = await import("../src/operations");
  await deleteContact(env.DB, f.c, (env as AppEnv).ENCRYPTION_KEY);
  expect(
    await sql(env.DB, "SELECT COUNT(*) n FROM source_dependencies").first(),
  ).toMatchObject({ n: 0 });
});
it.each(["0", "-1", "1.5", "1001", "unlimited", " 200"])(
  "uses a bounded default for invalid daily allowance %s",
  async (value) => {
    const { extractionDailyLimit } = await import("../src/extraction");
    expect(extractionDailyLimit({ EXTRACTION_CALLS_DAILY: value })).toBe(200);
  },
);
it("applies the recorded real DeepSeek block response through the production validator and D1 writes", async () => {
  const report = (await import("../docs/implementacao/blocos-modelo-1810.json"))
    .default;
  const texts = [
    "Podemos conversar amanhã à tarde?",
    "Sim, às 15h está bom.",
    "Quero aprender violão.",
    "Vou te enviar duas opções de curso.",
    "Obrigado!",
    "Talvez eu me mude, mas não decidi.",
  ];
  const c = "ct_synthetic_block";
  await sql(
    env.DB,
    "INSERT INTO contacts(id,alias,created_at) VALUES(?,?,?)",
    c,
    "SIM modelo real",
    now(),
  ).run();
  for (const [i, text] of texts.entries()) {
    const s = "src_synthetic_" + i;
    await sql(
      env.DB,
      "INSERT INTO sources(id,contact_id,dedup_key,kind,occurred_at,received_at,expires_at,content) VALUES(?,?,?,'message',?,?,?,?)",
      s,
      c,
      s,
      now() + i,
      now(),
      now() + DAY,
      text,
    ).run();
    await sql(
      env.DB,
      "INSERT INTO messages(id,source_id,provider_key,contact_id,direction,kind) VALUES(?,?,?,?,?,'text')",
      id("msg"),
      s,
      s,
      c,
      [0, 3].includes(i) ? "out" : "in",
    ).run();
  }
  const result = await runExtraction(
    runtime(async () => ({
      response: JSON.stringify(report.rounds[1].output),
      usage: report.rounds[1].usage,
    })),
    1,
  );
  expect(result.processed).toBe(6);
  expect(
    await sql(
      env.DB,
      "SELECT COUNT(*) n FROM memory WHERE state='confirmed'",
    ).first(),
  ).toMatchObject({ n: 2 });
  expect(
    await sql(
      env.DB,
      "SELECT COUNT(*) n FROM memory WHERE state='pending'",
    ).first(),
  ).toMatchObject({ n: 1 });
  expect(
    await sql(
      env.DB,
      "SELECT responsible,source_id,source_version FROM tasks",
    ).first(),
  ).toMatchObject({
    responsible: "consultor",
    source_id: "src_synthetic_3",
    source_version: 1,
  });
});
