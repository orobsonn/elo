import { z } from "zod";
import { SafeError, body, unseal, seal, sql, id, equal } from "./core";
import type { AppEnv } from "./env";
export const connectionSchema = z
  .object({
    instance_id: z.string().regex(/^[A-Za-z0-9_-]{8,100}$/),
    instance_token: z.string().regex(/^[A-Za-z0-9_-]{8,200}$/),
    client_token: z.string().regex(/^[A-Za-z0-9_-]{8,250}$/),
    webhook_key: z.string().min(32),
    device_identity: z.string().optional(),
  })
  .strict();
export type Connection = z.infer<typeof connectionSchema>;
export async function getConnection(env: AppEnv) {
  const row = await sql(
    env.DB,
    "SELECT connection_cipher,connection_generation,sends_paused FROM settings WHERE id=1",
  ).first<{
    connection_cipher: string | null;
    connection_generation: number;
    sends_paused: number;
  }>();
  if (!row?.connection_cipher)
    throw new SafeError("whatsapp_nao_configurado", 503);
  return {
    ...row,
    credentials: connectionSchema.parse(
      await unseal(row.connection_cipher, env.ENCRYPTION_KEY),
    ),
  };
}
async function api(c: Connection, path: string, init: RequestInit = {}) {
  let r: Response;
  try {
    r = await fetch(
      `https://api.z-api.io/instances/${encodeURIComponent(c.instance_id)}/token/${encodeURIComponent(c.instance_token)}/${path}`,
      {
        ...init,
        headers: {
          "Client-Token": c.client_token,
          "Content-Type": "application/json",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(12000),
      },
    );
  } catch {
    throw new SafeError("provedor_resposta_incerta", 502);
  }
  if (!r.ok)
    throw new SafeError(
      r.status === 429
        ? "quota_provedor"
        : r.status === 401 || r.status === 403
          ? "credencial_provedor_recusada"
          : "provedor_indisponivel",
      502,
    );
  try {
    return JSON.parse(await body(r, 32768)) as Record<string, unknown>;
  } catch {
    throw new SafeError("provedor_resposta_invalida", 502);
  }
}
export async function connectionStatus(c: Connection) {
  const r = await api(c, "status");
  return { connected: r.connected === true };
}
export async function deviceIdentity(c: Connection) {
  const r = await api(c, "device");
  if (typeof r.phone !== "string" || !/^\d{8,16}$/.test(r.phone))
    throw new SafeError("identidade_do_aparelho_nao_verificada", 503);
  return r.phone;
}
export async function sendText(c: Connection, phone: string, text: string) {
  if (!(await connectionStatus(c)).connected)
    throw new SafeError("numero_desconectado", 503);
  if (!c.device_identity || (await deviceIdentity(c)) !== c.device_identity)
    throw new SafeError("numero_remetente_alterado_reconfigure", 409);
  const r = await api(c, "send-text", {
    method: "POST",
    body: JSON.stringify({ phone, message: text }),
  });
  if (typeof r.messageId !== "string" || r.messageId.length > 200)
    throw new SafeError("provedor_resposta_incerta", 502);
  return { messageId: r.messageId };
}
export async function configureConnection(env: AppEnv, input: unknown) {
  const p = connectionSchema
    .omit({ webhook_key: true, device_identity: true })
    .safeParse(input);
  if (!p.success) throw new SafeError("credenciais_invalidas");
  const c = { ...p.data, webhook_key: id("wh") + id("k") };
  const state = await connectionStatus(c);
  const identity = state.connected ? await deviceIdentity(c) : undefined;
  await sql(
    env.DB,
    "UPDATE settings SET connection_cipher=?,connection_generation=connection_generation+1,sends_paused=1 WHERE id=1",
    await seal({ ...c, device_identity: identity }, env.ENCRYPTION_KEY),
  ).run();
  return {
    configured: true,
    connected: state.connected,
    webhook: `${env.PUBLIC_ORIGIN}/webhooks/zapi/${c.webhook_key}`,
    sends_paused: true,
    next: state.connected
      ? "Configure os callbacks e habilite envios após o teste controlado."
      : "Pareie o número na Z-API e salve novamente para verificar o remetente.",
  };
}
export async function webhookAuthorized(
  env: AppEnv,
  key: string,
  instance: unknown,
) {
  const c = await getConnection(env);
  if (!(await equal(key, c.credentials.webhook_key)))
    throw new SafeError("callback_nao_autorizado", 401);
  if (instance !== c.credentials.instance_id)
    throw new SafeError("callback_instancia_diverge", 403);
  return c.connection_generation;
}
