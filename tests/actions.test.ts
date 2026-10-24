import { env } from "cloudflare:test";
import { it, expect, beforeEach, vi } from "vitest";
import {
  prepareAction as rawPrepareAction,
  executeAction,
  cancelAction,
  getAction,
} from "../src/actions";
import { seal, sql } from "../src/core";
import type { AppEnv } from "../src/env";
import { configureConnection, getConnection } from "../src/zapi";
const e = env as AppEnv;
// Existing fixtures represent explicit send requests. Production input must name intent.
const prepareAction = (env: AppEnv, input: Record<string, unknown>) =>
  rawPrepareAction(env, { intent: "send_now", ...input });
it("re-saving connection pauses sends, changes webhook and rejects the old approval even after re-enabling", async () => {
  const a = await prepareAction(e, {
    contact_id: "ct_mario",
    text: "Aprovação antiga",
  });
  const previous = await getConnection(e);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      new Request(url, init);
      if (url.endsWith("/status")) return Response.json({ connected: true });
      if (url.endsWith("/device"))
        return Response.json({ phone: "5511999990001" });
      throw new Error("Unexpected provider call");
    }),
  );
  try {
    const result = await configureConnection(e, {
      instance_id: "synthetic",
      instance_token: "synthetic-token",
      client_token: "synthetic-client",
    });
    const current = await getConnection(e);
    expect(result.connected).toBe(true);
    expect(current.sends_paused).toBe(1);
    expect(current.connection_generation).toBe(
      previous.connection_generation + 1,
    );
    expect(current.credentials.webhook_key).not.toBe(
      previous.credentials.webhook_key,
    );
    await sql(e.DB, "UPDATE settings SET sends_paused=0 WHERE id=1").run();
    const send = vi.fn(async () => ({ messageId: "should-not-send" }));
    await expect(
      executeAction(
        e,
        { action_id: a.id, approved_hash: a.content_hash },
        send,
      ),
    ).rejects.toThrow();
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
it("reuses the same immutable proposal for repeated preparation and cannot clone an uncertain attempt", async () => {
  const input = { contact_id: "ct_mario", text: "Texto já autorizado" };
  const [a, b] = await Promise.all([
    prepareAction(e, input),
    prepareAction(e, input),
  ]);
  expect(a.id).toBe(b.id);
  const send = vi.fn(async () => {
    throw new Error("timeout");
  });
  await executeAction(
    e,
    { action_id: a.id, approved_hash: a.content_hash },
    send,
  );
  const retry = await prepareAction(e, input);
  expect(retry.id).toBe(a.id);
  expect(retry.status).toBe("uncertain");
  await expect(
    executeAction(
      e,
      { action_id: retry.id, approved_hash: retry.content_hash },
      send,
    ),
  ).rejects.toThrow();
  expect(send).toHaveBeenCalledTimes(1);
});
it("binds approval to exact text and recipient even when both proposals have the same text", async () => {
  const a = await prepareAction(e, {
    contact_id: "ct_mario",
    text: "Original",
  });
  const changed = await prepareAction(e, {
    contact_id: "ct_mario",
    text: "Alterado",
  });
  const send = vi.fn(async () => ({ messageId: "unused" }));
  await expect(
    executeAction(
      e,
      { action_id: changed.id, approved_hash: a.content_hash },
      send,
    ),
  ).rejects.toThrow();
  expect(send).not.toHaveBeenCalled();
});
it("cannot apply another recipient's approval hash even with identical message text", async () => {
  await sql(
    e.DB,
    "INSERT INTO contacts(id,alias,address,created_at) VALUES('ct_other','Outro Mario','5511999990002',?)",
    Date.now(),
  ).run();
  const a = await prepareAction(e, {
    contact_id: "ct_mario",
    text: "Mesmo texto",
  });
  const other = await prepareAction(e, {
    contact_id: "ct_other",
    text: "Mesmo texto",
  });
  const send = vi.fn(async () => ({ messageId: "unused" }));
  await expect(
    executeAction(
      e,
      { action_id: other.id, approved_hash: a.content_hash },
      send,
    ),
  ).rejects.toThrow();
  expect(send).not.toHaveBeenCalled();
});
it("can prepare a valid proposal after the owner changes a contact alias", async () => {
  const a = await prepareAction(e, { contact_id: "ct_mario", text: "Texto" });
  const { toolset } = await import("../src/mcp");
  await toolset(e)
    .get("contact_update")!
    .call({ contact_id: "ct_mario", alias: "Mario novo" });
  const b = await prepareAction(e, { contact_id: "ct_mario", text: "Texto" });
  expect(b.id).not.toBe(a.id);
  expect(b.alias).toBe("Mario novo");
  const send = vi.fn(async () => ({ messageId: "synthetic-new-alias" }));
  expect(
    (
      await executeAction(
        e,
        { action_id: b.id, approved_hash: b.content_hash },
        send,
      )
    ).status,
  ).toBe("accepted");
});
it("does not clone an action accepted after duplicate preparation preflight", async () => {
  let fired = false;
  const send = vi.fn(async () => ({ messageId: "synthetic-race-accept" }));
  const db = new Proxy(e.DB, {
    get(target, prop) {
      if (prop === "batch")
        return async (statements: D1PreparedStatement[]) => {
          if (!fired) {
            fired = true;
            const first = await prepareAction(e, {
              contact_id: "ct_mario",
              text: "Corrida",
            });
            await executeAction(
              e,
              { action_id: first.id, approved_hash: first.content_hash },
              send,
            );
          }
          return target.batch(statements);
        };
      const value = Reflect.get(target, prop);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const retry = await prepareAction(
    { ...e, DB: db },
    { contact_id: "ct_mario", text: "Corrida" },
  );
  expect(retry.status).toBe("accepted");
  expect(
    (await sql(e.DB, "SELECT count(*) n FROM actions").first<any>())!.n,
  ).toBe(1);
  expect(send).toHaveBeenCalledTimes(1);
});

it("prepares AI-written text for immediate execution on the owner's send request", async () => {
  const action = await prepareAction(e, {
    contact_id: "ct_mario",
    text: "Redação da IA para o pedido de envio",
  });
  expect(action.status).toBe("prepared");
  expect(action.review_required).toBe(false);
  expect(action.next_step).toBe("execute");
  const send = vi.fn(async () => ({ messageId: "synthetic-direct" }));
  expect(
    (
      await executeAction(
        e,
        { action_id: action.id, approved_hash: action.content_hash },
        send,
      )
    ).status,
  ).toBe("accepted");
  expect(send).toHaveBeenCalledTimes(1);
});
it("holds an explicitly requested preview until one review confirmation", async () => {
  const action = await prepareAction(e, {
    contact_id: "ct_mario",
    text: "Prévia da IA",
    intent: "preview",
  });
  expect(action.review_required).toBe(true);
  expect(action.next_step).toBe("await_review");
  const send = vi.fn(async () => ({ messageId: "synthetic-reviewed" }));
  await expect(
    executeAction(
      e,
      { action_id: action.id, approved_hash: action.content_hash },
      send,
    ),
  ).rejects.toThrow();
  expect(send).not.toHaveBeenCalled();
  expect(
    (
      await executeAction(
        e,
        {
          action_id: action.id,
          approved_hash: action.content_hash,
          review_confirmed: true,
        },
        send,
      )
    ).status,
  ).toBe("accepted");
  await expect(
    executeAction(
      e,
      {
        action_id: action.id,
        approved_hash: action.content_hash,
        review_confirmed: true,
      },
      send,
    ),
  ).rejects.toThrow();
  expect(send).toHaveBeenCalledTimes(1);
});
it("does not downgrade a preview by preparing the same content with the default mode", async () => {
  const preview = await prepareAction(e, {
    contact_id: "ct_mario",
    text: "Só após minha revisão",
    intent: "preview",
  });
  const again = await prepareAction(e, {
    contact_id: "ct_mario",
    text: "Só após minha revisão",
  });
  expect(again.id).toBe(preview.id);
  expect(again.review_required).toBe(true);
  expect(again.next_step).toBe("await_review");
});
it("can put a prepared request on hold without allowing a stale direct execution", async () => {
  const ready = await prepareAction(e, {
    contact_id: "ct_mario",
    text: "Espere minha revisão",
  });
  const held = await prepareAction(e, {
    contact_id: "ct_mario",
    text: "Espere minha revisão",
    intent: "preview",
  });
  expect(held.id).toBe(ready.id);
  expect(held.review_required).toBe(true);
  expect(held.content_hash).not.toBe(ready.content_hash);
  const send = vi.fn(async () => ({ messageId: "unused" }));
  await expect(
    executeAction(
      e,
      { action_id: ready.id, approved_hash: ready.content_hash },
      send,
    ),
  ).rejects.toThrow();
  expect(send).not.toHaveBeenCalled();
});
it("keeps an uncertain attempt even if the caller changes review mode", async () => {
  const ready = await prepareAction(e, {
    contact_id: "ct_mario",
    text: "Incerto",
  });
  const send = vi.fn(async () => {
    throw new Error("timeout");
  });
  await executeAction(
    e,
    { action_id: ready.id, approved_hash: ready.content_hash },
    send,
  );
  const again = await prepareAction(e, {
    contact_id: "ct_mario",
    text: "Incerto",
    intent: "preview",
  });
  expect(again.id).toBe(ready.id);
  expect(again.next_step).toBe("check_result");
  await expect(
    executeAction(
      e,
      {
        action_id: again.id,
        approved_hash: again.content_hash,
        review_confirmed: true,
      },
      send,
    ),
  ).rejects.toThrow();
  expect(send).toHaveBeenCalledTimes(1);
});

it("refuses a prepare call without an explicit intent", async () => {
  await expect(
    rawPrepareAction(e, {
      contact_id: "ct_mario",
      text: "Sem pedido de envio",
    }),
  ).rejects.toThrow();
});
it("concurrent send and preview preparations share one action and retain review", async () => {
  const [direct, preview] = await Promise.all([
    prepareAction(e, {
      contact_id: "ct_mario",
      text: "Concorrente",
      intent: "send_now",
    }),
    prepareAction(e, {
      contact_id: "ct_mario",
      text: "Concorrente",
      intent: "preview",
    }),
  ]);
  expect(direct.id).toBe(preview.id);
  const current = await getAction(e.DB, direct.id);
  expect(current.review_required).toBe(true);
  expect(current.next_step).toBe("await_review");
});
it("does not bypass an uncertain attempt by redrafting different text for the same contact", async () => {
  const a = await prepareAction(e, {
    contact_id: "ct_mario",
    text: "Versão inicial",
  });
  const send = vi.fn(async () => {
    throw new Error("timeout");
  });
  await executeAction(
    e,
    { action_id: a.id, approved_hash: a.content_hash },
    send,
  );
  const redrafted = await prepareAction(e, {
    contact_id: "ct_mario",
    text: "Texto reescrito após timeout",
  });
  expect(redrafted.id).toBe(a.id);
  expect(redrafted.next_step).toBe("check_result");
  await expect(
    executeAction(
      e,
      { action_id: redrafted.id, approved_hash: redrafted.content_hash },
      send,
    ),
  ).rejects.toThrow();
  expect(send).toHaveBeenCalledTimes(1);
});
