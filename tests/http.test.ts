import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { it, expect } from "vitest";
import worker from "../src/index";
import type { AppEnv } from "../src/env";
const e = env as AppEnv;
async function call(path: string, init: RequestInit = {}) {
  const ctx = createExecutionContext();
  const r = await worker.fetch(
    new Request(`${e.PUBLIC_ORIGIN}${path}`, init),
    e,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return r;
}
it("health e tela funcionam; ferramentas e export exigem dono", async () => {
  expect((await call("/health")).status).toBe(200);
  expect((await call("/")).status).toBe(200);
  const m = await call("/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });
  expect(m.status).toBe(401);
  expect(m.headers.get("WWW-Authenticate")).toContain(
    "oauth-protected-resource",
  );
  expect([302, 401, 503]).toContain((await call("/export")).status);
});
it("não aceita callback não configurado, segredo errado, nem origem alternativa", async () => {
  const r = await call("/webhooks/zapi/qualquer", {
    method: "POST",
    body: "{}",
  });
  expect(r.status).toBe(503);
  expect(await r.text()).toContain("whatsapp_nao_configurado");
  const ctx = createExecutionContext();
  const alternate = await worker.fetch(
    new Request("https://evil.test/mcp", { method: "POST", body: "{}" }),
    e,
    ctx,
  );
  expect(alternate.status).toBe(403);
  await waitOnExecutionContext(ctx);
});
it("SDK MCP lista schemas e projeta contato sem aceitar propriedades extras", async () => {
  const { mcp } = await import("../src/mcp");
  async function rpc(method: string, params: unknown, id = 1) {
    const r = await mcp(
      new Request(e.PUBLIC_ORIGIN + "/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          "MCP-Protocol-Version": "2025-03-26",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      }),
      e,
    );
    return r.json() as Promise<{
      result?: {
        tools?: { name: string }[];
        isError?: boolean;
        content?: { text: string }[];
      };
    }>;
  }
  const list = await rpc("tools/list", {});
  expect(list.result?.tools?.map((x) => x.name)).toContain("memory_get");
  const bad = await rpc("tools/call", {
    name: "contact_create",
    arguments: { alias: "Mario", phone: "5511999999999" },
  });
  expect(bad.result?.isError).toBe(true);
  expect(JSON.stringify(bad)).not.toContain("551199");
  const valid = await rpc("tools/call", {
    name: "contact_create",
    arguments: { alias: "Mario trilhas" },
  });
  expect(valid.result?.isError).not.toBe(true);
  expect(JSON.stringify(valid)).toContain("Mario trilhas");
});
