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

it("recovers a later text callback for the same source once, without resetting retention", async () => {
  const payload=event('5511444444444','late-text',{text:undefined});
  await ingest(env.DB,payload,1);
  const before=(await listMessages(env.DB,{})).items[0];
  const original=await env.DB.prepare('SELECT expires_at,occurred_at FROM sources WHERE id=?').bind(before.source_id).first();
  const text=event('5511444444444','late-text',{momment:time+1});
  await Promise.all([ingest(env.DB,text,1),ingest(env.DB,text,1)]);
  const after=(await listMessages(env.DB,{})).items[0];
  expect(after).toMatchObject({id:before.id,source_id:before.source_id,contact_id:before.contact_id,kind:'text',text:'Combinamos conversar em novembro.'});
  expect(await env.DB.prepare('SELECT version,extract_state,expires_at,occurred_at FROM sources WHERE id=?').bind(before.source_id).first()).toMatchObject({...original,version:2,extract_state:'pending'});
  await ingest(env.DB,event('5511444444444','late-text',{momment:time+2,text:{message:'Replay divergente não autorizado'}}),1);
  expect((await listMessages(env.DB,{})).items[0].text).toBe(after.text);
});
it.each(['expired','deleted','older','identity'] as const)('does not recover a %s placeholder',async mode=>{
  const payload=event('5511444444444','late-text-blocked',{text:undefined});await ingest(env.DB,payload,1);
  if(mode==='expired')await env.DB.prepare('UPDATE sources SET expires_at=?').bind(Date.now()-1).run();
  if(mode==='deleted')await ingest(env.DB,{...payload,deleted:true},1);
  const later=event(mode==='identity'?'5511333333333':'5511444444444','late-text-blocked',{momment:mode==='older'?time-1:time+1});
  if(mode==='identity')await expect(ingest(env.DB,later,1)).rejects.toThrow('identidade_do_evento_diverge');else await ingest(env.DB,later,1);
  expect(await env.DB.prepare('SELECT content FROM sources').first()).toMatchObject({content:null});
});

it.each(['deleted','expired','contact_deleted','connection_changed'] as const)('checks %s at hydration commit after the initial read',async mode=>{
  const payload=event('5511444444444','late-commit',{text:undefined});await ingest(env.DB,payload,1);
  let intercepted=false;
  const db=new Proxy(env.DB,{get(target,key){if(key==='batch')return async(statements:D1PreparedStatement[])=>{
    if(!intercepted){intercepted=true;
      if(mode==='deleted')await ingest(target,{...payload,deleted:true},1);
      if(mode==='expired')await target.prepare('UPDATE sources SET expires_at=?').bind(Date.now()-1).run();
      if(mode==='contact_deleted')await target.prepare("UPDATE contacts SET deleted=1,address=NULL").run();
      if(mode==='connection_changed')await target.prepare('UPDATE settings SET connection_generation=2').run();
    }return target.batch(statements);
  };const v=Reflect.get(target,key);return typeof v==='function'?v.bind(target):v;}});
  await ingest(db,event('5511444444444','late-commit'),1);
  expect(await env.DB.prepare('SELECT content,lease FROM sources').first()).toMatchObject({content:null,lease:null});
  expect(await env.DB.prepare('SELECT kind FROM messages').first()).toMatchObject({kind:'unsupported_media'});
});
it('rejects an explicit direction change while filling missing text',async()=>{
  await ingest(env.DB,event('5511444444444','late-direction',{text:undefined,fromMe:true}),1);
  await expect(ingest(env.DB,event('5511444444444','late-direction',{fromMe:false}),1)).rejects.toThrow('direcao_do_evento_diverge');
  expect(await env.DB.prepare('SELECT content FROM sources').first()).toMatchObject({content:null});
});
it('fills text when concurrent initial callbacks both read before the placeholder insert',async()=>{
  let entries=0, releaseBoth!:()=>void, firstDone!:()=>void;
  const both=new Promise<void>(r=>releaseBoth=r), first=new Promise<void>(r=>firstDone=r);
  const db=new Proxy(env.DB,{get(target,key){if(key==='batch')return async(statements:D1PreparedStatement[])=>{
    const entry=++entries;if(entry===1){await both;const result=await target.batch(statements);firstDone();return result;}
    if(entry===2){releaseBoth();await first;}return target.batch(statements);
  };const v=Reflect.get(target,key);return typeof v==='function'?v.bind(target):v;}});
  await Promise.all([ingest(db,event('5511444444444','initial-late',{text:undefined}),1),ingest(db,event('5511444444444','initial-late'),1)]);
  const items=(await listMessages(env.DB,{})).items;
  expect(items).toHaveLength(1);expect(items[0]).toMatchObject({kind:'text',text:'Combinamos conversar em novembro.'});
});
