# Memória e retenção da V0

Estado desta nota: implementação local verificada com dados sintéticos. Não prova qualidade do DeepSeek real, compatibilidade dos clientes ou execução do cron publicado. O ensaio publicado e seus custos devem ser registrados separadamente.

## Contrato de uso

As tools retornam campos explícitos, sem endereço de entrega do provedor. Conteúdo livre pode conter dados pessoais; não existe anonimização universal. A memória aceita somente `context`, `goals`, `preferences`, `agreements`, `next_steps` e `relationship`. Cada valor tem até 350 caracteres; os campos estruturados de telefone, CPF, e-mail, JID/LID e sobrenome não fazem parte do schema. Há validação adicional de padrões de identificadores, que pode rejeitar também alguns textos legítimos. A validação estrutural não certifica a verdade de uma afirmação nem detecta todos os dados pessoais escritos em linguagem natural.

| Tool | Entrada principal | Resultado e limite |
|---|---|---|
| `source_import` | `contact_id`, `source_key`, `occurred_at` em milissegundos, `text`, `kind: meeting/note` | Fonte idempotente por contato/tipo/chave; texto até 16.000 caracteres. Reimportar não altera a origem nem prolonga a retenção. |
| `memory_write` | `contact_id`, `source_id`, `source_version` opcional, `field`, `value`, `certainty: explicit/inferred/uncertain`, `reason` opcional | Fato explícito novo pode confirmar. Inferência, dúvida e conflito ficam pendentes. Mesmo valor já confirmado recebe uma origem de apoio (`supporting`). |
| `memory_get` | `contact_id`, `cursor` e `limit` opcionais | Até 50 fatos por página, datas opcionais e interações distintas; origem/data/registro/confirmação, revisão e disponibilidade da fonte. Datas têm limite próprio de 50 e `dates_complete`. |
| `memory_review` | `id`, `decision: confirm/correct/discard`, `value` obrigatório na correção | Correção cria nova revisão; a anterior fica `superseded`. Confirmar pode substituir o confirmado anterior do mesmo campo. |
| `task_write` | Contato/fonte, assunto, motivo, responsável opcional, `due_date`, `date_note`, estado opcional | Tarefa idempotente por contato/fonte/assunto/data inicial; texto do modelo não pode concluir tarefa. Data incerta deve ficar sem `due_date`. |
| `tasks_get` | Contato, estado opcional, cursor/limite | Até 50 tarefas por página, inclusive retornos futuros e fontes expiradas. |
| `task_review` | `id`, `contact_id`, estado, prazo/nota opcionais | Conclui/reabre/descarta/ajusta prazo sem marcar mensagens avaliadas ou enviar. Funciona depois da expiração da fonte. |
| `date_write` | Contato, `relation: self/spouse/child/other`, rótulo, mês/dia, regra de 29/02 | Não exige ano nem infere idade. Em 29/02, exige `feb28`, `mar01` ou `leap_only`; fora de 29/02 a regra padrão não altera a data. |
| `interaction_record` | Contato/fonte, `kind: meeting/relevant`, instante | Registra evento explícito. Última mensagem, último envio aceito/entregue, reunião e contato relevante continuam distintos. |
| `attention_get` | Contato/dia/fuso/limite opcionais | Prazos vencidos ou sem data, informações a avaliar, datas do dia, cadência e contagem ainda não avaliada. Retornos futuros permanecem em `tasks_get`. Indica cobertura limitada. |
| `review_page` | Dia/fuso ou `run_id` + `cursor` persistido; limite opcional | Snapshot de fontes capturadas pelo dia local de **ingresso** (`received_at`), preservando `occurred_at`. Até 50 por página. Token CAS impede dois leitores de avançarem a mesma página. |
| `review_complete` | `run_id` e `page_token` da última página | Só conclui após a página final, sem fonte indisponível no snapshot. Leitura parcial não conclui; mensagem tardia com sequência nova aparece na contagem seguinte. |

O fuso padrão é `America/Fortaleza`, configurável pela instalação. As janelas usam o calendário do fuso, sem presumir UTC ou deslocamento fixo. Cobertura declarada é da base capturada, nunca garantia de integridade do WhatsApp. Se `review_page` retornar `unavailable_count > 0`, a revisão não pode declarar cobertura completa desse snapshot; histórico expirado ou mídia sem representação utilizável não foi lido.

A fonte de uma mensagem inclui a direção: `in` é a fala do contato; `out` é a fala do consultor. A SQL compartilhada por Skill e extração impede confirmação automática de fatos baseados em mensagem `out` ou sem direção `in`, mesmo se o modelo declarar `explicit`; esses candidatos ficam pendentes. Reuniões/anotações autorizadas ainda dependem de atribuição semântica correta pelo modelo e revisão das ambiguidades.

## Extração auxiliar

Modelo inicial configurável: `@cf/deepseek-ai/deepseek-v4-flash-0731`, sem failover automático. Ativação respeita `AI_ENABLED`. O perfil implementado usa `max_completion_tokens: 1600`, `reasoning_effort: none`, temperatura zero e `response_format` JSON schema. O schema enviado permite opcionais (`strict: false` no provedor); a resposta inteira passa por Zod `strict` local, allowlist, atribuição ao contato/fonte e validação dos candidatos antes de qualquer escrita. Respostas DeepSeek em `choices[0].message.content` e respostas em `response` são aceitas. Truncamento reportado pelo provedor, JSON inválido, campo extra ou candidato inválido impedem a escrita do lote inteiro.

Limites efetivos:

- Até 3 jobs por chamada de `runExtraction`; o cron técnico é integrado pelo Worker principal.
- Até 50 reservas de chamadas por dia UTC na tabela `usage`, com incremento atômico junto à aquisição da lease. Uma reserva pode superestimar chamadas efetivas se o processo morrer antes da chamada ao provedor.
- Até 3 tentativas por versão de fonte, com backoff de 1 minuto após a primeira falha e 4 minutos após a segunda. A terceira encerra como `failed`.
- Lease de 90 segundos, recuperável depois do vencimento; timeout local da inferência de 40 segundos. O timeout local não comprova cancelamento do processamento/custo no provedor.
- Contexto atual: primeiros 6.000 caracteres, com sinalização de corte; até 4 fontes anteriores do mesmo contato, 700 caracteres de cada; até 16 itens recentes de memória confirmada/pendente. JSON e instrução têm custo adicional. Não se presume equivalência exata entre caracteres e tokens.
- Até 12 fatos e 6 tarefas na resposta; limite de saída de 1.600 tokens. Fontes longas/contexto cortado podem causar omissões; a base não é relida integralmente a cada mensagem.

A transação de escrita revalida ID/contato, versão da fonte, geração do contato e dos dados, lease, exclusão, existência de conteúdo e expiração no SQLite. Alteração, exclusão, restauração ou expiração durante a inferência impede o commit antigo. A decisão confirmado/pendente ocorre no `INSERT`, protegida também pelo índice único de confirmado por contato/campo. O webhook não aguarda esse processamento.

## Retenção e origem

`expire` remove conteúdo das fontes vencidas e encerra jobs associados. O prazo é de até 30 dias da data original; uma recepção tardia não reinicia o relógio. Reuniões e anotações obedecem ao mesmo prazo. Importação já vencida persiste somente a referência necessária à idempotência, sem texto bruto. As fontes permanecem como metadados de origem e deduplicação, com conteúdo nulo; memória concisa e tarefas podem sobreviver e passam a indicar fonte indisponível. Tombstones e hashes de deduplicação não são apagados por esse expurgo, evitando ressuscitar histórico por replay. Retenção de conteúdo das ações de envio é responsabilidade do módulo de ações; backups/Time Travel e restauração exigem o procedimento operacional da instalação.

## Uso e custo

A tabela `usage` registra reservas diárias, tokens de entrada/saída reportados e falhas. Tokens ausentes ou inválidos não são inventados: acumulam zero; `runExtraction` informa `usage_missing` quando não recebe o objeto de uso. Por isso o total não deve ser apresentado como fatura completa quando faltarem metadados. Não há estimativa de tokens por tamanho do texto na cobrança registrada.

A [documentação oficial do modelo](https://developers.cloudflare.com/workers-ai/models/deepseek-v4-flash-0731/) consultada em 2026-10-16 exige Workers Paid ou créditos de AI Gateway e informa US$0,44 por milhão de tokens de entrada, US$1,32 por milhão de saída e US$0,014 por milhão de entrada em cache. Para tokens sem cache, estimativa = `input_tokens * 0.44 / 1e6 + output_tokens * 1.32 / 1e6`. A métrica local não separa cache. Preços e custos de outros serviços precisam de conferência na publicação; US$5 não é um teto presumido de toda a solução.

## Evidência local e pendências

TDD inicial: `npm test -- tests/memory.test.ts tests/extraction.test.ts` falhou em 14 testes com stubs `not implemented`; implementação deixou os 14 verdes. Regressões adicionais foram executadas em ciclos red/green para tarefa retida, cobertura indisponível, direção de autoria e atenção diária. A rodada E3 final passou **27/27 testes** no workerd, usando D1 real isolado por teste e IA fake controlada. Inclui conflito concorrente, reimportação, correção rastreável, fonte cruzada/schema inválido sem escrita parcial, edição/exclusão/expiração durante inferência, retomada/concorrência da revisão, retenção de pendente e orçamento concorrente 49→50.

`npm run check` passou antes das últimas alterações paralelas do projeto. A rodada mais recente mostrou somente um erro externo ao E3, em `tests/operations.test.ts:11`: uso de `.json` numa `Promise<Response>`. A suíte completa executada durante integração passou 53/54; a falha então existente foi `tests/capture.test.ts:47`, corrida de recepção/exclusão. O responsável pelo código principal recebeu esses resultados para corrigir e verificar o conjunto final. Estes números não substituem a verificação posterior do commit integrado.

Ainda falta validar o schema efetivo e qualidade/custo no DeepSeek publicado. Três casos sintéticos sugeridos, em incrementos separados:

1. **Conflito:** contato afirma viagem em novembro; nova mensagem afirma dezembro. Esperado: novembro confirmado, dezembro pendente, sem sobrescrever; registrar origem de cada um.
2. **Autoria/ambiguidade:** o consultor envia “Tenho dois filhos”; o contato responde “Meu irmão tem três”. Esperado: nenhum fato confirmado dizendo que o contato tem dois ou três filhos; candidato indevido do `out` é forçado a pendente. A fala do irmão testa semântica real, além do schema.
3. **Contexto incremental/data:** contato pede “vamos conversar em novembro”; depois esclarece o dia. Esperado: nenhuma tarefa atrasada em outubro, data inicialmente ausente/incerta até haver informação suficiente, mesma pessoa e origem corretas; sem reimportação multiplicar tarefas. Registrar omissões, corte de contexto, falhas, tokens e custo sem reclassificar silenciosamente um caso que falhou.

A migration 0002 registra versões mostradas em review_items e reviewed_version. Edições reabrem avaliação mesmo quando recebidas em outro dia; concluir versões mostradas não declara novas versões lidas.
