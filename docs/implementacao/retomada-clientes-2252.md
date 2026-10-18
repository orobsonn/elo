# Retomada dos clientes após intervalo — 17/10, 22h52–22h55

Consultas novas somente de leitura, autorizadas no contexto de homologação, no computador. Nenhum teste foi solicitado ao dono no celular. Fixture: `SIM-CLAUDE-1710 Lia`; não foram lidas conversas reais ou enviados WhatsApps.

## Claude web

Na conversa existente, Sonnet 5.5 Médio buscou o alias e chamou memória e tarefas. Foram concedidas permissões **uma vez** para as ferramentas de leitura já conectadas, sem conceder novos escopos OAuth ou reconectar. Busca: uma correspondência. Memórias: três em uma página, duas confirmadas/uma pendente, fontes disponíveis. Tarefas: uma aberta, zero concluídas, zero descartadas. Todos os cursores finais nulos; datas vazias/completas. Chamadas e resposta final foram observadas na interface, após cerca de sete horas do diagnóstico anterior.

## ChatGPT Work web

Na conversa existente, uma solicitação manual nova consultou a mesma fixture: três memórias (duas confirmadas/uma pendente), uma tarefa aberta e cursores finais nulos. A resposta veio após 37 segundos de trabalho relatado pela interface. Não foi executado nem reativado agendamento. A saída não é atribuída à tarefa que já estava encerrada.

## Conferência e falha preservada

O conector nativo independente encontrou o contato e confirmou as três memórias. Numa chamada paralela de memória/tarefas, memória respondeu e tarefas retornou `-32603 Internal error`, sem diagnóstico que permita atribuir a causa ao Elo ou à plataforma. Uma repetição sequencial de tarefas respondeu corretamente: uma aberta, cursor nulo. Uma nova rodada paralela de memória/tarefas respondeu sem erro nas duas chamadas. Não foi feita mutação, reconexão, alteração de autenticação ou correção especulativa para encobrir a falha. Ela permanece como ocorrência transitória de causa indeterminada; sucesso posterior não prova sua resolução definitiva.

Esses resultados comprovam leituras atuais nos dois clientes após o intervalo, sem falha de autenticação observada. Não expõem o mecanismo de renovação OAuth/Access, não comprovam revogação específica do cliente, cron, revisão integral, approve humano, envio web ou paridade móvel.

Capturas de resultado estão no estado local privado, fora do Git. Issues #1–#4 permanecem abertas.
