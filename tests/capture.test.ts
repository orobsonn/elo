import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { ingest, listMessages, listContacts } from "../src/capture";
const time = Date.now();
const event = (phone: string, messageId: string, extra = {}) => ({
  instanceId: "synthetic-instance",
  phone,
  messageId,
  type: "ReceivedCallback",
  momment: time,
  text: { message: "Combinamos conversar em novembro." },
  fromMe: false,
  isGroup: false,
  ...extra,
});
describe("captura persistida e projeção", () => {
  it("mantém quatro Marios separados, deduplica e não retorna identificadores restritos", async () => {
    for (let n = 1; n <= 4; n++)
      await ingest(
        env.DB,
        event(`551100000000${n}`, `synthetic-${n}`, {
          senderName: "Mario Sobrenome",
        }),
        1,
      );
    await ingest(env.DB, event("5511000000001", "synthetic-1"), 1);
    const contacts = await listContacts(env.DB, {});
    expect(contacts.items).toHaveLength(4);
    expect(new Set(contacts.items.map((x) => x.id)).size).toBe(4);
    const page = await listMessages(env.DB, { limit: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.next_cursor).toBeTruthy();
    const second = await listMessages(env.DB, {
      limit: 2,
      cursor: page.next_cursor!,
    });
    expect(second.items).toHaveLength(2);
    expect(second.next_cursor).toBeNull();
    expect(JSON.stringify([contacts, page])).not.toMatch(
      /551100|Sobrenome|synthetic-|instanceId|provider_key|address/,
    );
  });
  it("status fora de ordem e replay não alteram dono da mensagem nem ressuscitam exclusão", async () => {
    await ingest(
      env.DB,
      event("5511999999999", "ordered", { fromMe: true }),
      1,
    );
    await ingest(
      env.DB,
      {
        type: "MessageStatusCallback",
        ids: ["ordered"],
        status: "READ",
        phone: "5511999999999",
        momment: time + 4,
      },
      1,
    );
    await ingest(
      env.DB,
      {
        type: "MessageStatusCallback",
        ids: ["ordered"],
        status: "SENT",
        phone: "5511999999999",
        momment: time + 3,
      },
      1,
    );
    const row = await env.DB.prepare(
      "SELECT status_rank FROM messages WHERE direction='out'",
    ).first<{ status_rank: number }>();
    expect(row?.status_rank).toBe(4);
    await ingest(
      env.DB,
      event("5511999999999", "ordered", {
        type: "ReceivedCallback",
        deleted: true,
        momment: time + 6,
      }),
      1,
    );
    await ingest(env.DB, event("5511999999999", "ordered"), 1);
    const p = await listMessages(env.DB, { direction: "out" });
    expect(p.items[0].text).toBeNull();
    expect(p.items[0].deleted).toBe(true);
  });
  it("corta histórico vencido e rejeita grupo/instante sem confiança", async () => {
    await ingest(
      env.DB,
      event("5511888888888", "old", {
        momment: time - 31 * 86400000,
        text: { message: "não persistir" },
      }),
      1,
    );
    await ingest(env.DB, event("5511888888888", "group", { isGroup: true }), 1);
    await expect(
      ingest(env.DB, event("5511888888888", "bad", { momment: undefined }), 1),
    ).rejects.toThrow("data_nao_confiavel");
    const p = await listMessages(env.DB, {});
    expect(JSON.stringify(p)).not.toContain("não persistir");
  });
});
it("preserva status antes do corpo e exclusão com o mesmo instante", async () => {
  await ingest(
    env.DB,
    {
      type: "MessageStatusCallback",
      ids: ["early-status"],
      status: "READ",
      phone: "5511777777777",
      momment: time,
    },
    1,
  );
  await ingest(
    env.DB,
    event("5511777777777", "early-status", { fromMe: true }),
    1,
  );
  let p = await listMessages(env.DB, { direction: "out" });
  expect(p.items[0].status).toBe(4);
  await ingest(
    env.DB,
    event("5511777777777", "early-status", { deleted: true }),
    1,
  );
  p = await listMessages(env.DB, { direction: "out" });
  expect(p.items[0].text).toBeNull();
  expect(p.items[0].deleted).toBe(true);
});
it("usa envelopes oficiais de edição, delivery e LID sem criar falas falsas", async () => {
  await ingest(
    env.DB,
    event("887766554433221@lid", "lid", { chatLid: "887766554433221@lid" }),
    1,
  );
  await ingest(
    env.DB,
    event("887766554433221@lid", "lid", {
      chatLid: "887766554433221@lid",
      isEdit: true,
      momment: time + 10,
      text: { message: "Versão corrigida" },
    }),
    1,
  );
  await ingest(
    env.DB,
    {
      type: "DeliveryCallback",
      instanceId: "synthetic-instance",
      phone: "887766554433221@lid",
      messageId: "delivery",
      momment: time,
      error: null,
    },
    1,
  );
  const p = await listMessages(env.DB, {});
  expect(p.items).toHaveLength(1);
  expect(p.items[0].text).toBe("Versão corrigida");
  expect(JSON.stringify(p)).not.toContain("@lid");
});
it("corrida real receive/delete não ressuscita conteúdo excluído", async () => {
  for (let n = 0; n < 8; n++)
    await Promise.all([
      ingest(env.DB, event("5511666666666", `race-${n}`), 1),
      ingest(env.DB, event("5511666666666", `race-${n}`, { deleted: true }), 1),
    ]);
  const p = await listMessages(env.DB, {});
  expect(p.items.every((x) => x.text === null && x.deleted)).toBe(true);
});
it("replay em voo não recria endereço após exclusão do contato", async () => {
  const { deleteContact } = await import("../src/operations");
  let intercepted = false;
  const payload = event("5511555555555", "owner-delete-race");
  const db = new Proxy(env.DB, {
    get(target, property) {
      if (property === "batch")
        return async (statements: D1PreparedStatement[]) => {
          if (!intercepted) {
            intercepted = true;
            await ingest(target, payload, 1);
            const c = await target
              .prepare("SELECT id FROM contacts WHERE address=?")
              .bind("5511555555555")
              .first<{ id: string }>();
            await deleteContact(target, c!.id);
          }
          return target.batch(statements);
        };
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  await ingest(db, payload, 1);
  expect(
    (await env.DB.prepare(
      "SELECT count(*) n FROM contacts WHERE deleted=0",
    ).first<{ n: number }>())!.n,
  ).toBe(0);
});
