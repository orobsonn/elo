import { env as testEnv } from "cloudflare:test";
import { it, expect } from "vitest";
import { toolset } from "../src/mcp";
import { sql } from "../src/core";
import type { AppEnv } from "../src/env";
const env = testEnv as AppEnv;
it("memory and tasks carry the canonical contact label even with empty lists, without identity fields", async () => {
  const tools = toolset(env);
  await sql(
    env.DB,
    "INSERT INTO contacts(id,alias,address,created_at) VALUES('ct_label','Mario trilhas','5511999990001',1),('ct_other','Mario praia','5511999990002',1)",
  ).run();
  for (const name of ["memory_get", "tasks_get"]) {
    const r = (await tools.get(name)!.call({ contact_id: "ct_label" })) as any;
    expect(r.contact).toEqual({ id: "ct_label", alias: "Mario trilhas" });
    expect(r.items).toEqual([]);
    expect(JSON.stringify(r)).not.toMatch(
      /551199999|address|search_name|about|vname|notify/,
    );
    expect(
      ((await tools.get(name)!.call({ contact_id: "ct_other" })) as any)
        .contact,
    ).toEqual({ id: "ct_other", alias: "Mario praia" });
  }
  await tools
    .get("contact_update")!
    .call({ contact_id: "ct_label", alias: "Mario montanha" });
  for (const name of ["memory_get", "tasks_get"])
    expect(
      ((await tools.get(name)!.call({ contact_id: "ct_label" })) as any).contact
        .alias,
    ).toBe("Mario montanha");
  await sql(env.DB, "UPDATE contacts SET deleted=1 WHERE id='ct_label'").run();
  for (const name of ["memory_get", "tasks_get"])
    await expect(
      tools.get(name)!.call({ contact_id: "ct_label" }),
    ).rejects.toMatchObject({ code: "contato_indisponivel" });
});

it('keeps memory and task facts attached to the requested ID and canonical generic alias',async()=>{
 const t=Date.now(), tools=toolset(env);
 await sql(env.DB,"INSERT INTO contacts(id,alias,created_at) VALUES('ct_generic','Contato da agenda',?),('ct_namesake','Mario',?)",t,t).run();
 await sql(env.DB,"INSERT INTO sources(id,contact_id,dedup_key,kind,occurred_at,received_at,expires_at,content) VALUES('src_label','ct_generic','synthetic_label','meeting',?,?,?,'SIM nota')",t,t,t+86400000).run();
 await tools.get('memory_write')!.call({contact_id:'ct_generic',source_id:'src_label',field:'preferences',value:'SIM prefere manhã',certainty:'explicit'});
 await tools.get('task_write')!.call({contact_id:'ct_generic',source_id:'src_label',subject:'SIM retorno',reason:'SIM combinado'});
 await tools.get('memory_write')!.call({contact_id:'ct_generic',source_id:'src_label',field:'preferences',value:'SIM prefere tarde',certainty:'uncertain'});
 await tools.get('task_write')!.call({contact_id:'ct_generic',source_id:'src_label',subject:'SIM segundo retorno',reason:'SIM combinado'});
 for(const name of ['memory_get','tasks_get']){
  const r=await tools.get(name)!.call({contact_id:'ct_generic'}) as any;
  expect(r.contact).toEqual({id:'ct_generic',alias:'Contato da agenda'});
  expect(r.items).toHaveLength(2);
  const page1=await tools.get(name)!.call({contact_id:'ct_generic',limit:1}) as any;
  expect(page1.contact).toEqual(r.contact);expect(page1.next_cursor).toBeTruthy();
  const page2=await tools.get(name)!.call({contact_id:'ct_generic',limit:1,cursor:page1.next_cursor}) as any;
  expect(page2.contact).toEqual(r.contact);expect(page2.next_cursor).toBeNull();
  expect(page2.items[0].id).not.toBe(page1.items[0].id);
  expect((await tools.get(name)!.call({contact_id:'ct_namesake'}) as any).items).toHaveLength(0);
 }
});
