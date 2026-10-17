## Resumo + por quê

Histórico de chat sozinho não permite lembrar combinados e datas depois que as mensagens expiram. O consultor precisa de memória concisa, fatos rastreáveis e propostas de informação a avaliar na rotina.

## User journeys

- #uj-1: O consultor recupera fatos e combinados mesmo depois da expiração das mensagens, com origem e conflitos visíveis.
- #uj-2: Na revisão diária, o consultor confirma, corrige ou descarta pendências e vê retornos/aniversários sem fatos inventados.

## Critérios de aceite (testáveis e observáveis)

- [ ] #ac-21.1: Ficha contém contexto, fatos, combinados e próximos passos. A Skill registra automaticamente fatos claros sustentados pela fonte, sem pedir confirmação de cada item. Inferências, ambiguidades e conflitos ficam como informação a avaliar, distinta do confirmado. Campo ausente não é inventado. (PRD R21)
- [ ] #ac-22.1: Cada fato relevante tem origem, data do evento, registro e confirmação. Correção preserva rastreabilidade; conflito pede revisão e não sobrescreve o dado confirmado com extração incerta. (PRD R22)
- [ ] #ac-23.1: Reunião pode entrar por texto de transcrição/anotações autorizadas. Reimportar a mesma fonte não multiplica fatos e tarefas. Fatos claros podem ser consolidados automaticamente; extração ambígua ou conflitante entra para avaliação. Correções são rastreáveis. (PRD R23)
- [ ] #ac-24.1: Pendências guardam assunto, responsável quando conhecido, motivo, vencimento ou data futura e estado. “Conversar em novembro” não vira atraso em outubro. Datas relativas ambíguas pedem confirmação. (PRD R24)
- [ ] #ac-25.1: Cadência pode variar por contato e tipo de relacionamento, com adiamento e exceções. Última mensagem, último envio, última reunião e último contato relevante são informações distintas. (PRD R25)
- [ ] #ac-26.1: Brief diário junta prazos, retornos, datas, mensagens não avaliadas e informações pendentes de avaliação pelo consultor. Cada item mostra motivo, fonte disponível, contexto e ação sugerida; o consultor pode confirmar, corrigir ou descartar uma proposta. (PRD R26)
- [ ] #ac-27.1: A análise diária percorre mensagens capturadas pelo Elo no dia local solicitado, com retomada/paginação e cobertura explícita. Distingue data original da mensagem e data de ingresso. Se o limite impedir terminar, informa até onde avaliou e o que falta; não responde “nenhuma urgência” para um período parcialmente lido. Cobertura da base capturada não comprova integridade do WhatsApp ou ausência de eventos perdidos. (PRD R27)
- [ ] #ac-28.1: Distinguir marca de leitura/avaliação de conclusão de tarefa e envio de mensagem. Reexecução não duplica pendências; mensagem tardia pode entrar na próxima avaliação sem perder a data original. (PRD R28)
- [ ] #ac-29.1: Oferecer desde o início campos opcionais para aniversário do cliente, cônjuge, filhos e outras datas especiais. Consultor preenche se quiser, com vínculo e data suficiente; não exigir ano de nascimento ou cadastro completo do familiar. A Skill propõe felicitação; não envia automaticamente. (PRD R29)
- [ ] #ac-30.1: Consulta antes da reunião recupera objetivos, mudanças, combinados e origem. A Skill genérica ajuda o consultor a criar/adaptar uma Skill de GPS a partir do próprio modelo, dos fatos e das recomendações que ele definir; identifica lacunas e orienta revisão da entrega. Não exige gerador ou Skill GPS fixa no backend. (PRD R30)
- [ ] #ac-45.1: Histórico bruto é removido do armazenamento ativo em até 30 dias da data original da mensagem; consultas aplicam o corte mesmo durante limpeza pendente. Evento tardio não reinicia o prazo. Fonte sem data confiável tem retenção conservadora e diagnóstico explícito, sem prolongamento silencioso; detalhe do tratamento é da engenharia. Fatos claros registrados automaticamente e propostas concisas a avaliar podem permanecer na memória, sem copiar o histórico integral. Fonte expirada é sinalizada. Backups/Time Travel e sua recuperação residual são documentados. Exclusão não recria histórico por replay; restauração reaplica retenção antes de liberar consultas, bloqueia envios e invalida autorizações antigas. (PRD R45)
- [ ] #ac-49.1: Extração auxiliar backend processa novidades em lotes limitados com generativo, sem Clef obrigatório. Valida schema, contato, campos, fontes e estado antes da escrita; fato claro sem conflito pode entrar automaticamente, demais candidatos ficam pendentes. Falha não perde mensagens, não marca período incompleto como concluído nem estende retenção. Extração e Skills compartilham escrita idempotente, origem e regras de conflito. Qualidade incremental, formato, custo e limite de execução são aceites da entrega. (PRD R49)

### Verificações complementares da entrega

- [ ] Modelo inicial @cf/deepseek-ai/deepseek-v4-flash-0731 é configurável; Scout é alternativa explícita a validar, sem roteador/failover silencioso. Mostrar exigência de Paid/créditos e custo antes de ativar. Não alegar benchmark DeepSeek a partir do ensaio Llama 3.3.
- [ ] Extrair candidatos com schema compatível e validar contato, campo, tipo, fonte, estado e duplicação antes da escrita. Fato explícito novo sem conflito pode entrar automaticamente; inferência, ambiguidade e contradição ficam pendentes sem sobrescrever memória confirmada.
- [ ] Entrada/saída/retries/contexto por lote são limitados. ACK webhook não espera inferência; queda do modelo preserva recepção e trabalho pendente. Processamento/retry técnicos são permitidos, sem novo agendador de agentes.
- [ ] Reunião/anotações e mensagens compartilham origem e escrita idempotente. Reprocessamento ou revisão pela Skill não duplica fatos/tarefas; correções e exclusões de fontes sinalizam revisão do que foi derivado.
- [ ] Análise diária tem fuso, janela, cursor e cobertura; distingue envio original de ingresso tardio. Não avança conclusão total após leitura parcial nem afirma ausência de urgência se não terminou. Testar contexto incremental, não apenas extração de uma conversa inteira.
- [ ] Cadência, retornos e aniversários cliente/cônjuge/filhos/datas especiais são opcionais. Datas incertas não viram certezas e texto genérico não conclui reunião/tarefa; descrever o comportamento de 29/02 e de data relativa.
- [ ] Informação concisa pendente sobrevive à expiração como item a avaliar, com contato, motivo, origem/data e estado. Skill permite confirmar/corrigir/descartar; não copiar conversa integral para memória nem guardar deliberadamente identificadores restritos como fatos.
- [ ] Histórico bruto ativo expira em até 30 dias da data original; consultas cortam antes mesmo da limpeza. Evento tardio não reinicia prazo. Fonte expirada é indicada. Exclusão/replay não ressuscitam dados; restauração reaplica retenção e mantém envios bloqueados/autorização antiga inválida.
- [ ] Reutilizar corpus sintético e incluir novos casos de conflito, falso fato, contexto cruzado, data ambígua e truncamento. Medir falhas/omissões/custo e testar schema efetivo do DeepSeek; scores e validação estrutural não certificam verdade semântica.

## Escopo

Memória, fontes, fatos, conflitos, pendências, datas opcionais, cadência/contato relevante e estado de avaliação. Extração generativa auxiliar no backend por novidades/contexto limitado; Skills consomem dados para revisão/brief. Modelo inicial DeepSeek V4 Flash na Cloudflare, sem Clef obrigatório.

Base: [PRD v1.1](https://github.com/orobsonn/elo/blob/main/docs/prd/elo-v1.md). Padrão: `.pi/harness/skills/creating-issues/SKILL.md`, formulário `harness-task.yml` e contratos de entrega/governança. Este texto define resultado/aceites, não sela plano técnico nem requer cerimônia do harness. Execução por goal será autorizada em outra sessão; a label `harness:ready` indica metadados validados conforme o harness; não autoriza configurar um scheduler ou iniciar a implementação nesta sessão.

**Paths permitidos e exclusões:** Pode: src/ de memória, fontes, pendências, datas, extração/retentativa/expurgo e tools correspondentes; migrations/ e índices; testes/fixtures sintéticos; configuração de binding/modelo e docs/ do perfil de uso. Preservar o contrato de captura e envio já entregue, com regressão quando compartilhado. Não tocar: .pi/, fontes/privadas/, resultados históricos congelados em docs/experimentos/; não criar grafo/embeddings, scheduler de agentes ou gerador GPS no backend.

## Decisões já resolvidas (opcional)

Infraestrutura individual Cloudflare; login padrão Cloudflare Access integrado ao OAuth MCP; Claude e ChatGPT; grupos/anexos fora da V0; approve por Skill no chat sem tela adicional; identificadores de entrega restritos ao backend; histórico bruto ativo até 30 dias; fatos claros automáticos e conflitos pendentes; Skills/cron no harness e Work/Cowork; única tela própria de configuração Z-API/webhook.

O escopo detalhado e as exclusões adicionais estão no PRD v1.1. Robson autorizou organizar estas quatro entregas e implementar em outra sessão por goal, sem a cerimônia do harness; testes, revisão e verificação continuam exigidos.

### Suposições do modelo (atacáveis)

DeepSeek V4 Flash é a escolha técnica inicial seguindo a preferência de Robson; schema e configuração do modelo precisam de teste no Elo, com Paid/créditos e limites de custo. Não confundir o ensaio Llama 3.3 com validação DeepSeek. Contexto incremental e mecanismo de processamento/retentativa são escolhas atacáveis.

## Dependências

```harness-deps
#1
```

#1 (https://github.com/orobsonn/elo/issues/1). Ler os contratos/estado implementados, não apenas a descrição das dependências.

## Domínio sensível?

dados/PII

## Prioridade

P1

## Tamanho estimado

L

Estas quatro issues são marcos de entrega da V0 já definidos com o operador, não mudanças pequenas. O tamanho L é explícito; na execução por goal, organizar tarefas e PRs revisáveis sem alegar que o marco inteiro cabe em 400 linhas ou retomar a cerimônia dispensada. A issue só fecha quando seus aceites materiais estiverem comprovados.

## Fora de escopo

Modelo de decisão obrigatório, releitura integral diária por padrão, embeddings/grafo, recomendações/ordens financeiras, gerador GPS no backend e cópia integral do histórico em memória durável.

## Riscos e caminhos sensíveis

Mistura de contatos, falsa consolidação, injection, escrita parcial, contexto insuficiente, custo de inferência e crescimento de memória durável. Retenção inclui limpeza ativa e recuperação residual de backups; não anunciar exclusão instantânea de serviços externos.

## Verificação e evidência de conclusão

Testes de invariantes e persistência: replay, escrita concorrente, fonte expirada, conflito e restauração. Ensaio pequeno real do DeepSeek com dados sintéticos autorizado para implementação, uso/custo reportados; geração incremental comparada com contexto suficiente. Sem enviar dados reais a modelos. Registrar achados e limitações sem ajustar o placar silenciosamente.

Registrar arquivos/diff, comandos executados e resultado no código final. Revisão adversarial independente dos caminhos críticos; corrigir achados materiais antes de fechar. Não usar só o relato do executor como evidência. Provas que exigem ação humana ou conta real ficam explicitamente pendentes, sem simular sucesso ou bloquear trabalho independente.
