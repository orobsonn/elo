import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { DAY, id, now, sql } from "../src/core";
import { runExtraction, extractionSchema } from "../src/extraction";
import type { AppEnv } from "../src/env";
async function source() {
  const c = id("ct"),
    s = id("src");
  await sql(
    env.DB,
    "INSERT INTO contacts(id,alias,created_at) VALUES(?,?,?)",
    c,
    "Mario leitura",
    now(),
  ).run();
  await sql(
    env.DB,
    "INSERT INTO sources(id,contact_id,dedup_key,kind,occurred_at,received_at,expires_at,content) VALUES(?,?,?,'meeting',?,?,?,'Pretendo viajar em novembro.')",
    s,
    c,
    s,
    now(),
    now(),
    now() + 30 * DAY,
  ).run();
  return { c, s };
}
function runtime(run: (model: string, input: any) => Promise<any>) {
  return {
    ...env,
    AI_ENABLED: "true",
    AI_MODEL: "@cf/deepseek-ai/deepseek-v4-flash-0731",
    AI: { run },
  } as unknown as AppEnv;
}
function output(c: string, s: string) {
  return {
    contact_id: c,
    source_id: s,
    facts: [
      {
        field: "goals",
        value: "Viajar em novembro",
        certainty: "explicit",
        evidence: "Pretendo viajar em novembro.",
      },
    ],
    tasks: [],
  };
}
beforeEach(async () => {
  await sql(env.DB, "DELETE FROM usage").run();
  await sql(env.DB, "UPDATE sources SET extract_state='done'").run();
});
describe("bounded incremental extraction", () => {
  it.each(["fact", "task"] as const)(
    "rejects a structurally valid %s citing only a previous source without partial writes",
    async (kind) => {
      const prior = await source();
      await sql(
        env.DB,
        "UPDATE sources SET content='Prefiro encontros pela manhã. Vou revisar a proposta.',extract_state='done' WHERE id=?",
        prior.s,
      ).run();
      const current = id("src"),
        text = "Pretendo viajar em novembro. Vou enviar os documentos.";
      await sql(
        env.DB,
        "INSERT INTO sources(id,contact_id,dedup_key,kind,occurred_at,received_at,expires_at,content) VALUES(?,?,?,'meeting',?,?,?,?)",
        current,
        prior.c,
        current,
        now(),
        now(),
        now() + 30 * DAY,
        text,
      ).run();
      const validTask = {
        subject: "Enviar documentos",
        reason: "Compromisso explícito",
        due_date: null,
        evidence: "Vou enviar os documentos.",
      };
      const response = {
        ...output(prior.c, current),
        facts:
          kind === "fact"
            ? [
                ...output(prior.c, current).facts,
                {
                  field: "preferences",
                  value: "Prefere manhã",
                  certainty: "explicit",
                  evidence: "Prefiro encontros pela manhã.",
                },
              ]
            : output(prior.c, current).facts,
        tasks:
          kind === "task"
            ? [
                validTask,
                {
                  subject: "Revisar proposta",
                  reason: "Compromisso anterior",
                  due_date: null,
                  evidence: "Vou revisar a proposta.",
                },
              ]
            : [validTask],
      };
      expect(extractionSchema.safeParse(response).success).toBe(true);
      const result = await runExtraction(
        runtime(async (_m, input) => {
          expect(JSON.stringify(input)).toContain("Prefiro encontros");
          return { response: JSON.stringify(response) };
        }),
        1,
      );
      expect(result).toMatchObject({ processed: 0, failed: 1 });
      expect(
        await sql(
          env.DB,
          "SELECT COUNT(*) n FROM memory WHERE contact_id=?",
          prior.c,
        ).first(),
      ).toMatchObject({ n: 0 });
      expect(
        await sql(
          env.DB,
          "SELECT COUNT(*) n FROM tasks WHERE contact_id=?",
          prior.c,
        ).first(),
      ).toMatchObject({ n: 0 });
      expect(
        await sql(
          env.DB,
          "SELECT extract_state,attempts,content FROM sources WHERE id=?",
          current,
        ).first(),
      ).toMatchObject({ extract_state: "pending", attempts: 1, content: text });
    },
  );
  it("accepts current-source evidence with whitespace normalization and strips it before shared strict parsers", async () => {
    const { c, s } = await source();
    await sql(
      env.DB,
      "UPDATE sources SET content=? WHERE id=?",
      "Pretendo \n viajar\t em novembro. Vou enviar os documentos.",
      s,
    ).run();
    const response = {
      ...output(c, s),
      tasks: [
        {
          subject: "Enviar documentos",
          reason: "Compromisso explícito",
          due_date: null,
          evidence: "Vou enviar  os\n documentos.",
        },
      ],
    };
    const result = await runExtraction(
      runtime(async () => ({
        choices: [{ message: { content: JSON.stringify(response) } }],
      })),
      1,
    );
    expect(result).toMatchObject({ processed: 1, failed: 0 });
    expect(
      await sql(
        env.DB,
        "SELECT value,state FROM memory WHERE source_id=?",
        s,
      ).first(),
    ).toMatchObject({ value: "Viajar em novembro", state: "confirmed" });
    expect(
      await sql(
        env.DB,
        "SELECT subject,state FROM tasks WHERE source_id=?",
        s,
      ).first(),
    ).toMatchObject({ subject: "Enviar documentos", state: "open" });
  });
  it.each([undefined, "", "  \n", "pretendo viajar em novembro."])(
    "rejects missing, empty, whitespace-only or nonliteral evidence (%s)",
    async (evidence) => {
      const { c, s } = await source();
      const response = output(c, s);
      const fact: Record<string, unknown> = { ...response.facts[0] };
      if (evidence === undefined) delete fact.evidence;
      else fact.evidence = evidence;
      const result = await runExtraction(
        runtime(async () => ({
          response: JSON.stringify({ ...response, facts: [fact] }),
        })),
        1,
      );
      expect(result).toMatchObject({ processed: 0, failed: 1 });
      expect(
        await sql(
          env.DB,
          "SELECT COUNT(*) n FROM memory WHERE source_id=?",
          s,
        ).first(),
      ).toMatchObject({ n: 0 });
    },
  );

  it("includes message direction and never auto-confirms the consultant own statement as a contact fact", async () => {
    const inbound = await source(),
      outbound = await source();
    for (const [j, direction] of [
      [inbound, "in"],
      [outbound, "out"],
    ] as const) {
      await sql(
        env.DB,
        "UPDATE sources SET kind='message',content='Tenho dois filhos' WHERE id=?",
        j.s,
      ).run();
      await sql(
        env.DB,
        "INSERT INTO messages(id,source_id,provider_key,contact_id,direction,kind,mutation_at) VALUES(?,?,?,?,?,'text',?)",
        id("msg"),
        j.s,
        j.s,
        j.c,
        direction,
        now(),
      ).run();
    }
    await runExtraction(
      runtime(async (_m, p) => {
        const context = JSON.parse(p.messages[1].content);
        expect(context.source_direction).toBe(
          context.source_id === inbound.s ? "in" : "out",
        );
        return {
          response: JSON.stringify({
            ...output(context.contact_id, context.source_id),
            facts: [
              {
                field: "context",
                value: "Tem dois filhos",
                certainty: "explicit",
                evidence: "Tenho dois filhos",
              },
            ],
          }),
        };
      }),
      2,
    );
    expect(
      await sql(
        env.DB,
        "SELECT state FROM memory WHERE source_id=?",
        inbound.s,
      ).first(),
    ).toMatchObject({ state: "confirmed" });
    expect(
      await sql(
        env.DB,
        "SELECT state FROM memory WHERE source_id=?",
        outbound.s,
      ).first(),
    ).toMatchObject({ state: "pending" });
  });

  it("does not resurrect data deleted during inference", async () => {
    const { c, s } = await source();
    await runExtraction(
      runtime(async () => {
        await sql(
          env.DB,
          "UPDATE contacts SET deleted=1,generation=generation+1 WHERE id=?",
          c,
        ).run();
        return { response: JSON.stringify(output(c, s)) };
      }),
      1,
    );
    expect(
      await sql(
        env.DB,
        "SELECT COUNT(*) n FROM memory WHERE source_id=?",
        s,
      ).first(),
    ).toMatchObject({ n: 0 });
  });
  it("does not retain raw or derived output after its source expires during inference", async () => {
    const { c, s } = await source();
    await runExtraction(
      runtime(async () => {
        await sql(
          env.DB,
          "UPDATE sources SET expires_at=? WHERE id=?",
          now() - DAY,
          s,
        ).run();
        return { response: JSON.stringify(output(c, s)) };
      }),
      1,
    );
    expect(
      await sql(
        env.DB,
        "SELECT COUNT(*) n FROM memory WHERE source_id=?",
        s,
      ).first(),
    ).toMatchObject({ n: 0 });
    expect(
      await sql(
        env.DB,
        "SELECT extract_state FROM sources WHERE id=?",
        s,
      ).first(),
    ).toMatchObject({ extract_state: "done" });
  });
  it("limits concurrent budget reservations at the boundary and ignores invalid usage numbers", async () => {
    const a = await source(),
      b = await source();
    await sql(
      env.DB,
      "INSERT INTO usage(day,calls) VALUES(?,49)",
      new Date().toISOString().slice(0, 10),
    ).run();
    const ai = runtime(async (_m, input) => {
      const p = JSON.parse(input.messages[1].content);
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                ...output(p.contact_id, p.source_id),
                facts: [],
              }),
            },
          },
        ],
        usage: { prompt_tokens: -1, completion_tokens: Infinity },
      };
    });
    await Promise.all([runExtraction(ai, 1), runExtraction(ai, 1)]);
    expect(
      await sql(
        env.DB,
        "SELECT calls,input_tokens,output_tokens FROM usage",
      ).first(),
    ).toMatchObject({ calls: 50, input_tokens: 0, output_tokens: 0 });
    expect(
      await sql(
        env.DB,
        "SELECT COUNT(*) n FROM sources WHERE extract_state='done' AND id IN (?,?)",
        a.s,
        b.s,
      ).first(),
    ).toMatchObject({ n: 1 });
  });
  it("writes nothing when a later candidate violates the field allowlist", async () => {
    const { c, s } = await source();
    await runExtraction(
      runtime(async () => ({
        response: JSON.stringify({
          ...output(c, s),
          facts: [
            ...output(c, s).facts,
            {
              field: "email",
              value: "restricted",
              certainty: "explicit",
              evidence: "Pretendo viajar em novembro.",
            },
          ],
        }),
      })),
      1,
    );
    expect(
      await sql(
        env.DB,
        "SELECT COUNT(*) n FROM memory WHERE source_id=?",
        s,
      ).first(),
    ).toMatchObject({ n: 0 });
    expect(
      await sql(env.DB, "SELECT failures FROM usage").first(),
    ).toMatchObject({ failures: 1 });
  });

  it("keeps a truncated DeepSeek reasoning-only result pending without writing memory", async () => {
    const { c, s } = await source();
    const result = await runExtraction(
      runtime(async () => ({
        choices: [
          {
            finish_reason: "length",
            message: { content: "", reasoning_content: "synthetic reasoning" },
          },
        ],
        usage: { prompt_tokens: 485, completion_tokens: 1600 },
      })),
      1,
    );
    expect(result.failed).toBe(1);
    expect(
      await sql(
        env.DB,
        "SELECT count(*) n FROM memory WHERE contact_id=?",
        c,
      ).first(),
    ).toMatchObject({ n: 0 });
    expect(
      await sql(
        env.DB,
        "SELECT extract_state,attempts FROM sources WHERE id=?",
        s,
      ).first(),
    ).toMatchObject({ extract_state: "pending", attempts: 1 });
  });

  it("accepts DeepSeek OpenAI responses and writes validated source-bound facts", async () => {
    const { c, s } = await source();
    await runExtraction(
      runtime(async () => ({
        choices: [{ message: { content: JSON.stringify(output(c, s)) } }],
        usage: { prompt_tokens: 100, completion_tokens: 20 },
      })),
      1,
    );
    expect(
      await sql(
        env.DB,
        "SELECT value,state FROM memory WHERE source_id=?",
        s,
      ).first(),
    ).toMatchObject({ value: "Viajar em novembro", state: "confirmed" });
    expect(
      await sql(
        env.DB,
        "SELECT calls,input_tokens,output_tokens FROM usage",
      ).first(),
    ).toMatchObject({ calls: 1, input_tokens: 100, output_tokens: 20 });
  });
  it("rejects a cross-contact response and invalid extra fields without partial writes", async () => {
    const { c, s } = await source();
    await runExtraction(
      runtime(async () => ({
        response: JSON.stringify({
          ...output("ct_other", s),
          facts: [
            ...output(c, s).facts,
            {
              field: "email",
              value: "bad@example.test",
              certainty: "explicit",
              evidence: "Pretendo viajar em novembro.",
            },
          ],
        }),
      })),
      1,
    );
    expect(
      await sql(
        env.DB,
        "SELECT COUNT(*) n FROM memory WHERE source_id=?",
        s,
      ).first(),
    ).toMatchObject({ n: 0 });
    expect(
      await sql(
        env.DB,
        "SELECT extract_state,attempts FROM sources WHERE id=?",
        s,
      ).first(),
    ).toMatchObject({ extract_state: "pending", attempts: 1 });
  });
  it("fences writes when the message changes during inference", async () => {
    const { c, s } = await source();
    await runExtraction(
      runtime(async () => {
        await sql(
          env.DB,
          "UPDATE sources SET version=version+1,content=? WHERE id=?",
          "Texto corrigido",
          s,
        ).run();
        return { response: JSON.stringify(output(c, s)) };
      }),
      1,
    );
    expect(
      await sql(
        env.DB,
        "SELECT COUNT(*) n FROM memory WHERE source_id=?",
        s,
      ).first(),
    ).toMatchObject({ n: 0 });
    expect(
      await sql(
        env.DB,
        "SELECT extract_state FROM sources WHERE id=?",
        s,
      ).first(),
    ).toMatchObject({ extract_state: "pending" });
  });
  it("limits context to this contact and includes confirmed memory with incremental prior sources", async () => {
    const first = await source(),
      other = await source();
    await sql(
      env.DB,
      "UPDATE sources SET extract_state='done' WHERE id IN (?,?)",
      first.s,
      other.s,
    ).run();
    await sql(
      env.DB,
      "UPDATE sources SET content=? WHERE id=?",
      "PRIVATE OTHER CONTACT",
      other.s,
    ).run();
    const s = id("src");
    await sql(
      env.DB,
      "INSERT INTO sources(id,contact_id,dedup_key,kind,occurred_at,received_at,expires_at,content) VALUES(?,?,?,'message',?,?,?,'Novembro foi confirmado.')",
      s,
      first.c,
      s,
      now(),
      now(),
      now() + 30 * DAY,
    ).run();
    await runExtraction(
      runtime(async (_m, p) => {
        const text = JSON.stringify(p);
        expect(text).toContain("Pretendo viajar");
        expect(text).not.toContain("PRIVATE OTHER CONTACT");
        return {
          response: JSON.stringify({
            contact_id: first.c,
            source_id: s,
            facts: [],
            tasks: [],
          }),
        };
      }),
      1,
    );
    expect(
      await sql(
        env.DB,
        "SELECT extract_state FROM sources WHERE id=?",
        s,
      ).first(),
    ).toMatchObject({ extract_state: "done" });
  });
  it("reserves the daily budget atomically and does not call the provider above fifty calls", async () => {
    const { s } = await source();
    await sql(
      env.DB,
      "INSERT INTO usage(day,calls) VALUES(?,50)",
      new Date().toISOString().slice(0, 10),
    ).run();
    await runExtraction(
      runtime(async () => {
        throw new Error("provider must not run");
      }),
      1,
    );
    expect(
      await sql(env.DB, "SELECT attempts FROM sources WHERE id=?", s).first(),
    ).toMatchObject({ attempts: 0 });
    expect(await sql(env.DB, "SELECT calls FROM usage").first()).toMatchObject({
      calls: 50,
    });
  });
  it("reclaims an abandoned lease and caps attempts at three", async () => {
    const { s } = await source();
    await sql(
      env.DB,
      "UPDATE sources SET extract_state='processing',lease='old',lease_until=?,attempts=2 WHERE id=?",
      now() - DAY,
      s,
    ).run();
    await runExtraction(
      runtime(async () => {
        throw new Error("synthetic unavailable");
      }),
      1,
    );
    expect(
      await sql(
        env.DB,
        "SELECT extract_state,attempts,safe_error FROM sources WHERE id=?",
        s,
      ).first(),
    ).toMatchObject({
      extract_state: "failed",
      attempts: 3,
      safe_error: "extraction_failed",
    });
    expect(
      await sql(env.DB, "SELECT failures FROM usage").first(),
    ).toMatchObject({ failures: 1 });
  });
});
