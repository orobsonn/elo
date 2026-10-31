# Agenda: custo e recuperação de resposta — v0.4.1

## Problema e evidência

O relato de campo descreve duas falhas na v0.4.0: leituras excessivas no D1 durante `contacts_sync`, capazes de esgotar a cota e afetar outros caminhos que usam o mesmo banco; e erro de sincronização depois de o estado de paginação já ter avançado. Não acessamos a instalação do cliente nem seus logs privados. Não versionamos mensagens reais ou credenciais.

Reprodução em D1/workerd local com dados sintéticos:

- Agenda com 1.700 fichas e seis pares telefone/LID: uma página de 100 entradas leu **8.645.136 linhas** antes da correção e **6.885** depois. O CTE correlacionado com `LEFT JOIN`/`OR` e o UPDATE sobre a tabela inteira repetiam trabalho fora da página.
- Em falha injetada **depois de um commit real** da segunda página, `next_page=3`, mas a implementação antiga devolvia erro e perdia o cursor. Isso reproduz a consequência relatada; não comprova qual falha de transporte/runtime ocorreu na instalação real. Um erro SQL transacional comum deve reverter o batch, conforme o [contrato do D1](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch).
- Com 1.700 contatos, 44 LIDs legados, 30 mil fontes e cinco mil tarefas/ações não relacionadas, o primeiro ajuste de consultas ainda gastava 1.201.501 leituras no percurso. Os índices de reconciliação reduziram o percurso completo para **438.153 leituras em 61 chamadas**, todas abaixo de 25 mil. Esses números são do ensaio local, não medição do ambiente do cliente ou promessa universal de custo.

## Plano executado e correções

1. Escrever regressões vermelhas de custo e perda de resposta. Resolver telefone e LID por probes exatos indexados dentro da transação, materializar somente a página e atualizar apenas seus endereços. Preservar proteção contra exclusão, pares contraditórios e corrida de reconciliação.
2. Persistir resposta/cursor junto com o avanço da página. `step` cresce em toda chamada confirmada, inclusive quando a página se repete para reparar outro LID. Repetir o cursor do último passo devolve o mesmo resultado selado, sem nova leitura do provedor, cota ou escrita. Resposta é construída antes do batch, sem criptografia falível depois do commit.
3. Em erro do batch, só devolver sucesso se existir recibo persistido para aquela execução, passo, conexão, dados e epoch. Falha anterior ao commit não inventa sucesso. Mudança de geração, execução, validade ou epoch recusa o recibo. Na disputa pelo batch da página, concorrentes recuperam o resultado vencedor e avançam uma única vez. Uma corrida perdida antes, na reconciliação, pode devolver erro e exigir retomada do cursor; não se promete sucesso automático em todas as fases.
4. Migration `0011_directory_receipt.sql` adiciona recibo de tamanho limitado no estado da agenda e índices para LIDs ativos, ações por contato/estado e tarefas por contato. Invalida cursores da v0.4.0; iniciar novo percurso após o upgrade.
5. O batch de `observePair` também verifica a execução ativa. Uma consulta antiga ao provedor não pode reconciliar fichas depois de a execução ser substituída. As transações de prova/reconciliação continuam separadas da gravação da página; não se anuncia atomicidade da chamada inteira.
6. Atualizar MCP, Skills e plugin para preservar o cursor em falha transitória e parar em cota esgotada. Mantidas as regras de envio da v0.4.0.

## Dependências de produção

Atualização restrita ao lock: `body-parser` 2.3.0 → 2.4.0 e `fast-uri` 3.1.8 → 3.1.9. SDK MCP permanece em 1.32.1. `npm audit --omit=dev` passou de dois pacotes vulneráveis para zero. Alertas: [body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828) e [fast-uri](https://github.com/advisories/GHSA-w74x-v6f9-j3xg). Isso não declara audit completo de dependências de desenvolvimento sem alertas.

## Revisão adversarial e limites

Revisor independente exigiu medir a chamada inteira, incluir histórico/ações/tarefas e proteger reconciliações de uma execução substituída; incorporados. O teste inicial só limitava quantidade de queries/parâmetros, insuficiente para limitar linhas lidas.

- Um recibo por execução, apenas para o passo imediatamente anterior. Mais antigo ou de outra execução exige reinício; não se cria ledger ilimitado.
- Duas chamadas verdadeiramente simultâneas podem consultar o provedor e consumir duas cotas antes de uma perder o guard. Só uma grava a página/avanço. Não há lock distribuído.
- Chamada sem cursor significa começar outra execução. Recuperação interna cobre erro do retorno do batch da primeira página; não promete recuperar perda total da resposta HTTP inicial sem identificador recebido pelo cliente.
- Mantido um reparo LID por chamada, com repetição controlada da mesma página. O caso testado de 44 reparos cabe na cota de 300 chamadas/dia; centenas de reparos podem exigir mais de um dia. Não se promete agenda arbitrária inteira em uma execução.
- A cota Free do D1 é compartilhada no nível da conta; reduzir este caminho não reserva capacidade nem reabre imediatamente uma cota já esgotada. [Limites e cobrança](https://developers.cloudflare.com/d1/platform/pricing/).
- O MCP sanitiza falhas do D1. Erro cru 7500 pode chegar como indisponibilidade genérica; a entrega não adiciona detecção automática de cota global. A pausa por cota depende de motivo identificado, sem inferir diagnóstico a partir de todo erro genérico.

## Verificações locais

- `npm run test:all`: 241 testes da aplicação em 16 arquivos e 25 testes de instalador/recuperação passaram.
- `npm run check` e `npm run build` (seco) passaram.
- Regressões incluem custo por chamada e percurso inteiro, recibo após commit, rollback antes de commit, chamadas concorrentes, página repetida para reparo, cursor antigo, gerações/epoch/expiração, execução substituída e migração preservando contatos/envios pausados.
- Uma tentativa de teste coincidiu com reinstalação de `node_modules` e não iniciou (`ERR_MODULE_NOT_FOUND`). Depois da instalação completa, a execução estável acima passou; isso não foi falha de produto.

## Ativação e reversão

Antes de publicar, conferir conta/backup e manter envios pausados. Aplicar migration 0011, publicar backend v0.4.1 por upload versionado, verificar preview, promover e verificar produção. Atualizar Skills/plugin e recarregar catálogo. Nenhuma credencial, binding ou dado de outra instalação deve ser copiado.

A instalação do cliente deve fazer seu próprio upgrade e validar agenda/cobertura/histórico com a mesma identidade correta. Não foi realizado envio real como teste. Somente o aviso de release solicitado pelo dono está autorizado.

A migration é aditiva, mas invalida cursores antigos. Rollback de Worker não desfaz banco, e voltar à v0.4.0 reintroduz o custo excessivo: em incidente, suspender sync e seguir recuperação de banco/epoch, sem reativar ações pendentes. Não recomendar repetição cega ou aumentar plano como substituto do fix.
