import { env } from "cloudflare:test";
import { expect, it } from "vitest";
import { associateContact } from "../src/identity";
import { createContact, ingest, listMessages } from "../src/capture";
import { sql, DAY, id } from "../src/core";
import {
  importSource,
  sourceFence,
  memoryStatement,
  writeMemory,
  writeTask,
  writeDate,
} from "../src/memory";
import { deleteContact } from "../src/operations";

const confirm = "associar_contatos_selecionados" as const;
async function fixture() {
  await ingest(
    env.DB,
    {
      type: "ReceivedCallback",
      phone: "5511999999999",
      messageId: "identity-first",
      momment: Date.now(),
      text: { message: "Prefiro encontros pela manhã" },
    },
    1,
  );
  const source = (await sql(
    env.DB,
    "SELECT id FROM contacts WHERE address IS NOT NULL",
  ).first<{ id: string }>())!.id;
  const target = (await createContact(env.DB, "Mario trilhas")).id;
  const sid = (await sql(
    env.DB,
    "SELECT id FROM sources WHERE contact_id=?",
    source,
  ).first<{ id: string }>())!.id;
  return { source, target, sid };
}
function link(source: string, target: string) {
  return associateContact(env.DB, {
    provisional_id: source,
    target_id: target,
    confirm,
  });
}

it("associa por IDs e conserva ficha, proveniência e memória pendente sem sobrescrever fato confirmado", async () => {
  const { source, target, sid } = await fixture();
  await writeMemory(env.DB, {
    contact_id: source,
    source_id: sid,
    field: "preferences",
    value: "Prefere manhã",
    certainty: "explicit",
  });
  const imported = await importSource(env.DB, {
    contact_id: target,
    source_key: "target",
    kind: "note",
    occurred_at: Date.now(),
    text: "Prefere tarde",
  });
  await writeMemory(env.DB, {
    contact_id: target,
    source_id: imported.source_id,
    field: "preferences",
    value: "Prefere tarde",
    certainty: "explicit",
  });
  await writeTask(env.DB, {
    contact_id: source,
    source_id: sid,
    subject: "Agendar encontro",
    reason: "Pedido",
    due_date: null,
  });
  await writeDate(env.DB, {
    contact_id: source,
    relation: "self",
    label: "Aniversário",
    month: 2,
    day: 29,
    leap_policy: "mar01",
  });
  const result = await link(source, target);
  expect(result).toMatchObject({
    associated: true,
    contact_id: target,
    alias: "Mario trilhas",
  });
  expect(JSON.stringify(result)).not.toMatch(/5511999999999|address|@lid/);
  const contacts = (
    await sql(
      env.DB,
      "SELECT id,deleted,address,address_version,generation FROM contacts ORDER BY id",
    ).all<{
      id: string;
      deleted: number;
      address: string | null;
      address_version: number;
      generation: number;
    }>()
  ).results;
  expect(contacts.find((c) => c.id === source)).toMatchObject({
    deleted: 1,
    address: null,
    address_version: 2,
    generation: 2,
  });
  expect(contacts.find((c) => c.id === target)).toMatchObject({
    deleted: 0,
    address: "5511999999999",
    address_version: 2,
    generation: 2,
  });
  const facts = (
    await sql(
      env.DB,
      "SELECT contact_id,value,state,needs_review,confirmed_at FROM memory ORDER BY value",
    ).all()
  ).results;
  expect(facts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        contact_id: target,
        value: "Prefere manhã",
        state: "pending",
        needs_review: 1,
        confirmed_at: null,
      }),
      expect.objectContaining({
        contact_id: target,
        value: "Prefere tarde",
        state: "confirmed",
        needs_review: 0,
      }),
    ]),
  );
  for (const table of ["sources", "messages", "tasks", "special_dates"])
    expect(
      (await sql(
        env.DB,
        `SELECT COUNT(*) n FROM ${table} WHERE contact_id=?`,
        source,
      ).first<{ n: number }>())!.n,
    ).toBe(0);
  expect(
    await sql(
      env.DB,
      "SELECT identity_review_required FROM sources WHERE id=?",
      sid,
    ).first(),
  ).toEqual({ identity_review_required: 1 });
  expect(
    (await listMessages(env.DB, { contact_id: target })).items,
  ).toHaveLength(1);
  await ingest(
    env.DB,
    {
      type: "ReceivedCallback",
      phone: "5511999999999",
      messageId: "identity-next",
      momment: Date.now(),
      text: { message: "Novo recado" },
    },
    1,
  );
  expect(
    (await listMessages(env.DB, { contact_id: target })).items,
  ).toHaveLength(2);
});

it("exige confirmação explícita e IDs internos sem fusão por nome ou endereço bruto", async () => {
  const { source, target } = await fixture();
  for (const input of [
    { provisional_id: source, target_id: target },
    { provisional_id: source, target_id: target, confirm: "sim" },
    { provisional_id: "5511999999999", target_id: target, confirm },
    {
      provisional_id: source,
      target_id: target,
      confirm,
      address: "5511999999999",
    },
  ])
    await expect(associateContact(env.DB, input)).rejects.toMatchObject({
      code: "entrada_invalida",
    });
  await expect(link(source, source)).rejects.toMatchObject({
    code: "associacao_invalida",
  });
  const other = (await createContact(env.DB, "Mario trilhas")).id;
  await sql(
    env.DB,
    "UPDATE contacts SET address=? WHERE id=?",
    "5511888888888",
    other,
  ).run();
  await expect(link(source, other)).rejects.toMatchObject({
    code: "associacao_indisponivel_ou_alterada",
  });
});

it("recusa datas conflitantes sem perder registros nem mover parcialmente", async () => {
  const { source, target } = await fixture();
  await writeDate(env.DB, {
    contact_id: source,
    relation: "self",
    label: "Aniversário",
    month: 1,
    day: 1,
  });
  await writeDate(env.DB, {
    contact_id: target,
    relation: "self",
    label: "Aniversário",
    month: 2,
    day: 2,
  });
  await expect(link(source, target)).rejects.toMatchObject({
    code: "associacao_conflito_datas_ou_cadencia",
  });
  expect(
    (await sql(env.DB, "SELECT COUNT(*) n FROM special_dates").first<{
      n: number;
    }>())!.n,
  ).toBe(2);
  expect(
    (await sql(
      env.DB,
      "SELECT address FROM contacts WHERE id=?",
      source,
    ).first<{ address: string }>())!.address,
  ).toBe("5511999999999");
});

it("invalida extração antiga e intenções pendentes; impede associação com envio em andamento/incerto", async () => {
  const { source, target, sid } = await fixture();
  const fence = await sourceFence(env.DB, source, sid);
  const oldWrite = await memoryStatement(
    env.DB,
    {
      contact_id: source,
      source_id: sid,
      field: "goals",
      value: "Objetivo antigo",
      certainty: "explicit",
    },
    fence,
  );
  const actionId = id("act");
  await sql(
    env.DB,
    "INSERT INTO actions(id,contact_id,alias,content,content_hash,address,address_version,connection_generation,epoch,status,prepared_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
    actionId,
    source,
    "Provisório",
    "Texto",
    "hash",
    "5511999999999",
    1,
    1,
    "epoch",
    "executing",
    Date.now(),
    Date.now() + DAY,
  ).run();
  await expect(link(source, target)).rejects.toMatchObject({
    code: "associacao_envio_em_andamento_ou_incerto",
  });
  await sql(
    env.DB,
    "UPDATE actions SET status='uncertain' WHERE id=?",
    actionId,
  ).run();
  await expect(link(source, target)).rejects.toMatchObject({
    code: "associacao_envio_em_andamento_ou_incerto",
  });
  await sql(
    env.DB,
    "UPDATE actions SET status='awaiting_approval' WHERE id=?",
    actionId,
  ).run();
  await link(source, target);
  await oldWrite.statement.run();
  expect(
    (await sql(env.DB, "SELECT COUNT(*) n FROM memory").first<{ n: number }>())!
      .n,
  ).toBe(0);
  expect(
    await sql(
      env.DB,
      "SELECT contact_id,status FROM actions WHERE id=?",
      actionId,
    ).first(),
  ).toEqual({ contact_id: target, status: "cancelled" });
  expect(
    await sql(
      env.DB,
      "SELECT version,reviewed_version FROM sources WHERE id=?",
      sid,
    ).first(),
  ).toEqual({ version: 2, reviewed_version: 0 });
});

it("dois destinos concorrentes só associam uma vez, sem dividir histórico", async () => {
  const { source, target, sid } = await fixture();
  const other = (await createContact(env.DB, "Mario corrida")).id;
  const result = await Promise.allSettled([
    link(source, target),
    link(source, other),
  ]);
  expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const owner = (await sql(
    env.DB,
    "SELECT contact_id FROM sources WHERE id=?",
    sid,
  ).first<{ contact_id: string }>())!.contact_id;
  expect([target, other]).toContain(owner);
  expect(
    (await sql(
      env.DB,
      "SELECT contact_id FROM messages WHERE source_id=?",
      sid,
    ).first<{ contact_id: string }>())!.contact_id,
  ).toBe(owner);
  expect(
    (
      await sql(
        env.DB,
        "SELECT id FROM contacts WHERE address IS NOT NULL",
      ).all()
    ).results,
  ).toEqual([{ id: owner }]);
});

it("associação concorrente com exclusão não ressuscita ficha nem conteúdo apagado", async () => {
  const { source, target, sid } = await fixture();
  await Promise.allSettled([
    link(source, target),
    deleteContact(env.DB, target),
  ]);
  expect(
    await sql(
      env.DB,
      "SELECT deleted,address FROM contacts WHERE id=?",
      target,
    ).first(),
  ).toEqual({ deleted: 1, address: null });
  const s = await sql(
    env.DB,
    "SELECT contact_id,deleted,content FROM sources WHERE id=?",
    sid,
  ).first<{ contact_id: string; deleted: number; content: string | null }>();
  if (s!.contact_id === target)
    expect(s).toMatchObject({ deleted: 1, content: null });
  else expect(s!.contact_id).toBe(source);
});

it("exclusão da origem concorrente ou anterior não transfere conteúdo já apagado", async () => {
  const { source, target, sid } = await fixture();
  const [association] = await Promise.allSettled([
    link(source, target),
    deleteContact(env.DB, source),
  ]);
  const current = await sql(
    env.DB,
    "SELECT contact_id,deleted,content FROM sources WHERE id=?",
    sid,
  ).first<{ contact_id: string; deleted: number; content: string | null }>();
  if (association.status === "fulfilled") {
    expect(current).toMatchObject({
      contact_id: target,
      deleted: 0,
      content: "Prefiro encontros pela manhã",
    });
    expect(
      await sql(
        env.DB,
        "SELECT deleted,address FROM contacts WHERE id=?",
        target,
      ).first(),
    ).toEqual({ deleted: 0, address: "5511999999999" });
  } else {
    expect(current).toMatchObject({
      contact_id: source,
      deleted: 1,
      content: null,
    });
    expect(
      await sql(
        env.DB,
        "SELECT address FROM contacts WHERE id=?",
        target,
      ).first(),
    ).toEqual({ address: null });
  }
  await expect(link(source, target)).rejects.toMatchObject({
    code: "associacao_indisponivel_ou_alterada",
  });
});

it("não associa ficha excluída nem promove remetente que já tem relacionamento definido", async () => {
  const { source, target } = await fixture();
  await sql(
    env.DB,
    "UPDATE contacts SET relationship='customer' WHERE id=?",
    source,
  ).run();
  await expect(link(source, target)).rejects.toMatchObject({
    code: "associacao_indisponivel_ou_alterada",
  });
  await sql(
    env.DB,
    "UPDATE contacts SET relationship='provisional' WHERE id=?",
    source,
  ).run();
  await deleteContact(env.DB, target);
  await expect(link(source, target)).rejects.toMatchObject({
    code: "associacao_indisponivel_ou_alterada",
  });
});

it("mantém tarefas semelhantes separadas e transfere cadência sem escolher entre valores conflitantes", async () => {
  const { source, target, sid } = await fixture();
  const imported = await importSource(env.DB, {
    contact_id: target,
    source_key: "task-target",
    kind: "note",
    occurred_at: Date.now(),
    text: "Combinar encontro",
  });
  for (const [contact, origin] of [
    [source, sid],
    [target, imported.source_id],
  ])
    await writeTask(env.DB, {
      contact_id: contact,
      source_id: origin,
      subject: "Agendar encontro",
      reason: "Pedido",
      due_date: null,
    });
  await sql(
    env.DB,
    "UPDATE contacts SET cadence_days=14,snooze_until='2026-12-01' WHERE id=?",
    source,
  ).run();
  await sql(
    env.DB,
    "UPDATE contacts SET cadence_days=30 WHERE id=?",
    target,
  ).run();
  await expect(link(source, target)).rejects.toMatchObject({
    code: "associacao_conflito_datas_ou_cadencia",
  });
  await sql(
    env.DB,
    "UPDATE contacts SET cadence_days=NULL WHERE id=?",
    target,
  ).run();
  await link(source, target);
  expect(
    (await sql(
      env.DB,
      "SELECT COUNT(*) n FROM tasks WHERE contact_id=?",
      target,
    ).first<{ n: number }>())!.n,
  ).toBe(2);
  expect(
    await sql(
      env.DB,
      "SELECT cadence_days,snooze_until FROM contacts WHERE id=?",
      target,
    ).first(),
  ).toEqual({ cadence_days: 14, snooze_until: "2026-12-01" });
});

it("replay e edição após associação continuam na ficha selecionada", async () => {
  const { source, target, sid } = await fixture();
  await link(source, target);
  await ingest(
    env.DB,
    {
      type: "ReceivedCallback",
      phone: "5511999999999",
      messageId: "identity-first",
      momment: Date.now(),
      isEdit: true,
      text: { message: "Prefiro encontros à tarde" },
    },
    1,
  );
  expect(
    await sql(
      env.DB,
      "SELECT contact_id,version,content FROM sources WHERE id=?",
      sid,
    ).first(),
  ).toEqual({
    contact_id: target,
    version: 3,
    content: "Prefiro encontros à tarde",
  });
  expect(
    (await sql(
      env.DB,
      "SELECT COUNT(*) n FROM contacts WHERE deleted=0",
    ).first<{ n: number }>())!.n,
  ).toBe(1);
  expect(
    (await listMessages(env.DB, { contact_id: source })).items,
  ).toHaveLength(0);
});

it("reextração após associação preserva tarefa já concluída e prazo revisado sem duplicar", async () => {
  const { source, target, sid } = await fixture();
  const task = {
    contact_id: source,
    source_id: sid,
    subject: "Revisar proposta",
    reason: "Pedido explícito",
    due_date: "2026-10-20",
    state: "open" as const,
  };
  const first = await writeTask(env.DB, task);
  await sql(
    env.DB,
    "UPDATE tasks SET state='done',due_date='2026-10-22' WHERE id=?",
    first.id,
  ).run();
  await link(source, target);
  const replay = await writeTask(env.DB, {
    ...task,
    contact_id: target,
    source_version: 2,
  });
  expect(replay).toEqual({ id: first.id, state: "done" });
  expect(
    (
      await sql(
        env.DB,
        "SELECT id,state,due_date FROM tasks WHERE contact_id=?",
        target,
      ).all()
    ).results,
  ).toEqual([{ id: first.id, state: "done", due_date: "2026-10-22" }]);
});

it("excluir ID provisório aposentado exige selecionar ficha atual sem apagar destino silenciosamente", async () => {
  const { source, target, sid } = await fixture();
  await link(source, target);
  await expect(deleteContact(env.DB, source)).rejects.toMatchObject({
    code: "contato_ja_associado_selecione_ficha_atual",
  });
  expect(
    await sql(
      env.DB,
      "SELECT deleted,address FROM contacts WHERE id=?",
      target,
    ).first(),
  ).toEqual({ deleted: 0, address: "5511999999999" });
  expect(
    await sql(
      env.DB,
      "SELECT contact_id,deleted,content FROM sources WHERE id=?",
      sid,
    ).first(),
  ).toMatchObject({
    contact_id: target,
    deleted: 0,
    content: "Prefiro encontros pela manhã",
  });
});
