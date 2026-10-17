# Validação da instalação pessoal — 16–17/10/2026 (Fortaleza)

URL: **https://elo.robsonlins.workers.dev**. MCP: **https://elo.robsonlins.workers.dev/mcp**.
Conta confirmada por conector e Wrangler: **Robson Lins**, `ab9f6d8988145943bf8bbab313e45e6e`. Worker `elo`, D1 `elo-data`, KV `elo-oauth`. Nenhum domínio comprado nem recurso de outro projeto alterado.

## Código e publicação

[PR #5](https://github.com/orobsonn/elo/pull/5) integrado; [PR #6](https://github.com/orobsonn/elo/pull/6) contém correções encontradas na validação real. Código do Worker corrigido: `bd87021`. Versão **`1a529373-d6b0-49f2-b031-b5b41f9700bf`**, promovida a **100%** após preview saudável, rejeição das três rotas privadas no preview, revisão independente e CI verde.

CI do código corrigido: [push](https://github.com/orobsonn/elo/actions/runs/38996827169), [PR](https://github.com/orobsonn/elo/actions/runs/38996830442). 95 testes workerd/D1 e 9 testes Node do instalador; TypeScript/build aprovados. Z-API, JWKS/OIDC e IA são respostas controladas nos testes locais. Concorrência usa o D1 real local do workerd. Não é prova de APIs externas ou clientes reais.

`node scripts/smoke.mjs` na produção corrigida: **6/6** — página, saúde com D1, MCP sem login 401, bearer forjado 401, webhook sem configuração fechado e descoberta OAuth/PKCE S256. Saúde retornou a versão e o commit acima. Versão anterior `faed03b8-fdf0-402b-9334-523f8cba1c02` também passou nos smokes, mas não contém as correções de extração; não recomendada como rollback da extração. Bootstrap fechado anterior: `3f2bc7db-fc25-42aa-86a7-fb6304e6911b` (serviço indisponível, sem exposição de dados).

Rollback do Worker não desfaz D1. Não promover versão com epoch antigo após restauração/rotação; publicar código anterior com o epoch atual. Migrações 0001–0004 são aditivas e aplicadas.

## Access e MCP

Aplicação SaaS/OIDC, callback, política exclusiva do dono, secrets e bindings criados por API/CLI sem exigir edição técnica do usuário. Organização existente preservada. Discovery e JWKS públicos Access retornaram 200, issuer exato e chaves RS256. Fluxo OAuth real chegou à verificação por e-mail na aba aberta. **Login, consentimento, token, renovação e tools MCP autenticadas aguardam o dono completar a verificação.** Sem senha estática, cookie-gate como substituto ou endpoint público de teste.

`node scripts/live-mcp.mjs` retoma o teste pelo login normal. Códigos/tokens ficam fora do repo e não são impressos. O teste só aprova refresh depois de usar o token renovado numa chamada MCP. Isso ainda não prova Claude/ChatGPT, smartphone, recorrência ou instalação por pessoa leiga.

## DeepSeek e retenção

Ensaios apenas sintéticos. `benchmark-inputs.json` guarda IDs e textos inventados; seeding administrativo D1 não prova recebimento Z-API. O processamento é do cron técnico publicado, sem espera no webhook nem scheduler de agentes. Snapshots registram versão, jobs, memória, tarefas e uso.

Quatro chamadas adicionais reais pela REST Cloudflare estão em `benchmark-provider.json`: a primeira configuração documentada consumiu 1600 tokens sem conteúdo final; `chat_template_kwargs.thinking=false` + schema explícito no system entregaram JSON sem raciocínio. A instrução sozinha ainda reemitiu uma preferência somente do contexto anterior. O contrato corrigido exige trecho literal da fonte atual para cada candidato e valida o lote inteiro antes de escrever. A última chamada trouxe somente a correção da viagem, com evidência atual. Presença literal não garante interpretação verdadeira: o benchmark confere também conteúdo e fonte.

O cron corrigido processou **6 fontes em duas etapas, uma tentativa por fonte**, com JSON validado. [Primeira etapa](benchmark-fixed-first.json) e [segunda](benchmark-fixed-second.json): viagem/preferência claras registradas, fala do consultor não consolidada como fato do contato, correção novembro→dezembro pendente sem sobrescrever o fato anterior, preferência antiga não reatribuída à correção, mês ambíguo sem vencimento inventado e nova meta de italiano registrada. A referência REST com contexto suficiente concordou com a correção. Asserções separadas em `benchmark-first-assertions.json` e `benchmark-second-assertions.json`.

Limite observado: dois fatos independentes no campo amplo `context` podem gerar conflito conservador e pedir revisão; neste corpus, informação do irmão e ausência de filhos. Isso reduz automação, não atribui os filhos do irmão ao contato. A amostra pequena não valida toda semântica ou truncamento de grandes diálogos.

Fonte sintética de 31 dias teve texto removido pelo cron e estado encerrado; memória concisa pendente permaneceu. O corte nas consultas/exportação é adicional à limpeza, validado localmente. O cron foi temporariamente acelerado para o ensaio e devolvido a `*/10 * * * *`; nenhum cron Work/Cowork foi criado. O limite permanece 3 jobs por execução, 3 tentativas por fonte, 50 chamadas/dia UTC, 6000 caracteres atuais + até 4 fontes anteriores de 700 caracteres, 16 itens de memória e 1600 tokens de saída. Não há troca silenciosa para Scout.

## Recuperação e operação

Ensaio isolado em `elo-recovery-check`, D1 `d4888a47-e750-40d8-946a-866c11210ad0`; nunca restaurou `elo-data`. Resultado observado por bookmark exato: memória “Aprender francês” restaurada, texto expirado nulo, ação preparada cancelada, envios pausados, geração de dados avançada e sessões removidas preservando somente owner_binding. Evidência em `recuperacao-resultado.json`. O ensaio por timestamp escolheu snapshot anterior ao fixture; repetição por bookmark evitou confundir ausência com preservação. Teste do gate de reabertura detectou configuração isolada incompleta e reaplicou manutenção. Após completar o fixture isolado (KV próprio e OWNER_EMAIL sintético), a recuperação terminou e reabriu a versão `bcc09b20-65ba-4f59-8ea1-49e4a544b9dd`: `/health` confirmou versão exata e `/mcp` recusou acesso sem login com 401. Não equivale a testar token OAuth antigo real nem uma pessoa leiga executando recuperação. Worker/D1/KV `elo-recovery-check` contêm somente este fixture isolado, sem cron.

Não há instância Z-API, conexão WhatsApp, conversa ou envio real. Adaptador, ingestão, associação explícita de identidade, estados fora de ordem, replay, approve individual, CAS concorrente e timeout incerto estão cobertos localmente com provedor controlado. A Skill exige nova aprovação humana no chat; backend não alega provar autoria humana independentemente do modelo.

## Custos observados

Preços consultados em 17/10/2026 UTC: [DeepSeek Cloudflare](https://developers.cloudflare.com/workers-ai/models/deepseek-v4-flash-0731/) — US$0,44/M entrada, US$1,32/M saída, US$0,014/M entrada em cache. Paid/créditos exigidos. Quatro ensaios REST consumiram 3195 tokens de entrada e 2050 de saída: **US$0,004112** sem desconto de cache; não é fatura, inclui tentativa truncada. O cron total desta validação fez **12 chamadas**, 9388 tokens de entrada/4082 de saída: **US$0,009523** sem desconto de cache. Inclui 6 chamadas anteriores/repetidas durante diagnóstico; os 6 jobs finais corrigidos representam 6436 tokens de entrada/1007 de saída (**US$0,004161**). Nenhum contador foi zerado para ocultar diagnóstico. Total estimado das 16 chamadas pagas, incluindo as quatro REST: **US$0,013635**, menos de US$0,02. Os contadores não são fatura; caches/franquias podem mudar cobrança.

Amostra GraphQL do Worker, 02:30–03:01 UTC: 51 requisições, zero exceções do runtime, CPU p50 1639µs/p99 32332µs. Respostas esperadas 401/503 não são “exceções” dessa métrica. D1 da instalação em 17/10, consulta inicial: 30 consultas de leitura/46 escrita, 218 linhas lidas/143 escritas; inclui provisionamento e administração sintética e a API ainda refletia a amostra inicial, com atraso; não representa todo o processamento final. Resposta sanitizada em `metricas-publicadas.json`. Tamanho inicial observado 245760 bytes. Amostra pequena não representa piloto, p95 ou mês real.

[D1 Paid](https://developers.cloudflare.com/d1/platform/pricing/) inclui franquias; cobrança marginal depende do consumo agregado da conta, que não foi atribuído ao Elo. Não somar US$5 como teto: plano Workers, Z-API, cliente de IA e rotinas têm cobranças distintas. Nenhum plano adicional comprado. Time Travel/backups e histórico dos clientes têm retenções separadas.

## Aceites pendentes

Issues [#1](https://github.com/orobsonn/elo/issues/1), [#2](https://github.com/orobsonn/elo/issues/2), [#3](https://github.com/orobsonn/elo/issues/3) e [#4](https://github.com/orobsonn/elo/issues/4) ficam abertas. Implementação entregue não encerra seus aceites materiais ainda não exercitados.

1. Dono concluir login/consentimento Access; conectar cada cliente e instalar as quatro Skills, testar leitura/escrita e renovação/revogação reais.
2. Quando desejar WhatsApp: contratar instância Z-API, inserir credenciais na tela protegida, autorizar número controlado, parear/configurar webhook e aprovar ensaio real individual.
3. Validar no celular, executar rotina Work/Cowork no horário solicitado e fazer piloto com pessoa leiga, incluindo recuperação e “Otimize meu processo”. Nenhuma recorrência criada sem pedido de horário/rotina.
