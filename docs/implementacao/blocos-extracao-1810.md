# Extração por blocos de conversa — 18/10/2026

Mensagens pendentes do mesmo contato passaram a ser processadas juntas. Cada chamada recebe até 20 mensagens e 12.000 caracteres, numa janela de ingresso de duas horas, ordenadas pela data original. Não mistura contatos. Fontes não incluídas permanecem pendentes; reunião/anotação do backend conserva o caminho individual. Importação aplicada pela Skill continua fora do cron.

O cron mantém três blocos por ciclo de dez minutos. O limite padrão é **200 chamadas por instalação/dia UTC**, configurável por `EXTRACTION_CALLS_DAILY` entre 1 e 1.000; configuração inválida mantém 200. Reservas e chamadas falhas consomem a cota. Ela inclui chamadas anteriores do mesmo dia; contadores não foram zerados. Atingir o limite não interrompe captura: a fila aguarda a cota seguinte. Retenção continua independente, até 30 dias da data original; fila prolongada ainda pode expirar sem extração. Com a cadência atual, configurar mais de 432 chamadas não aumenta o máximo aritmético diário de ciclos. 4.000 mensagens/dia com 200 blocos completos é um máximo teórico, não promessa de capacidade.

## Persistência e falhas

Reserva de membros e orçamento ocorre numa transação. Antes e depois das escritas, uma assertiva confere existência/cardinalidade, versões, dono do processamento, gerações e validade do conjunto inteiro; falha aborta todos os candidatos. Editar, excluir ou trocar o lease de um membro durante a inferência não produz gravação parcial.

Cada candidato usa uma fonte original e evidência literal nela. O conjunto de mensagens do bloco fica registrado como **contexto potencial**, por IDs e versões, sem texto copiado nem fonte agregada artificial. Edição/exclusão desse contexto sinaliza revisão de memórias e tarefas, inclusive no resumo de atenção. Confirmação de memória valida uma revisão monotônica do contexto para não apagar alerta concorrente. Expurgo comum torna texto indisponível, sem invalidar automaticamente memória concisa. Tarefas antigas têm versão desconhecida; tarefas novas registram a versão utilizada. Concluir uma tarefa não limpa automaticamente o alerta de fonte alterada.

Saída incompleta, truncada ou que alcance o teto de 12 fatos/6 tarefas provoca divisão do bloco. As mensagens vizinhas não perdem suas três tentativas individuais por falha coletiva. A divisão reduz o limite por fonte até processamento individual, com backoff. IA continua falível; schema/evidência literal não certificam a verdade semântica ou ausência de omissões.

Migração 0007 é aditiva: limite de subdivisão, metadados de origem/revisão, relações contextuais e índices. Não altera login, webhook ou aprovação de WhatsApp. O esquecimento elimina também as relações de contexto.

## Validação executada

- Os testes iniciais mostraram 13 falhas do agrupamento antes da implementação. A regressão de proveniência falhou antes de ser acrescentada; a regressão de alerta em attention também falhou antes da correção.
- Código final: **175 testes Worker/D1 e 22 testes Node**, TypeScript e build aprovados. Avisos conhecidos de dependências/AI binding permanecem; não houve inferência paga nesses testes.
- Casos incluem claim parcial, corrida da última chamada da cota, exclusão/edição/expiração/gerações/lease, trigger invalidando outro membro após primeiro INSERT, candidato externo/evidência alheia, saturação, subdivisão, CAS da revisão, expurgo e esquecimento.
- Migrações 0001–0007 aplicadas pelo Wrangler num D1 local novo: sucesso. Recuperação controlada também aplica a migração nova. Isso não é novo Time Travel remoto.
- Revisão adversarial independente encontrou omissão de alerta em attention e varreduras nos triggers. Corrigidos; regressão de alerta verde e [planos locais](blocos-planos-1810.json) mostram buscas pelos índices nos registros derivados. Nenhum bloqueio restante nessa revisão.
- [DeepSeek real](blocos-modelo-1810.json): duas chamadas REST, apenas seis mensagens fictícias, incluindo falas do consultor e do contato. Primeira rodada omitiu tarefa explícita do consultor; instrução ajustada. Segunda retornou três fatos, incluindo mudança incerta, e tarefa do consultor. Uso total: 3.034 tokens de entrada e 748 de saída, sem tratar contador como fatura. Replay da resposta real passou pelo validador/escrita D1: seis fontes concluídas, duas memórias confirmadas/uma pendente e uma tarefa atribuída ao consultor. O replay não é terceira chamada ao modelo.

Publicação e prova do cron no ambiente publicado serão registradas nas notas da versão e no comentário do PR após a promoção. Nenhum envio WhatsApp foi feito neste ensaio.
