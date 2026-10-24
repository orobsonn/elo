import { it, expect, vi, afterEach } from "vitest";
import { connectionStatus, sendText, type Connection } from "../src/zapi";
const c: Connection = {
  instance_id: "synthetic_instance",
  instance_token: "synthetic_instance_token",
  client_token: "synthetic_client_token",
  webhook_key: "synthetic_webhook_key_32_characters",
  device_identity: "5511999990000",
};
afterEach(() => vi.unstubAllGlobals());
it("builds a runtime-valid provider status request", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const wire = new Request(input, init);
      expect(wire.headers.get("Client-Token")).toBe(c.client_token);
      return Response.json({ connected: true });
    }),
  );
  await expect(connectionStatus(c)).resolves.toEqual({ connected: true });
});
it("validates sender before one text request using real Request construction", async () => {
  const paths: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const wire = new Request(input, init);
      const path = new URL(wire.url).pathname.split("/").at(-1)!;
      paths.push(path);
      if (path === "status") return Response.json({ connected: true });
      if (path === "device") return Response.json({ phone: c.device_identity });
      expect(wire.method).toBe("POST");
      expect(await wire.json()).toEqual({
        phone: "5511999990001",
        message: "Texto sintético",
      });
      return Response.json({ messageId: "synthetic-provider-message" });
    }),
  );
  await expect(
    sendText(c, "5511999990001", "Texto sintético"),
  ).resolves.toEqual({ messageId: "synthetic-provider-message" });
  expect(paths).toEqual(["status", "device", "send-text"]);
});
it("refuses redirects without forwarding the client credential", async () => {
  const network = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const wire = new Request(input, init);
      expect(wire.redirect).toBe("manual");
      return Response.redirect("https://untrusted.example.test/", 302);
    },
  );
  vi.stubGlobal("fetch", network);
  await expect(connectionStatus(c)).rejects.toMatchObject({
    code: "provedor_indisponivel",
  });
  expect(network).toHaveBeenCalledTimes(1);
});
// Provider mapping must be internally consistent before any contact can be reconciled.
it("rejects duplicate LIDs in a bulk mapping response", async () => {
  const { contactIdentityPairs } = await import("../src/zapi");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json([
        {
          exists: true,
          inputPhone: "5511999990001",
          outputPhone: "5511999990001",
          lid: "9999999990001@lid",
        },
        {
          exists: true,
          inputPhone: "5511999990002",
          outputPhone: "5511999990002",
          lid: "9999999990001@lid",
        },
      ]),
    ),
  );
  try {
    await expect(
      contactIdentityPairs(
        {
          instance_id: "synthetic",
          instance_token: "synthetic-token",
          client_token: "synthetic-client",
          webhook_key: "synthetic-webhook-abcdefghijklmnopqrstuvwxyz",
        },
        ["5511999990001", "5511999990002"],
      ),
    ).rejects.toMatchObject({ code: "identidade_agenda_resposta_invalida" });
  } finally {
    vi.unstubAllGlobals();
  }
});
