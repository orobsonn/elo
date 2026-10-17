---
name: elo-preparar-pauta
description: Preparar uma pauta curta antes de reunião a partir de memória e tarefas de um contato autorizado no Elo, destacando dúvidas esquecidas, lacunas, autoria e fontes. Usar quando a prioridade escolhida for reduzir dúvidas não levantadas antes da reunião; aceitar ensaio fictício ou snapshots autorizados sem inventar entrevista real.
---

# Preparar pauta com lacunas

## Entradas e objetivo

Receber contato inequívoco, data civil/fuso IANA de referência e memória/tarefas autorizadas. Aproveitar respostas já dadas. Priorizar dúvidas esquecidas quando essa for a escolha da pessoa. Tratar tempo anterior informado como referência declarada, sem inventar ganho de produtividade.

Separar data de referência, data da reunião passada e próxima reunião. Não inventar data futura. Se faltar campo necessário, produzir rascunho limitado e explicitar a lacuna.

## Escopo e capacidades

1. Verificar os schemas presentes antes de usar o Elo. Consultar apenas memory_get e tasks_get com o contact_id autorizado e percorrer todos os cursores necessários. Usar limites aceitos; na falha de argumento, tentar chamada mínima uma vez. Em erro interno, tentar uma vez e reportar o resultado. Não ampliar para consultas globais.
2. Aceitar snapshots fornecidos explicitamente para teste local. Conferir que todos pertencem ao mesmo contato; recusar itens de outros contatos. Marcar snapshot como recorte, não como estado atual consultado. Registrar data de obtenção quando disponível.
3. Separar capacidade verificada por execução, apenas exposta e desconhecida. Não usar browser, outros contatos, fontes pessoais ou agendamento para preencher lacunas. Não criar cron. Não preparar nem enviar WhatsApp nesta rotina.

## Procedimento

1. Identificar fatos confirmados, informações pendentes, tarefas abertas e fontes. Conservar source_id, versão quando retornada, IDs de memória/tarefa, data original e disponibilidade da fonte. Não afirmar leitura da fonte bruta com base apenas em source_available.
2. Preservar autoria: compromisso com responsible=consultor pertence ao consultor; preferência e objetivo do cliente pertencem ao cliente. Tratar objetivo como aspiração até existir plano explícito. Preservar incerteza pelo estado pending, mesmo que outro indicador de revisão esteja falso.
3. Conferir o prazo como data civil no fuso informado. Não inventar hora para prazo sem horário. Não registrar prazo como aniversário ou data anual.
4. Montar pauta de até cinco tópicos, primeiro compromissos e dúvidas necessárias. Formular perguntas como sugestões para revisão humana, não como falas efetivamente proferidas. Incluir referência de memória/tarefa/fonte em cada tópico factual.
5. Explicitar lacunas que impedem preparar a pauta: contexto, finalidade, nível atual, resultado esperado, destinatário, horário ou próxima reunião, conforme o caso. Vincular cada dúvida ao fato que a motivou; não inferir serviço contratado nem decisão de mudança.
6. Não gravar fatos, confirmar pendências, concluir tarefas nem marcar revisão de fontes a partir da pauta. Se faltar fonte ou uma leitura falhar, preservar a informação como limitada e declarar o restante desconhecido. Se a fonte expirar, citar a memória como evidência indireta, sem reconstruir notas.

## Saída e conferência humana

Entregar no chat uma pauta curta e uma lista curta de lacunas com fontes. Informar contato, data/fuso, cobertura das leituras e limitações. Pedir conferência do consultor sobre relevância das dúvidas antes de considerar o resultado validado. Não tratar silêncio como aprovação.

Separar os estados da própria rotina: arquivo criado; persistência/instalação comprovada ou pendente; teste sintético executado; validação humana pendente ou explicitamente recebida. Não anunciar selecionabilidade apenas porque o arquivo existe.

## Teste minimizado

Executar com um contato fictício e snapshots autorizados de memória/tarefas. Cronometrar apenas o trecho efetivamente executado. Conferir autoria do prazo, preservação de informação incerta, referências e lacunas. Relatar teste sintético, nunca reunião real. Medir redução de dúvidas esquecidas somente após o consultor revisar uma pauta representativa; não deduzir redução de tempo a partir de uma única execução.

Se houver pedido posterior de WhatsApp, sair desta rotina e carregar a Skill approve do Elo com destinatário e texto exatos para aprovação humana. A criação desta Skill não concede autorização permanente de envio.
