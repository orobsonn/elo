import { env } from "cloudflare:test";
import {associateContact} from "../src/identity";
import { describe, it, expect } from "vitest";
import { DAY, id, now, sql } from "../src/core";
import {
  importSource,
  writeMemory,
  getMemory,
  reviewMemory,
  writeTask,
  writeDate,
  recordInteraction,
  attention,
  reviewPage,
  reviewComplete,
  expire,
  reviewTask,
  getTasks,
} from "../src/memory";
async function contact() {
  const c = id("ct");
  await sql(
    env.DB,
    "INSERT INTO contacts(id,alias,created_at) VALUES(?,?,?)",
    c,
    "Mario trilhas",
    now(),
  ).run();
  return c;
}
async function source(c: string, age = 0) {
  const s = id("src");
  const t = now() - age * DAY;
  await sql(
    env.DB,
    "INSERT INTO sources(id,contact_id,dedup_key,kind,occurred_at,received_at,expires_at,content) VALUES(?,?,?,'meeting',?,?,?,'Deseja viajar em novembro.')",
    s,
    c,
    s,
    t,
    now(),
    t + 30 * DAY,
  ).run();
  return s;
}

function pausedReviewDatabase(decision:'confirm'|'correct'|'discard') {
 let entered!:()=>void,release!:()=>void;
 const atMutation=new Promise<void>(resolve=>entered=resolve),resume=new Promise<void>(resolve=>release=resolve);
 function prepared(stmt:D1PreparedStatement,query:string):D1PreparedStatement{return new Proxy(stmt,{get(target,key){if(key==='bind')return (...params:unknown[])=>prepared(target.bind(...params),query);if(key==='run'&&decision==='discard'&&query.includes("SET state='discarded'"))return async()=>{entered();await resume;return target.run();};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});}
 const db=new Proxy(env.DB,{get(target,key){if(key==='prepare')return (query:string)=>prepared(target.prepare(query),query);if(key==='batch')return async(statements:D1PreparedStatement[])=>{entered();await resume;return target.batch(statements);};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
 return {db,atMutation,release};
}

describe("memory and retention", () => {

 it('a stale selected value cannot supersede the existing confirmed fact',async()=>{
 const c=await contact(),sid=await source(c);const original=await writeMemory(env.DB,{contact_id:c,source_id:sid,field:'preferences',value:'Prefere manhã',certainty:'explicit'});
 const candidate=await writeMemory(env.DB,{contact_id:c,source_id:sid,field:'preferences',value:'Prefere tarde',certainty:'explicit'});const gate=pausedReviewDatabase('confirm');
 const pending=reviewMemory(gate.db,{id:candidate.id,decision:'confirm'}).then(value=>({value,error:undefined}),error=>({value:undefined,error}));await gate.atMutation;
 await sql(env.DB,"UPDATE memory SET value='Prefere noite' WHERE id=?",candidate.id).run();gate.release();expect((await pending).error).toMatchObject({status:409});
 expect(await sql(env.DB,'SELECT state,value FROM memory WHERE id=?',original.id).first()).toMatchObject({state:'confirmed',value:'Prefere manhã'});
 expect(await sql(env.DB,'SELECT state,value FROM memory WHERE id=?',candidate.id).first()).toMatchObject({state:'pending',value:'Prefere noite'});
 expect(await sql(env.DB,"SELECT COUNT(*) n FROM memory WHERE state LIKE 'revising:%'").first()).toMatchObject({n:0});
 });
 it('a valid explicit confirmation supersedes its conflict and preserves both origins',async()=>{
 const c=await contact(),sid=await source(c);const original=await writeMemory(env.DB,{contact_id:c,source_id:sid,field:'preferences',value:'Prefere manhã',certainty:'explicit'});
 const candidate=await writeMemory(env.DB,{contact_id:c,source_id:sid,field:'preferences',value:'Prefere tarde',certainty:'explicit'});await reviewMemory(env.DB,{id:candidate.id,decision:'confirm'});
 expect(await sql(env.DB,'SELECT state,value,source_id FROM memory WHERE id=?',original.id).first()).toMatchObject({state:'superseded',value:'Prefere manhã',source_id:sid});
 expect(await sql(env.DB,'SELECT state,value,source_id FROM memory WHERE id=?',candidate.id).first()).toMatchObject({state:'confirmed',value:'Prefere tarde',source_id:sid});
 expect(await sql(env.DB,"SELECT COUNT(*) n FROM memory WHERE state LIKE 'revising:%'").first()).toMatchObject({n:0});
 });


  it('requires human review for moved-source facts even when extraction declares them explicit',async()=>{
   const c=await contact(),sid=await source(c);await sql(env.DB,'UPDATE sources SET identity_review_required=1 WHERE id=?',sid).run();
   const fact=await writeMemory(env.DB,{contact_id:c,source_id:sid,field:'preferences',value:'Prefere manhã',certainty:'explicit'});
   expect(await sql(env.DB,'SELECT state,reason,confirmed_at FROM memory WHERE id=?',fact.id).first()).toMatchObject({state:'pending',reason:expect.stringContaining('Associação'),confirmed_at:null});
   await reviewMemory(env.DB,{id:fact.id,decision:'confirm'});
   expect(await sql(env.DB,'SELECT state,confirmed_at FROM memory WHERE id=?',fact.id).first()).toMatchObject({state:'confirmed',confirmed_at:expect.any(Number)});
   expect(await sql(env.DB,'SELECT identity_review_required FROM sources WHERE id=?',sid).first()).toMatchObject({identity_review_required:1});
  });
  it('re-extraction after association preserves the completed rescheduled task by original source key',async()=>{
   const original=await contact(),target=await contact(),sid=await source(original);await sql(env.DB,'UPDATE contacts SET address=? WHERE id=?','5511888888888',original).run();
   const p={contact_id:original,source_id:sid,subject:'Preparar material',reason:'Combinado',due_date:'2026-11-01'};
   const task=await writeTask(env.DB,p);await reviewTask(env.DB,{id:task.id,contact_id:original,state:'done',due_date:'2026-12-01'});
   await associateContact(env.DB,{provisional_id:original,target_id:target,confirm:'associar_contatos_selecionados'});
   expect(await writeTask(env.DB,{...p,contact_id:target})).toMatchObject({id:task.id,state:'done'});
   expect(await sql(env.DB,'SELECT COUNT(*) n FROM tasks WHERE contact_id=?',target).first()).toMatchObject({n:1});
   expect(await sql(env.DB,'SELECT due_date,state FROM tasks WHERE id=?',task.id).first()).toMatchObject({due_date:'2026-12-01',state:'done'});
  });

  it.each(['confirm','correct','discard'] as const)('rejects stale %s after the selected memory moves to another identity',async decision=>{
 const original=await contact(),target=await contact(),sid=await source(original);
 await sql(env.DB,'UPDATE contacts SET address=? WHERE id=?','5511888888888',original).run();
 const selected=await writeMemory(env.DB,{contact_id:original,source_id:sid,field:'preferences',value:'Prefere manhã',certainty:'uncertain'});
 const gate=pausedReviewDatabase(decision);
 const pending=reviewMemory(gate.db,{id:selected.id,decision,...(decision==='correct'?{value:'Prefere tarde'}:{})}).then(value=>({value,error:undefined}),error=>({value:undefined,error}));
 await gate.atMutation;
 await associateContact(env.DB,{provisional_id:original,target_id:target,confirm:'associar_contatos_selecionados'});
 gate.release();
 const result=await pending;expect(result.error).toMatchObject({status:409});
 expect(await sql(env.DB,'SELECT contact_id,value,state,needs_review FROM memory WHERE id=?',selected.id).first()).toMatchObject({contact_id:target,value:'Prefere manhã',state:'pending',needs_review:1});
 expect(await sql(env.DB,"SELECT COUNT(*) n FROM memory WHERE contact_id=? AND state='confirmed'",target).first()).toMatchObject({n:0});
 });

  it("a paginated review never marks an edited earlier page as its unseen newer version", async () => {
    const c = await contact(),
      first = await source(c);
    await source(c);
    const a = await reviewPage(env.DB, { limit: 1 });
    expect(a.items[0].source_id).toBe(first);
    await sql(
      env.DB,
      "UPDATE sources SET version=2,content='Editada depois de lida' WHERE id=?",
      first,
    ).run();
    const b = await reviewPage(env.DB, {
      run_id: a.run_id,
      cursor: a.page_token,
      limit: 1,
    });
    expect(b.coverage).toMatchObject({
      complete: true,
      current_versions_complete: false,
      newer_versions_pending: 1,
    });
    const complete = await reviewComplete(env.DB, {
      run_id: b.run_id,
      page_token: b.page_token,
    });
    expect(complete).toMatchObject({
      current_versions_complete: false,
      newer_versions_pending: 1,
    });
    expect(
      await sql(
        env.DB,
        "SELECT version,reviewed_version FROM sources WHERE id=?",
        first,
      ).first(),
    ).toMatchObject({ version: 2, reviewed_version: 1 });
    expect((await attention(env.DB, { contact_id: c })).unreviewed.count).toBe(
      1,
    );
  });

  it("surfaces an edit after completion even when original ingestion belongs to another day", async () => {
    const c = await contact(),
      s = await source(c);
    const yesterday = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Fortaleza",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now() - DAY);
    await sql(
      env.DB,
      "UPDATE sources SET received_at=? WHERE id=?",
      now() - DAY,
      s,
    ).run();
    const page = await reviewPage(env.DB, { day: yesterday });
    await reviewComplete(env.DB, {
      run_id: page.run_id,
      page_token: page.page_token,
    });
    await sql(
      env.DB,
      "UPDATE sources SET version=version+1,content='Texto editado' WHERE id=?",
      s,
    ).run();
    expect((await attention(env.DB, { contact_id: c })).unreviewed.count).toBe(
      1,
    );
    const edited = await reviewPage(env.DB, {});
    expect(edited.items).toContainEqual(
      expect.objectContaining({
        source_id: s,
        source_version: 2,
        text: "Texto editado",
      }),
    );
    await reviewComplete(env.DB, {
      run_id: edited.run_id,
      page_token: edited.page_token,
    });
    expect((await attention(env.DB, { contact_id: c })).unreviewed.count).toBe(
      0,
    );
  });
  it("marks only the displayed version reviewed when editing happens before completion", async () => {
    const c = await contact(),
      s = await source(c);
    const page = await reviewPage(env.DB, {});
    expect(page.items[0].source_version).toBe(1);
    await sql(
      env.DB,
      "UPDATE sources SET version=version+1,content='Versão nova não lida' WHERE id=?",
      s,
    ).run();
    const completion = await reviewComplete(env.DB, {
      run_id: page.run_id,
      page_token: page.page_token,
    });
    expect(completion).toMatchObject({
      complete: true,
      current_versions_complete: false,
      newer_versions_pending: 1,
      scope: "displayed_versions",
    });
    expect((await attention(env.DB, { contact_id: c })).unreviewed.count).toBe(
      1,
    );
    expect(
      await sql(
        env.DB,
        "SELECT version,reviewed_version FROM sources WHERE id=?",
        s,
      ).first(),
    ).toMatchObject({ version: 2, reviewed_version: 1 });
  });

  it("review pages preserve direction for identical contact and consultant statements", async () => {
    const c = await contact();
    const incoming = await source(c),
      outgoing = await source(c),
      meeting = await source(c);
    for (const [source_id, direction] of [
      [incoming, "in"],
      [outgoing, "out"],
    ] as const) {
      await sql(
        env.DB,
        "UPDATE sources SET kind='message',content='Tenho dois filhos' WHERE id=?",
        source_id,
      ).run();
      await sql(
        env.DB,
        "INSERT INTO messages(id,source_id,provider_key,contact_id,direction,kind,mutation_at) VALUES(?,?,?,?,?,'text',?)",
        id("msg"),
        source_id,
        source_id,
        c,
        direction,
        now(),
      ).run();
    }
    const p = await reviewPage(env.DB, {});
    expect(p.items.find((x) => x.source_id === incoming)).toMatchObject({
      text: "Tenho dois filhos",
      direction: "in",
      source_kind: "message",
    });
    expect(p.items.find((x) => x.source_id === outgoing)).toMatchObject({
      text: "Tenho dois filhos",
      direction: "out",
      source_kind: "message",
    });
    expect(p.items.find((x) => x.source_id === meeting)).toMatchObject({
      direction: null,
      source_kind: "meeting",
    });
    expect(p.coverage.complete).toBe(true);
  });

  it("attention counts messages still requiring review and exposes unavailable pending evidence", async () => {
    const c = await contact(),
      s = await source(c);
    await writeMemory(env.DB, {
      contact_id: c,
      source_id: s,
      field: "context",
      value: "Possível mudança",
      certainty: "uncertain",
    });
    const a = await attention(env.DB, { contact_id: c });
    expect(a.unreviewed.count).toBe(1);
    expect(a.pending[0]).toMatchObject({
      source_available: true,
      source_id: s,
    });
    const page = await reviewPage(env.DB, {});
    await reviewComplete(env.DB, {
      run_id: page.run_id,
      page_token: page.page_token,
    });
    expect((await attention(env.DB, { contact_id: c })).unreviewed.count).toBe(
      0,
    );
    await source(c);
    expect((await attention(env.DB, { contact_id: c })).unreviewed.count).toBe(
      1,
    );
    await sql(
      env.DB,
      "UPDATE sources SET expires_at=? WHERE id=?",
      now() - DAY,
      s,
    ).run();
    await expire(env.DB);
    expect(
      (await attention(env.DB, { contact_id: c })).pending[0],
    ).toMatchObject({ source_available: false });
  });

  it("updates a retained task independently of source expiry and never marks review or sends complete", async () => {
    const c = await contact(),
      s = await source(c);
    const task = await writeTask(env.DB, {
      contact_id: c,
      source_id: s,
      subject: "Preparar material",
      reason: "Combinado",
      due_date: "2027-11-01",
    });
    await sql(
      env.DB,
      "UPDATE sources SET expires_at=? WHERE id=?",
      now() - DAY,
      s,
    ).run();
    await expire(env.DB);
    expect((await getTasks(env.DB, { contact_id: c })).items[0]).toMatchObject({
      id: task.id,
      state: "open",
      source_available: false,
    });
    await reviewTask(env.DB, { id: task.id, contact_id: c, state: "done" });
    expect(
      (await getTasks(env.DB, { contact_id: c, state: "done" })).items[0],
    ).toMatchObject({ state: "done" });
    expect(
      await sql(
        env.DB,
        "SELECT COUNT(*) n FROM review_runs WHERE state='complete'",
      ).first(),
    ).toMatchObject({ n: 0 });
  });
  it("cannot complete review when the requested raw history is unavailable", async () => {
    const c = await contact(),
      s = await source(c);
    await sql(
      env.DB,
      "UPDATE sources SET expires_at=?,received_at=? WHERE id=?",
      now() - DAY,
      Date.parse("2026-08-01T12:00:00Z"),
      s,
    ).run();
    await expire(env.DB);
    const p = await reviewPage(env.DB, {
      day: "2026-08-01",
      timezone: "America/Fortaleza",
    });
    expect(p.coverage.unavailable_count).toBeGreaterThan(0);
    expect(p.coverage.complete).toBe(false);
    await expect(
      reviewComplete(env.DB, { run_id: p.run_id, page_token: p.page_token }),
    ).rejects.toThrow();
  });
  it("does not advance two parallel review readers from the same persisted page token", async () => {
    const c = await contact();
    for (let i = 0; i < 3; i++) {
      const sid = await source(c);
      await sql(
        env.DB,
        "UPDATE sources SET received_at=? WHERE id=?",
        Date.parse("2026-08-02T12:00:00Z"),
        sid,
      ).run();
    }
    const p = await reviewPage(env.DB, { day: "2026-08-02", limit: 1 });
    const attempts = await Promise.allSettled([
      reviewPage(env.DB, { run_id: p.run_id, cursor: p.page_token, limit: 1 }),
      reviewPage(env.DB, { run_id: p.run_id, cursor: p.page_token, limit: 1 }),
    ]);
    expect(attempts.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((r) => r.status === "rejected")).toHaveLength(1);
  });

  it("automatically confirms explicit new facts and keeps concurrent conflicts pending", async () => {
    const c = await contact(),
      s = await source(c);
    await Promise.all(
      ["Viajar em novembro", "Viajar em dezembro"].map((value) =>
        writeMemory(env.DB, {
          contact_id: c,
          source_id: s,
          field: "goals",
          value,
          certainty: "explicit",
        }),
      ),
    );
    const m = await getMemory(env.DB, { contact_id: c });
    expect(m.items.map((x: any) => x.state).sort()).toEqual([
      "confirmed",
      "pending",
    ]);
    expect(
      m.items.every(
        (x: any) => x.source_id === s && x.occurred_at && x.recorded_at,
      ),
    ).toBe(true);
  });
  it("keeps uncertain attribution pending and rejects cross-contact or restricted fields", async () => {
    const c = await contact(),
      other = await contact(),
      s = await source(c);
    const m = await writeMemory(env.DB, {
      contact_id: c,
      source_id: s,
      field: "context",
      value: "Talvez procure uma casa",
      certainty: "uncertain",
    });
    expect(m.state).toBe("pending");
    await expect(
      writeMemory(env.DB, {
        contact_id: other,
        source_id: s,
        field: "goals",
        value: "Uma casa",
        certainty: "explicit",
      }),
    ).rejects.toThrow();
    await expect(
      writeMemory(env.DB, {
        contact_id: c,
        source_id: s,
        field: "email",
        value: "secret@example.test",
        certainty: "explicit",
      }),
    ).rejects.toThrow();
    expect((await getMemory(env.DB, { contact_id: other })).items).toHaveLength(
      0,
    );
  });
  it("imports a meeting idempotently and shares idempotency with Skill facts and tasks", async () => {
    const c = await contact();
    const p = {
      contact_id: c,
      source_key: "meeting-1",
      occurred_at: now(),
      kind: "meeting" as const,
      text: "Cliente deseja viajar em novembro.",
    };
    const a = await importSource(env.DB, p),
      b = await importSource(env.DB, p);
    expect(a.source_id).toBe(b.source_id);
    const fact = {
      contact_id: c,
      source_id: a.source_id,
      field: "goals",
      value: "Viajar em novembro",
      certainty: "explicit",
    };
    await writeMemory(env.DB, fact);
    await writeMemory(env.DB, fact);
    const task = {
      contact_id: c,
      source_id: a.source_id,
      subject: "Conversar em novembro",
      reason: "Retorno combinado",
      due_date: "2026-11-01",
    };
    await writeTask(env.DB, task);
    await writeTask(env.DB, task);
    expect((await getMemory(env.DB, { contact_id: c })).items).toHaveLength(1);
    expect(
      (await sql(env.DB, "SELECT * FROM tasks WHERE contact_id=?", c).all())
        .results,
    ).toHaveLength(1);
  });
  it("preserves pending memory and provenance after raw expiry and prevents reimport resurrection", async () => {
    const c = await contact(),
      s = await source(c);
    await writeMemory(env.DB, {
      contact_id: c,
      source_id: s,
      field: "context",
      value: "Pode mudar de cidade",
      certainty: "inferred",
    });
    await sql(
      env.DB,
      "UPDATE sources SET occurred_at=?,expires_at=? WHERE id=?",
      now() - 31 * DAY,
      now() - DAY,
      s,
    ).run();
    await expire(env.DB);
    const m = await getMemory(env.DB, { contact_id: c });
    expect(m.items[0]).toMatchObject({
      state: "pending",
      source_available: false,
    });
    expect(
      await sql(env.DB, "SELECT content FROM sources WHERE id=?", s).first(),
    ).toMatchObject({ content: null });
    const p = {
      contact_id: c,
      source_key: "old",
      occurred_at: now() - 31 * DAY,
      kind: "note" as const,
      text: "Texto antigo",
    };
    const imported = await importSource(env.DB, p);
    await importSource(env.DB, { ...p, occurred_at: now() });
    expect(
      await sql(
        env.DB,
        "SELECT content FROM sources WHERE id=?",
        imported.source_id,
      ).first(),
    ).toMatchObject({ content: null });
  });
  it("corrects a fact while preserving the old revision", async () => {
    const c = await contact(),
      s = await source(c);
    const a = await writeMemory(env.DB, {
      contact_id: c,
      source_id: s,
      field: "goals",
      value: "Uma casa",
      certainty: "explicit",
    });
    await reviewMemory(env.DB, {
      id: a.id,
      decision: "correct",
      value: "Um apartamento",
    });
    const m = await getMemory(env.DB, { contact_id: c });
    expect(
      m.items.some(
        (x: any) => x.state === "superseded" && x.value === "Uma casa",
      ),
    ).toBe(true);
    expect(
      m.items.some(
        (x: any) => x.state === "confirmed" && x.value === "Um apartamento",
      ),
    ).toBe(true);
  });
  it("requires an explicit leap-day policy and does not make future returns overdue", async () => {
    const c = await contact(),
      s = await source(c);
    await expect(
      writeDate(env.DB, {
        contact_id: c,
        relation: "self",
        label: "Aniversário",
        month: 2,
        day: 29,
      }),
    ).rejects.toThrow();
    await writeDate(env.DB, {
      contact_id: c,
      relation: "self",
      label: "Aniversário",
      month: 2,
      day: 29,
      leap_policy: "feb28",
    });
    await writeTask(env.DB, {
      contact_id: c,
      source_id: s,
      subject: "Conversar em novembro",
      reason: "Retorno",
      due_date: "2027-11-01",
    });
    const a = await attention(env.DB, {
      contact_id: c,
      day: "2027-02-28",
      timezone: "America/Fortaleza",
    });
    expect(a.dates[0]).toMatchObject({ on: "2027-02-28" });
    expect(a.tasks).toHaveLength(0);
  });
  it("keeps meetings and relevant contacts as different interaction timestamps", async () => {
    const c = await contact(),
      s = await source(c);
    await recordInteraction(env.DB, {
      contact_id: c,
      source_id: s,
      kind: "meeting",
      at: now() - DAY,
    });
    await recordInteraction(env.DB, {
      contact_id: c,
      source_id: s,
      kind: "relevant",
      at: now(),
    });
    const m = await getMemory(env.DB, { contact_id: c });
    expect(m.interactions.meeting).toBeLessThan(m.interactions.relevant!);
  });
  it("persists review pagination, refuses partial completion and includes late arrivals by received time", async () => {
    const c = await contact();
    for (let i = 0; i < 3; i++) {
      const sid = await source(c, i === 0 ? 5 : 2);
      await sql(
        env.DB,
        "UPDATE sources SET received_at=? WHERE id=?",
        now() - DAY,
        sid,
      ).run();
    }
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Fortaleza",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now() - DAY);
    let p = await reviewPage(env.DB, {
      day,
      timezone: "America/Fortaleza",
      limit: 1,
    });
    expect(p.coverage.complete).toBe(false);
    await expect(
      reviewComplete(env.DB, { run_id: p.run_id, page_token: p.page_token }),
    ).rejects.toThrow();
    expect(p.items[0].occurred_at).toBeLessThan(p.items[0].received_at - DAY);
    while (!p.coverage.complete)
      p = await reviewPage(env.DB, {
        run_id: p.run_id,
        cursor: p.page_token,
        limit: 1,
      });
    await expect(
      reviewComplete(env.DB, { run_id: p.run_id, page_token: p.page_token }),
    ).resolves.toMatchObject({ complete: true });
    await expect(
      reviewPage(env.DB, { run_id: p.run_id, cursor: "forged" }),
    ).rejects.toThrow();
  });
});
