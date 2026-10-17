# Homologação complementar — 17/10/2026

Produção: https://elo.robsonlins.workers.dev. Worker `5f5103d`, versão `16fe1435-291e-428b-aab3-8feb98d3023b`. Sem mudança de código ou novo deploy nesta rodada. [Assertivas sanitizadas](homologacao-complementar.json).

## Envio aprovado à Lainny

A Skill approve mostrou destinatário e conteúdo exatos no chat. Após confirmação humana em nova resposta, o conector nativo Elo instalado no **Codex** executou uma vez. O backend registrou uma execução às **14:32:50.253 UTC**, aceite às **14:32:51.625 UTC** e a mesma ação foi consultada como **delivered**, reconferida às **14:59:08 UTC**. Não foi escrita direta no banco, nem envio pela interface web do ChatGPT. Não houve reenvio. O rascunho anterior perdeu a validade e permaneceu sem execução; seu status persistido ainda era `awaiting_approval`.

A confirmação de entrega veio do estado atualizado por callback; não há evento `delivered` adicional em `action_events`. Entregue não prova leitura. Uma execução observada não constitui garantia universal de exatamente uma entrega pelo provedor. Conteúdo real, identificadores de ação/contato/provedor e endereço do destinatário foram omitidos.

Mapeamento #2: preparação e approve (#ac-31.1/#ac-32.1), consumo observado e rascunho anterior não executado (parte de #ac-33.1), aceite distinto de entrega (#ac-35.1), vínculo da mesma ação ao resultado (parte de #ac-40.1). Concorrência, invalidação material e timeout continuam com evidência controlada própria; esta rodada não os simula em WhatsApp real.

## Cron técnico publicado

Uma nova fonte fictícia sem extração da Skill ficou `pending` às **14:58:32 UTC**. Após o cron de processamento, às **15:02:01 UTC**, estava `done`, com uma tentativa. O MCP retornou uma preferência confirmada e uma tarefa aberta do consultor para **24/10/2026**, ambas ligadas à fonte. A fonte de comparação criada pela Skill continuou aplicada, com **zero tentativas backend** antes e depois. O contador diário passou de 27 para 28 chamadas, com zero falhas registradas. Isso comprova o processamento auxiliar e a separação dos produtores nesse recorte; não é agendamento Work/Cowork nem deduplicação semântica universal.

## ChatGPT Work e Claude

O teste único autorizado foi salvo no Work para **17/10/2026 às 12h05 America/Fortaleza**, depois do ensaio manual da Skill instalada. Às **12h06min21s**, a consulta da tarefa retornou `last_run_time=null` e `next_run_time=null`. Não apareceu resultado agendado; a causa não foi determinada. Não foi usado “executar agora” para fabricar prova. A pausa foi confirmada com `is_enabled=false`, `next_run_time=null` e `last_run_time=null`, preservando o registro; o aceite de execução agendada continua pendente.

A sessão Claude Team foi encerrada somente neste navegador e o login pessoal foi concluído. Na conta pessoal **Free**, “Add custom connector” aparece desabilitado. Não foi possível conectar o Elo; nenhum outro conector foi removido e nenhum plano foi comprado. A descrição acessível do botão confirmou: “Free plan allows 1 custom connector. Upgrade for more.” A vaga de conector personalizado já estava ocupada; substituir conexão existente depende da escolha do dono. Compatibilidade real do Elo no Claude continua pendente.

## Pendências materiais

Issues #1–#4 continuam abertas: jornadas Claude e aparelho físico, execução agendada autenticada, renovação/revogação por cliente, revisão diária integral, associação positiva em produção e piloto/avaliação humana. Os **134 testes workerd/D1 + 22 Node** e TypeScript/build referem-se ao código final já publicado e revisado no PR #9; não foram repetidos para esta atualização documental.
