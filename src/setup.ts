import type { AppEnv } from "./env";
import { requireOwner, requireSetupCsrf } from "./auth";
import { SafeError, body, sql, unseal } from "./core";
import { configureConnection, type Connection } from "./zapi";
const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const guide = "https://github.com/orobsonn/elo/blob/main/docs/operacao/";
function page(content: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Elo · Configuração</title><style>:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#182b31;background:#f5f8f8;line-height:1.5}*{box-sizing:border-box}body{margin:0;padding:48px 20px}main{max-width:560px;margin:auto}.brand{font-size:24px;font-weight:650;letter-spacing:-1px;color:#12635b;margin-bottom:40px}h1{font-size:30px;line-height:1.15;letter-spacing:-.8px;font-weight:600;margin:0 0 16px}p{color:#51656b;margin:0 0 24px}section{background:white;border:1px solid #dfe7e7;border-radius:12px;padding:28px;margin:24px 0}label{display:block;font-size:14px;font-weight:600;margin:20px 0 8px}input{display:block;width:100%;font:inherit;border:1px solid #a5b8ba;border-radius:8px;padding:12px;background:#fff}input:focus{outline:3px solid #aadbd5;outline-offset:2px}button,.button{display:inline-block;background:#12635b;color:white;border:0;border-radius:8px;padding:12px 20px;text-decoration:none;font:inherit;font-weight:600;cursor:pointer;margin:16px 0}button:focus-visible,a:focus-visible{outline:3px solid #24a69c;outline-offset:4px}small,.hint{font-size:13px;color:#61767c}small{display:block}.notice{border-left:3px solid #c79540;background:#fff9ee;padding:16px;font-size:14px;margin:24px 0}.status{color:#12635b;font-size:14px;font-weight:600}code{word-break:break-all;font-size:13px}a{color:#12635b}footer{font-size:13px;color:#61767c;margin-top:32px}@media(max-width:480px){body{padding-top:24px}section{padding:20px}.brand{margin-bottom:32px}}</style></head><body><main><div class="brand">elo<span aria-hidden="true"> ↔</span></div>${content}<footer>Memória do relacionamento, na sua infraestrutura.<br>Uso diário em Claude ou ChatGPT.</footer></main></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "strict-origin",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    },
  );
}
export function welcome() {
  return page(
    `<h1>Seu Elo começa aqui.</h1><p>Continue conversando no Claude ou ChatGPT. O Elo acrescenta memória dos contatos, combinados e próximos passos. Não é um novo assistente dentro do WhatsApp.</p><a class="button" href="/login?purpose=setup">Entrar com Cloudflare Access</a><p class="hint">Entre para consultar a configuração desta instalação. Você pode usar a memória sem conectar o WhatsApp.</p><section><h2>Antes de conectar</h2><p>Esta instalação pertence à sua conta Cloudflare. Seu cliente de IA, a infraestrutura Cloudflare, a extração de memória por IA e a Z-API têm custos separados. Confira os planos e valores atuais antes de autorizar qualquer ativação paga.</p><a href="${guide}instalacao-assistida.md">Instalar com ajuda da IA</a> · <a href="${guide}primeiro-uso.md">Entender e começar a usar</a></section>`,
  );
}
export async function setup(request: Request, env: AppEnv) {
  let owner;
  try {
    owner = await requireOwner(request, env);
  } catch {
    return Response.redirect(`${env.PUBLIC_ORIGIN}/login?purpose=setup`, 302);
  }
  let notice = "";
  if (request.method === "POST") {
    const form = new URLSearchParams(await body(request, 8192));
    await requireSetupCsrf(request, owner, env, form.get("csrf"));
    try {
      const op = form.get("op");
      if (op === "disconnect") {
        await sql(
          env.DB,
          "UPDATE settings SET connection_cipher=NULL,connection_generation=connection_generation+1,sends_paused=1 WHERE id=1",
        ).run();
        notice =
          "Conexão Elo revogada. Pareamento e dados na Z-API são administrados pelo próprio provedor.";
      } else if (op === "pause") {
        await sql(
          env.DB,
          "UPDATE settings SET sends_paused=1 WHERE id=1",
        ).run();
        notice =
          "Novos envios pausados. Envios já iniciados podem ter sido aceitos; consulte o estado no chat.";
      } else if (op === "resume") {
        const row = await sql(
          env.DB,
          "SELECT connection_cipher FROM settings WHERE id=1",
        ).first<{ connection_cipher: string | null }>();
        if (!row?.connection_cipher)
          throw new SafeError("whatsapp_nao_configurado");
        const c = await unseal<Connection>(
          row.connection_cipher,
          env.ENCRYPTION_KEY,
        );
        if (!c.device_identity) throw new SafeError("pareie_e_salve_novamente");
        await sql(
          env.DB,
          "UPDATE settings SET sends_paused=0 WHERE id=1",
        ).run();
        notice =
          "Envios habilitados. Cada mensagem continua exigindo approve individual no chat.";
      } else {
        const result = await configureConnection(env, {
          instance_id: form.get("instance_id"),
          instance_token: form.get("instance_token"),
          client_token: form.get("client_token"),
        });
        notice = `${result.connected ? "WhatsApp conectado no momento de salvar." : "WhatsApp desconectado no momento de salvar."} ${result.next}`;
      }
    } catch (error) {
      notice =
        error instanceof SafeError
          ? error.code
          : "Não foi possível salvar. Revise as credenciais na Z-API e tente novamente.";
    }
  }
  const current = await sql(
    env.DB,
    "SELECT connection_cipher,sends_paused,last_received FROM settings WHERE id=1",
  ).first<{
    connection_cipher: string | null;
    sends_paused: number;
    last_received: number | null;
  }>();
  const c = current?.connection_cipher
    ? await unseal<Connection>(current.connection_cipher, env.ENCRYPTION_KEY)
    : null;
  // Use matching help for deployed commits; development builds use current docs.
  const guide = `https://github.com/orobsonn/elo/blob/${/^[a-f0-9]{40}$/i.test(env.BUILD_COMMIT) ? env.BUILD_COMMIT : "main"}/docs/operacao/`;
  const csrf = `<input type="hidden" name="csrf" value="${escape(owner.csrf ?? "")}">`;
  return page(
    `<h1>Conecte seu WhatsApp.</h1>
    <p>Esta tela configura a conexão. O uso diário continua no Claude ou ChatGPT. As credenciais entram só aqui, nunca no chat.</p>
    ${notice ? `<div role="status" class="notice">${escape(notice)}</div>` : ""}
    <section><h2>1. Encontre os três dados</h2>
    <div class="status">${c ? "Credenciais salvas" : "Aguardando sua instância Z-API"}</div>
    ${c ? '<p class="hint">Estado atual da conexão não monitorado nesta tela. Ao salvar, o Elo consulta a conexão naquele momento.</p>' : '<p class="hint">Sem instância? Você pode pular esta etapa e usar a memória no cliente de IA.</p>'}
    <p><a href="${guide}zapi.md">Ver passo a passo com imagens do painel Z-API</a></p>
    <form method="post">${csrf}
    <label for="instance">ID da instância</label><input id="instance" name="instance_id" type="password" required autocomplete="off" maxlength="100" aria-describedby="instance-help"><small id="instance-help">Z-API → Instâncias Web → sua instância → Dados da instância web.</small>
    <label for="token">Token da instância</label><input id="token" name="instance_token" type="password" required autocomplete="new-password" maxlength="200" aria-describedby="token-help"><small id="token-help">Na mesma instância, em Credenciais. Não gere outro token se já existe um em uso.</small>
    <label for="client">Client-Token da conta</label><input id="client" name="client_token" type="password" required autocomplete="new-password" maxlength="250" aria-describedby="client-help"><small id="client-help">Fica em outra página: Segurança → Token de segurança da conta. Se ainda não existe, a IA orienta a criação. Esse token atende a conta Z-API, não só esta instância.</small>
    <button>Salvar e verificar conexão</button></form>
    <small>Ao salvar novamente, o endereço de recebimento muda e as aprovações anteriores deixam de executar. Atualize os endereços na Z-API e prepare novamente as mensagens pendentes.</small></section>
    ${c ? `<section><h2>2. Configure o recebimento</h2>
    <p>Webhooks ou callbacks são os avisos que a Z-API envia ao Elo quando chega uma mensagem ou muda o estado de um envio. Ao ativá-los, novas conversas podem começar a ser armazenadas. Autorize essa captura antes de continuar.</p>
    <p>Na Z-API, abra sua instância → Webhooks e configurações gerais. Use o endereço privado abaixo em <strong>Ao receber</strong>, <strong>Ao enviar</strong> e <strong>Receber status da mensagem</strong>. Em Ao receber, ative <strong>Notificar as enviadas por mim também</strong>. Não marque Ignorar webhook para esses eventos.</p>
    <code>${escape(env.PUBLIC_ORIGIN + "/webhooks/zapi/" + c.webhook_key)}</code>
    <p class="hint">Este endereço é privado: não cole no chat, em imagens ou no suporte. A IA pode preencher por uma superfície protegida; se isso não estiver disponível, copie diretamente entre os painéis.</p>
    <div class="status">${current?.last_received ? "Recebimento já observado" : "Primeiro recebimento ainda não observado"}</div>
    <p class="hint">Um recebimento anterior não comprova conexão atual nem histórico completo; pode pertencer a uma configuração anterior. Teste uma mensagem fictícia com um contato controlado. Não há importação automática de conversas antigas; mídia não é analisada.</p></section>
    <section><h2>3. Escolha se permite envios</h2><p>${current?.sends_paused ? "Novos envios estão pausados." : "Novos envios aprovados estão habilitados."} Cada mensagem exige conferir pessoa e texto e aprovar no chat.</p>
    <p class="hint">Habilitar envios não ativa o recebimento. Pausar envios não interrompe a captura; revogar aqui remove a conexão do Elo, mas o pareamento na Z-API é administrado no provedor.</p>
    <form method="post">${csrf}<button name="op" value="${current?.sends_paused ? "resume" : "pause"}">${current?.sends_paused ? "Habilitar envios aprovados" : "Pausar novos envios"}</button> <button name="op" value="disconnect">Revogar conexão</button></form></section>` : ""}
    <section><h2>Vamos usar seu Elo</h2><p>No cliente de IA, conecte este endereço como MCP:</p><code>${escape(env.PUBLIC_ORIGIN)}/mcp</code><p>Depois peça: <strong>“Use configurar-elo e me mostre como usar o Elo.”</strong> A apresentação explica o que você instalou e conduz um primeiro uso. Pode pular e retomar depois.</p><a href="${guide}primeiro-uso.md">Ver exemplos para começar</a></section>
    <form method="post" action="/logout">${csrf}<button>Sair</button></form>`,
  );
}
