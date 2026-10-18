import type { AppEnv } from "./env";
import { makeOAuth, requireOwner } from "./auth";
import { mcp } from "./mcp";
import { welcome, setup } from "./setup";
import { ingest } from "./capture";
import { getConnection, webhookAuthorized } from "./zapi";
import { SafeError, jsonBody, sql, diagnostic } from "./core";
import { expire } from "./memory";
import { runExtraction } from "./extraction";
import { recoverActions } from "./actions";
import { exportData } from "./operations";
const oauth = makeOAuth({ fetch: (request, env) => mcp(request, env) });
export default {
  async fetch(request: Request, env: AppEnv, ctx: ExecutionContext) {
    const url = new URL(request.url);
    try {
      // Health contains no tenant/customer/provider data and can validate version previews.
      if (url.pathname === "/health" && request.method === "GET") {
        await env.DB.prepare("SELECT id FROM settings WHERE id=1").first();
        return Response.json(
          {
            ok: true,
            version: env.VERSION?.id ?? "local",
            commit: env.BUILD_COMMIT ?? "development",
            database: true,
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      if (url.origin !== env.PUBLIC_ORIGIN)
        return new Response("Origem não autorizada.", { status: 403 });
      if (env.MAINTENANCE !== "false")
        return Response.json(
          { error: "manutencao_tente_depois" },
          { status: 503 },
        );
      if (url.pathname.startsWith("/webhooks/zapi/")) {
        if (request.method !== "POST")
          throw new SafeError("metodo_invalido", 405);
        // No parsed message/body before possession of callback capability is checked.
        const c = await getConnection(env);
        const key = url.pathname.slice("/webhooks/zapi/".length);
        await webhookAuthorized(env, key, c.credentials.instance_id);
        const input = await jsonBody(request);
        if (!input || typeof input !== "object")
          throw new SafeError("evento_invalido");
        const generation = await webhookAuthorized(
          env,
          key,
          (input as { instanceId?: unknown }).instanceId,
        );
        return Response.json(
          await ingest(env.DB, input, generation, env.ENCRYPTION_KEY),
        );
      }
      if (url.pathname === "/" && request.method === "GET") return welcome();
      if (
        url.pathname === "/setup" &&
        (request.method === "GET" || request.method === "POST")
      )
        return await setup(request, env);
      if (url.pathname === "/export" && request.method === "GET") {
        await requireOwner(request, env);
        return exportData(env);
      }
      return await oauth.fetch(request, env, ctx);
    } catch (error) {
      const safe =
        error instanceof SafeError
          ? error
          : new SafeError("operacao_indisponivel", 503);
      if (safe.status >= 500)
        ctx.waitUntil(diagnostic(env.DB, safe.code).catch(() => {}));
      return Response.json(
        { error: safe.code },
        { status: safe.status, headers: { "Cache-Control": "no-store" } },
      );
    }
  },
  async scheduled(
    _event: ScheduledController,
    env: AppEnv,
    ctx: ExecutionContext,
  ) {
    if (env.MAINTENANCE !== "false") return;
    ctx.waitUntil(
      (async () => {
        await expire(env.DB);
        await recoverActions(env.DB);
        await env.DB.prepare(
          "DELETE FROM auth_state WHERE (key LIKE 'login:%' OR key LIKE 'flow:%' OR key LIKE 'rate:%' OR key LIKE 'session:%' OR key LIKE 'credential:%' OR key LIKE 'consent:%' OR key LIKE 'refresh:%') AND json_extract(value,'$.expires')<=unixepoch()",
        ).run();
        try {
          await runExtraction(env, 3);
        } catch {
          await diagnostic(env.DB, "extracao_pendente");
        }
      })(),
    );
  },
} satisfies ExportedHandler<AppEnv>;
