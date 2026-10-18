# Consumo observado e limites

Conferência em **17/10/2026, 15h39 America/Fortaleza**. [Dados agregados e plano de consulta](../implementacao/perfil-uso-1710.json). Somente o Worker `elo` e a D1 `elo-data` da conta pessoal. A amostra mistura ensaios sintéticos e uso real: não é um mês representativo de consultoria nem fatura.

| Camada | Medição | Recorte e limite |
|---|---|---|
| Worker | 1.611 requisições, 89 subrequests, zero exceções de runtime; CPU p50 5,476ms e p99 43,208ms | 17/10 de 00h a 15h30 Fortaleza. CPU não é latência percebida no Claude/ChatGPT; respostas 401/503 esperadas não são exceções de runtime. P95 não foi medido. |
| D1 | 6.099 consultas de leitura, 674 de escrita; 13.640 linhas lidas, 1.645 escritas | Analytics do dia UTC 17/10 até a consulta, com possível atraso; inclui administração/homologação. Não é custo por mensagem. |
| Armazenamento | 294.912 bytes no banco; 46 fontes, 35 mensagens, 38 itens de memória, 8 tarefas; 31 textos presentes | Snapshot às 15h38min55s Fortaleza. Os 17 contatos incluem fixtures; não são 17 clientes reais. |
| Texto bruto | 2.305 caracteres; 2.387 bytes UTF-8 | Bytes de texto, sem contar metadados/índices. Não são bytes de mídia recebida. |
| Formatos sem texto | 12 eventos classificados sem representação textual utilizável | Não informa subtipo nem tamanho do arquivo externo; não houve download/transcrição de mídia. |
| IA auxiliar | 33 chamadas; 32.200 tokens de entrada, 7.172 de saída; zero falhas registradas no contador | Contador backend do dia UTC. Não inclui chamadas REST manuais nem uso de Claude/ChatGPT; zero falha técnica não certifica qualidade semântica. |

## Estimativa de inferência

O [DeepSeek V4 Flash na Cloudflare](https://developers.cloudflare.com/workers-ai/models/deepseek-v4-flash-0731/) exige Paid/créditos e publica US$0,44 por milhão de tokens de entrada e US$1,32 por milhão de saída. Consulta de preço em 17/10. Sem desconto de cache, franquias, impostos ou câmbio:

`(32.200 × 0,44 + 7.172 × 1,32) / 1.000.000 = US$0,02363504`

Esse valor é a estimativa de tabela das 33 chamadas do contador, não o total histórico do projeto. As chamadas REST de experimentação anteriores têm registro separado na validação publicada; não foram somadas duas vezes.

Projeções ilustrativas usando **a mesma média observada**, sem prever alterações de contexto/retries:

| Chamadas no período | Estimativa de tabela |
|---|---|
| 100 | US$0,07162 |
| 500 | US$0,35811 |
| 1.500 | US$1,07432 |

Não significa orçamento máximo. O código limita a extração auxiliar a 50 tentativas/dia UTC, 3 tentativas por fonte e 3 fontes por ciclo técnico de 10 minutos. Retries consomem esse limite. Portanto 50 mensagens novas por dia não são garantia de processamento diário se houver retries; acima do teto, a fila espera. A captura continua independente da inferência, respeitando a retenção de 30 dias. Não foi aumentado o teto nem contratado recurso pago para esta medição.

Na amostra auxiliar havia 2 fontes pendentes com texto e zero em processamento, ambas recebidas poucos minutos antes do ciclo seguinte; às 15h41, as mesmas duas estavam `done`, com uma tentativa cada, após o ciclo técnico seguinte. Isso comprova andamento desses jobs publicados, sem validar a semântica da extração nem agendamento Work/Cowork; não é prova de ausência de fila ao longo do dia.

## D1 e crescimento

A [rodada isolada posterior](../implementacao/revisao-carga-1710.md) mediu 30.002 fontes, trinta dias e mil fontes principais por dia. A paginação completa leu 1.988.424 linhas antes e 190.808 com dois índices + atualização de estatísticas na QA; o tempo SQL somado foi de 987,949 para 155,670 ms. Não é latência MCP nem capacidade mensal comprovada. A migração 0006 já acrescentou os dois índices à instalação pessoal, sem executar optimize nela. A primeira página ainda percorreu aproximadamente 29 mil linhas: **não há prova de custo constante por dia**.

O expurgo apaga texto bruto; metadados/tombstones e memória têm vida distinta e também ocupam espaço. O ensaio não mede crescimento prolongado desses metadados ou grande acúmulo de edições pendentes. Não extrapole a amostra anterior de 294.912 bytes por regra de três para todo o produto.

Exemplo aritmético, sem afirmar carga suportada: 100 mensagens/dia × 30 dias × 500 caracteres =1,5 milhão de caracteres brutos ativos. Em UTF-8, o texto isolado pode ocupar até 6 MB nessa hipótese; metadados, índices, ações, memória, pendências e backups são adicionais. Depois de 30 dias o texto expira; isso não implica que todas as linhas/metadados desapareçam.

A [cobrança D1](https://developers.cloudflare.com/d1/platform/pricing/) depende de linhas lidas/escritas e armazenamento agregado da conta, incluindo franquias. Essa amostra do Elo não mede os outros projetos e não permite determinar cobrança marginal da conta. Índices também têm custo de escrita/armazenamento. Time Travel/backups conservam versões por janela própria.

## Custos separados e próximos aceites

Workers, inferência, Z-API e os clientes de IA têm cobranças distintas. Plano Free no Claude permitiu Skills manuais, mas a conta exibiu upgrade para Cowork; nenhum plano foi comprado. O preço contratado da Z-API e a fatura dos clientes não foram consultados. US$5 não é teto da stack.

Este perfil avança #ac-46.1 com medidas atuais e premissas explícitas. Permanecem pendentes a carga representativa por carteira, crescimento prolongado, latência de ponta a ponta e custo real de fatura; não anunciar capacidade mensal ou gratuidade universal a partir dele.
