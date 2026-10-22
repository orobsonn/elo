import { env } from "cloudflare:test";
import { it, expect, beforeEach, vi } from "vitest";
import {
  prepareAction,
  executeAction,
  cancelAction,
  getAction,
} from "../src/actions";
import { seal, sql } from "../src/core";
import type { AppEnv } from "../src/env";
import { configureConnection, getConnection } from "../src/zapi";
const e = env as AppEnv;
it("re-saving connection pauses sends, changes webhook and rejects the old approval even after re-enabling", async () => {
  const a = await prepareAction(e, {
    contact_id: "ct_mario", text: "Aprovação antiga",
  });
  const previous = await getConnection(e);
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    new Request(url, init);
    if (url.endsWith("/status")) return Response.json({ connected: true });
    if (url.endsWith("/device")) return Response.json({ phone: "5511999990001" });
    throw new Error("Unexpected provider call");
  }));
  try {
    const result = await configureConnection(e, {
      instance_id: "synthetic",
      instance_token: "synthetic-token",
      client_token: "synthetic-client",
    });
    const current = await getConnection(e);
    expect(result.connected).toBe(true);
    expect(current.sends_paused).toBe(1);
    expect(current.connection_generation).toBe(previous.connection_generation + 1);
    expect(current.credentials.webhook_key).not.toBe(
      previous.credentials.webhook_key,
    );
    await sql(e.DB, "UPDATE settings SET sends_paused=0 WHERE id=1").run();
    const send = vi.fn(async () => ({ messageId: "should-not-send" }));
    await expect(executeAction(
      e, { action_id: a.id, approved_hash: a.content_hash }, send,
    )).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});
beforeEach(async () => {
  await sql(
    e.DB,
    "INSERT OR IGNORE INTO contacts(id,alias,address,created_at) VALUES('ct_mario','Mario trilhas','5511999999999',?)",
    Date.now(),
  ).run();
  await sql(
    e.DB,
    "UPDATE settings SET connection_cipher=?,connection_generation=1,sends_paused=0 WHERE id=1",
    await seal(
      {
        instance_id: "synthetic",
        instance_token: "synthetic-token",
        client_token: "synthetic-client",
        webhook_key: "synthetic-webhook-abcdefghijklmnopqrstuvwxyz",
      },
      e.ENCRYPTION_KEY,
    ),
  ).run();
});
it("dois pedidos concorrentes consomem a intenção uma única vez no D1 real", async () => {
  const a = await prepareAction(e, {
    contact_id: "ct_mario",
    text: "Olá Mario",
  });
  const send = vi.fn(async () => ({ messageId: "private-provider-id" }));
  const results = await Promise.allSettled([
    executeAction(e, { action_id: a.id, approved_hash: a.content_hash }, send),
    executeAction(e, { action_id: a.id, approved_hash: a.content_hash }, send),
  ]);
  expect(send).toHaveBeenCalledTimes(1);
  expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
  expect((await getAction(e.DB, a.id)).status).toBe("accepted");
  expect(JSON.stringify(await getAction(e.DB, a.id))).not.toContain(
    "private-provider-id",
  );
});
it("timeout após possível aceite fica incerto sem reenvio por replay", async () => {
  const a = await prepareAction(e, {
    contact_id: "ct_mario",
    text: "Mensagem controlada",
  });
  const send = vi.fn(async () => {
    throw new Error("timeout contendo segredo não retornável");
  });
  expect(
    (
      await executeAction(
        e,
        { action_id: a.id, approved_hash: a.content_hash },
        send,
      )
    ).status,
  ).toBe("uncertain");
  await expect(
    executeAction(e, { action_id: a.id, approved_hash: a.content_hash }, send),
  ).rejects.toThrow("acao_indisponivel");
  expect(send).toHaveBeenCalledTimes(1);
});
it("cancelamento, expiração, alteração do endereço/instância e pause impedem envio", async () => {
  const send = vi.fn(async () => ({ messageId: "unused" }));
  const a = await prepareAction(e, { contact_id: "ct_mario", text: "A" });
  await cancelAction(e.DB, a.id);
  await expect(
    executeAction(e, { action_id: a.id, approved_hash: a.content_hash }, send),
  ).rejects.toThrow();
  const b = await prepareAction(e, { contact_id: "ct_mario", text: "B" });
  await sql(
    e.DB,
    "UPDATE contacts SET address_version=2 WHERE id=?",
    "ct_mario",
  ).run();
  await expect(
    executeAction(e, { action_id: b.id, approved_hash: b.content_hash }, send),
  ).rejects.toThrow();
  const c = await prepareAction(e, { contact_id: "ct_mario", text: "C" });
  await sql(e.DB, "UPDATE actions SET expires_at=0 WHERE id=?", c.id).run();
  await expect(
    executeAction(e, { action_id: c.id, approved_hash: c.content_hash }, send),
  ).rejects.toThrow();
  const d = await prepareAction(e, { contact_id: "ct_mario", text: "D" });
  await sql(e.DB, "UPDATE settings SET sends_paused=1 WHERE id=1").run();
  await expect(
    executeAction(e, { action_id: d.id, approved_hash: d.content_hash }, send),
  ).rejects.toThrow();
  expect(send).not.toHaveBeenCalled();
});
it("não configurado, anexos e injection não alteram permissão", async () => {
  await sql(
    e.DB,
    "UPDATE settings SET connection_cipher=NULL WHERE id=1",
  ).run();
  await expect(
    prepareAction(e, { contact_id: "ct_mario", text: "x" }),
  ).rejects.toThrow("whatsapp_nao_configurado");
  await expect(
    prepareAction(e, {
      contact_id: "ct_mario",
      text: "x",
      attachment: "https://private",
    } as never),
  ).rejects.toThrow();
});
it("reconcilia callback recebido antes da resposta do send sem perder entrega", async () => {
  const { ingest } = await import("../src/capture");
  const a = await prepareAction(e, {
    contact_id: "ct_mario",
    text: "Status cedo",
  });
  const send = async () => {
    await ingest(
      e.DB,
      {
        type: "MessageStatusCallback",
        ids: ["early-accept"],
        status: "RECEIVED",
        momment: Date.now(),
      },
      1,
    );
    return { messageId: "early-accept" };
  };
  expect(
    (
      await executeAction(
        e,
        { action_id: a.id, approved_hash: a.content_hash },
        send,
      )
    ).status,
  ).toBe("delivered");
});
it("preparo concorrente com exclusão não recria texto/endereço apagados", async () => {
  const { deleteContact } = await import("../src/operations");
  let intercepted = false;
  const db = new Proxy(e.DB, {
    get(target, property) {
      if (property === "batch")
        return async (statements: D1PreparedStatement[]) => {
          if (!intercepted) {
            intercepted = true;
            await deleteContact(
              target,
              "ct_mario",
              (env as AppEnv).ENCRYPTION_KEY,
            );
          }
          return target.batch(statements);
        };
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  await expect(
    prepareAction(
      { ...e, DB: db },
      { contact_id: "ct_mario", text: "conteúdo que precisa ser excluído" },
    ),
  ).rejects.toThrow();
  expect(
    (await sql(e.DB, "SELECT count(*) n FROM actions").first<{ n: number }>())!
      .n,
  ).toBe(0);
});
