import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { DAY, id, now, sql } from "../src/core";
import { importSource, getMemory, getTasks, reviewTask } from "../src/memory";
import { runExtraction } from "../src/extraction";
import type { AppEnv } from "../src/env";

async function fixture() {
  const contact_id = id("ct");
  await sql(
    env.DB,
    "INSERT INTO contacts(id,alias,created_at) VALUES(?,?,?)",
    contact_id,
    "Mario ensaio",
    now(),
  ).run();
  return {
    contact_id,
    source_key: "meeting-stable-v1",
    kind: "meeting" as const,
    occurred_at: now(),
    text: "Mario prefere reuniões à tarde. O consultor enviará a pauta até novembro.",
    extraction: {
      facts: [
        {
          field: "preferences",
          value: "Prefere reuniões à tarde",
          certainty: "explicit",
        },
      ],
      tasks: [
        {
          subject: "Enviar a pauta",
          responsible: "consultor",
          reason: "Combinado na reunião",
          due_date: "2026-11-01",
        },
      ],
    },
  };
}

function runtime() {
  return {
    ...env,
    AI_ENABLED: "true",
    AI: {
      run: async (_model: string, input: any) => {
        const p = JSON.parse(input.messages[1].content);
        return {
          response: JSON.stringify({
            contact_id: p.contact_id,
            source_id: p.source_id,
            facts: [],
            tasks: [
              {
                subject: "Mandar uma pauta",
                responsible: "consultor",
                reason: "Compromisso",
                due_date: "2026-11-01",
                evidence: "O consultor enviará a pauta até novembro.",
              },
            ],
          }),
        };
      },
    },
  } as unknown as AppEnv;
}

describe("meeting import applied once by its Skill", () => {
  it("also rolls back automatic extraction if the source expires after its first insert", async () => {
    const p = await fixture(),
      { extraction: _, ...automatic } = p;
    await importSource(env.DB, automatic);
    let committing = false;
    const failingMidCommit = new Proxy(env.DB, {
      get(target, key) {
        if (key === "batch")
          return (statements: D1PreparedStatement[]) =>
            target.batch(
              committing
                ? [
                    statements[0],
                    sql(
                      target,
                      "UPDATE sources SET expires_at=? WHERE contact_id=?",
                      now() - 1,
                      p.contact_id,
                    ),
                    ...statements.slice(1),
                  ]
                : statements,
            );
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const e = runtime(),
      run = e.AI.run.bind(e.AI);
    const result = await runExtraction(
      {
        ...e,
        DB: failingMidCommit,
        AI: {
          run: async (...args: any[]) => {
            const response = await (run as (...a: any[]) => Promise<unknown>)(
              ...args,
            );
            committing = true;
            return response;
          },
        },
      } as unknown as AppEnv,
      1,
    );
    expect(result.processed).toBe(0);
    expect(
      (await getTasks(env.DB, { contact_id: p.contact_id })).items,
    ).toHaveLength(0);
  });
  it("rolls back earlier inserts when source eligibility changes inside the transaction", async () => {
    const p = await fixture();
    const expiring = new Proxy(env.DB, {
      get(target, key) {
        if (key === "batch")
          return (statements: D1PreparedStatement[]) =>
            target.batch([
              statements[0],
              sql(
                target,
                "UPDATE sources SET expires_at=? WHERE contact_id=?",
                now() - 1,
                p.contact_id,
              ),
              ...statements.slice(1),
            ]);
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    await expect(importSource(expiring, p)).rejects.toThrow();
    expect(
      (await getMemory(env.DB, { contact_id: p.contact_id })).items,
    ).toHaveLength(0);
    expect(
      (await getTasks(env.DB, { contact_id: p.contact_id })).items,
    ).toHaveLength(0);
    expect(
      await sql(
        env.DB,
        "SELECT skill_applied FROM sources WHERE contact_id=?",
        p.contact_id,
      ).first(),
    ).toMatchObject({ skill_applied: 0 });
    expect(await importSource(env.DB, p)).toMatchObject({
      application_state: "applied",
    });
  });
  it("keeps one task across paraphrased concurrent imports, review and later cron runs", async () => {
    const p = await fixture();
    const [a, b] = await Promise.all([
      importSource(env.DB, p),
      importSource(env.DB, {
        ...p,
        extraction: {
          ...p.extraction,
          tasks: [
            { ...p.extraction.tasks[0], subject: "Preparar e enviar pauta" },
          ],
        },
      }),
    ]);
    expect(a).toMatchObject({
      source_id: b.source_id,
      extraction_owner: "skill",
      application_state: "applied",
    });
    expect(
      (await getMemory(env.DB, { contact_id: p.contact_id })).items,
    ).toHaveLength(1);
    const tasks = await getTasks(env.DB, { contact_id: p.contact_id });
    expect(tasks.items).toHaveLength(1);
    const task = tasks.items[0] as { id: string };
    await reviewTask(env.DB, {
      id: task.id,
      contact_id: p.contact_id,
      state: "done",
      due_date: "2026-12-02",
    });
    await importSource(env.DB, p); // response lost after commit / retry
    await sql(
      env.DB,
      "UPDATE sources SET extract_state='pending' WHERE id=?",
      a.source_id,
    ).run();
    expect(await runExtraction(runtime())).toMatchObject({
      processed: 0,
      failed: 0,
    });
    expect(await sql(env.DB, "SELECT calls FROM usage").first()).toMatchObject({
      calls: 0,
    });
    expect(
      (await getTasks(env.DB, { contact_id: p.contact_id, state: "done" }))
        .items,
    ).toMatchObject([{ id: task.id, due_date: "2026-12-02" }]);
    expect(
      (await getTasks(env.DB, { contact_id: p.contact_id })).items,
    ).toHaveLength(0);
  });

  it("rolls back the entire candidate batch after a real D1 constraint failure and resumes the same source", async () => {
    const p = await fixture();
    const broken = new Proxy(env.DB, {
      get(target, key) {
        if (key === "batch")
          return (statements: D1PreparedStatement[]) =>
            target.batch([
              ...statements.slice(0, -1),
              target.prepare("INSERT INTO tasks(id) VALUES('invalid-row')"),
              ...statements.slice(-1),
            ]);
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    await expect(importSource(broken, p)).rejects.toThrow();
    expect(
      (await getMemory(env.DB, { contact_id: p.contact_id })).items,
    ).toHaveLength(0);
    expect(
      (await getTasks(env.DB, { contact_id: p.contact_id })).items,
    ).toHaveLength(0);
    expect(
      await sql(
        env.DB,
        "SELECT skill_applied FROM sources WHERE contact_id=?",
        p.contact_id,
      ).first(),
    ).toMatchObject({ skill_applied: 0 });
    expect(await importSource(env.DB, p)).toMatchObject({
      application_state: "applied",
    });
    expect(
      (await getTasks(env.DB, { contact_id: p.contact_id })).items,
    ).toHaveLength(1);
  });

  it("does not transfer a preexisting automatic import to the Skill or apply its second batch", async () => {
    const p = await fixture(),
      { extraction: _, ...automatic } = p;
    const first = await importSource(env.DB, automatic);
    expect(await importSource(env.DB, p)).toMatchObject({
      source_id: first.source_id,
      extraction_owner: "backend",
      application_state: "automatic",
    });
    expect(
      (await getTasks(env.DB, { contact_id: p.contact_id })).items,
    ).toHaveLength(0);
    expect(await runExtraction(runtime(), 1)).toMatchObject({
      processed: 1,
      failed: 0,
    });
    expect(
      (await getTasks(env.DB, { contact_id: p.contact_id })).items,
    ).toHaveLength(1);
  });

  it("preserves the first producer when automatic and Skill imports race", async () => {
    const p = await fixture(),
      { extraction: _, ...automatic } = p;
    const [a, b] = await Promise.all([
      importSource(env.DB, automatic),
      importSource(env.DB, p),
    ]);
    expect(a.source_id).toBe(b.source_id);
    const stored = await sql(
      env.DB,
      "SELECT extraction_owner FROM sources WHERE id=?",
      a.source_id,
    ).first<{ extraction_owner: string }>();
    expect(a.extraction_owner).toBe(stored!.extraction_owner);
    expect(b.extraction_owner).toBe(stored!.extraction_owner);
    await importSource(env.DB, automatic);
    await importSource(env.DB, p);
    await runExtraction(runtime(), 1);
    expect(
      (await getTasks(env.DB, { contact_id: p.contact_id })).items,
    ).toHaveLength(1);
  });

  it("rejects expiry between source creation and batch commit without partial facts", async () => {
    const p = await fixture();
    const expiring = new Proxy(env.DB, {
      get(target, key) {
        if (key === "batch")
          return async (statements: D1PreparedStatement[]) => {
            await sql(
              target,
              "UPDATE sources SET expires_at=? WHERE contact_id=?",
              now() - 1,
              p.contact_id,
            ).run();
            return target.batch(statements);
          };
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    await expect(importSource(expiring, p)).rejects.toMatchObject({
      status: 409,
    });
    expect(
      (await getMemory(env.DB, { contact_id: p.contact_id })).items,
    ).toHaveLength(0);
    expect(
      (await getTasks(env.DB, { contact_id: p.contact_id })).items,
    ).toHaveLength(0);
    expect(
      await sql(
        env.DB,
        "SELECT skill_applied FROM sources WHERE contact_id=?",
        p.contact_id,
      ).first(),
    ).toMatchObject({ skill_applied: 0 });
  });

  it.each(["text", "date"])(
    "rejects a replay with different %s without attaching new candidates",
    async (field) => {
      const p = await fixture();
      await importSource(env.DB, p);
      await expect(
        importSource(env.DB, {
          ...p,
          ...(field === "text"
            ? { text: "Outro combinado" }
            : { occurred_at: p.occurred_at - DAY }),
        }),
      ).rejects.toMatchObject({ status: 409 });
      expect(
        (await getTasks(env.DB, { contact_id: p.contact_id })).items,
      ).toHaveLength(1);
    },
  );

  it("does not apply or resurrect a source outside retention", async () => {
    const p = await fixture();
    expect(
      await importSource(env.DB, { ...p, occurred_at: now() - 31 * DAY }),
    ).toMatchObject({
      source_available: false,
      application_state: "unavailable",
    });
    expect(
      (await getMemory(env.DB, { contact_id: p.contact_id })).items,
    ).toHaveLength(0);
    expect(
      (await getTasks(env.DB, { contact_id: p.contact_id })).items,
    ).toHaveLength(0);
  });

  it("validates the whole batch before writing any candidate", async () => {
    const p = await fixture();
    await expect(
      importSource(env.DB, {
        ...p,
        extraction: {
          ...p.extraction,
          tasks: [
            ...p.extraction.tasks,
            { subject: "Outro", reason: "Teste", due_date: "2026-02-30" },
          ],
        },
      }),
    ).rejects.toThrow();
    expect(
      (await getMemory(env.DB, { contact_id: p.contact_id })).items,
    ).toHaveLength(0);
    expect(
      (await getTasks(env.DB, { contact_id: p.contact_id })).items,
    ).toHaveLength(0);
  });
});
