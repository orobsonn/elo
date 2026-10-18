import { env, applyD1Migrations } from "cloudflare:test";
import { it, expect } from "vitest";
import migration from "../migrations/0001_initial.sql?raw";
import directory from "../migrations/0008_contact_directory.sql?raw";
import { createContact, listContacts } from "../src/capture";
it("duas instalações com bancos distintos não consultam nem alteram dados entre si", async () => {
  const isolated = (env as Env & { DB_ISOLATED: D1Database }).DB_ISOLATED;
  await applyD1Migrations(isolated, [
    {
      name: "0001",
      queries: migration
        .split(/;\s*(?:\n|$)/)
        .map((s) => s.trim())
        .filter(Boolean),
    },
    {name:"0008",queries:directory.split(/;\s*(?:\n|$)/).map(s=>s.trim()).filter(Boolean)},
  ]);
  const a = await createContact(env.DB, "Mario trilhas");
  await createContact(isolated, "Mario teatro");
  expect((await listContacts(env.DB, {})).items.map((x) => x.alias)).toEqual([
    "Mario trilhas",
  ]);
  expect((await listContacts(isolated, {})).items.map((x) => x.alias)).toEqual([
    "Mario teatro",
  ]);
  await isolated
    .prepare("UPDATE contacts SET alias=? WHERE id=?")
    .bind("não deveria existir", a.id)
    .run();
  expect((await listContacts(env.DB, {})).items[0].alias).toBe("Mario trilhas");
});
