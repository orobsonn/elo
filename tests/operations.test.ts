import { env } from "cloudflare:test";
import { it, expect } from "vitest";
import { safeAlias, sql } from "../src/core";
import { ingest, listMessages } from "../src/capture";
import { deleteContact, exportData } from "../src/operations";
import type { AppEnv } from "../src/env";
it("projeção do alias recusa identificadores formatados", () => {
  for (const v of ["55 11 99999 9999", "123.456.789-00", "nome@example.test"])
    expect(() => safeAlias(v)).toThrow();
  expect(safeAlias("Mario trilhas")).toBe("Mario trilhas");
});
it("exclusão explícita não ressuscita por replay e export não inclui auth/connection secrets", async () => {
  const event = {
    type: "ReceivedCallback",
    phone: "5511999999999",
    messageId: "delete",
    momment: Date.now(),
    text: { message: "excluir conteúdo" },
  };
  await ingest(env.DB, event, 1);
  const c = await sql(env.DB, "SELECT id FROM contacts").first<{
    id: string;
  }>();
  await deleteContact(env.DB, c!.id, (env as AppEnv).ENCRYPTION_KEY);
  await ingest(env.DB, event, 1);
  expect((await listMessages(env.DB, {})).items).toHaveLength(0);
  const response = await exportData(env as AppEnv);
  const data = (await response.json()) as { tables: Record<string, unknown> };
  expect(data.tables).not.toHaveProperty("auth_state");
  expect(data.tables).not.toHaveProperty("settings");
  expect(JSON.stringify(data)).not.toContain("excluir conteúdo");
});
