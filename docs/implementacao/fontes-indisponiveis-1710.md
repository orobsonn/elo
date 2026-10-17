# Diagnóstico das 11 fontes e testes adicionais — 17/10/2026

## Causa observada no ambiente publicado

Consultas D1 somente de metadados/agregados, às 18:16UTC (15:16 America/Fortaleza), reexaminaram o snapshot 41 usado na homologação Claude:

| Quantidade | Evidência | Consequência |
|---|---|---|
| 1 | Nota sintética com data original 16/09, ingressada 17/10; conteúdo já expurgado | Corte de 30 dias funcionando. Não restaurar o texto para completar revisão. |
| 10 | Mensagens ativas, `content=NULL`, `messages.kind=unsupported_media`, 3 de entrada e 7 de saída | O callback persistido não forneceu `text.message` utilizável. O armazenamento não guarda subtipo nem payload bruto: não permite afirmar se eram áudio, imagem, reação, espera de decodificação ou outro formato. |

Não foi encontrada perda de texto já armazenado nesses dez registros. Isso também não prova que o provedor nunca teve texto: o parser atual só conserva a representação textual suportada. Zero das dez fontes antigas foram recuperadas nesta investigação. Não foram baixadas mídias, inventadas transcrições ou removidas fontes para fazer o contador zerar.

A [documentação Z-API](https://developer.z-api.io/webhooks/on-message-received) descreve o callback de recebimento. Não foi encontrado contrato de replay retroativo que autorize prometer sua recuperação. Telefone, IDs do provedor, URLs privadas e conteúdo real não fazem parte destas evidências.

## Correções

1. `review_page` passa a devolver `coverage.unavailable_reasons`, com categorias mutuamente exclusivas: `expired`, `unsupported_format` e `missing_text`. Total e categorias são calculados na mesma consulta e instante; expirado tem precedência. `unsupported_format` significa classificação existente sem representação textual utilizável, sem inferir o subtipo. O total e as regras de completude permanecem conservadores.
2. Falha reproduzida: primeiro callback sem texto seguido do mesmo ID com texto era tratado como duplicata e ignorado. Agora um preenchimento tardio pode atualizar a mesma fonte, uma única vez, com versão nova e extração pendente. Preserva ID, direção, data original, ingresso e vencimento. Reconfere identidade, conexão, tombstone, exclusão, ordem e retenção no commit; não sobrescreve texto existente. Não solicita retry ao provedor nem garante que ele enviará o complemento.
3. Restauração: o helper já reaplicava migrations e pausava envios, mas conservava conteúdo/endereço de ações com mais de 30 dias até o cron seguinte. Agora limpa essas colunas antes da reabertura; também reaplica o corte pela data original da fonte.

Não houve migration, mudança de autenticação, novo agendador ou novo envio WhatsApp. A Skill fonte instalada nos clientes não foi substituída: a explicação adicional vem do contrato/descrição da tool, mantendo o comportamento de declarar revisão incompleta.

A revisão independente identificou ainda duas condições de corrida, reproduzidas antes da correção: callbacks iniciais concorrentes com leitura de ausência e preenchimento de uma fonte durante a paginação. O preenchimento agora também reconsulta o vencedor de uma inserção concorrente. A revisão detecta fontes do escopo nunca mostradas (`unseen_sources_pending`), inclusive sem texto ou expiradas, e impede conclusão; um novo run só pode avaliar o que estiver legível. Essa contagem pode incluir as fontes de `unavailable_count`, não é uma categoria adicional para somar ao total. `review_complete` revalida essa condição no commit. Isso não transforma versão nova em versão já avaliada.

## Verificação controlada

Três falhas foram observadas antes das correções: causas indisponíveis sem detalhamento; segundo callback com texto ignorado; texto/endereço de ação vencida conservados na restauração. Após a correção:

- 149 testes Worker/D1 e 22 Node aprovados; TypeScript e build sem erro.
- Preenchimento simultâneo pelo mesmo ID não duplica nem incrementa versão duas vezes; replay divergente não sobrescreve conteúdo.
- Exclusão, expiração, contato excluído e troca de conexão entre leitura e commit bloqueiam o preenchimento; direção/identidade divergentes e callback antigo são recusados ou não aplicados.
- Categorias somam o total, não contam fonte expirada duas vezes e não autorizam `review_complete` com lacunas.

Avisos já existentes do ambiente de testes (sourcemaps/depreciação, binding AI e SQLite experimental) permanecem. Os testes controlados não chamaram Z-API nem inferência real.

## Time Travel real isolado

Na conta pessoal confirmada, foi criada uma D1 temporária com UUID próprio, sem binding ao Worker pessoal, somente fixtures sintéticas. A prova usou o helper `restoreDatabase`, sem executar `restore.mjs` nem publicar um Worker de recuperação.

Fluxo: migration0001 → fixtures → bookmark real → alterações nos dados → Time Travel ao bookmark → migrations 0002–0005 → limpeza. Foram conferidos contato/configuração preservados, memória/tarefas restauradas, retenção de fonte e ação vencida, ação antiga cancelada, ação em voo incerta, sessão antiga removida/dono preservado e envios pausados. A D1 temporária foi excluída pelo UUID recém-criado após 10 verificações aprovadas. [Registro técnico](restore-isolado-1710.json).

Isso comprova D1 remoto e sequência de recuperação/limpeza; não comprova manutenção/epoch do Worker de ponta a ponta nem recuperação feita por pessoa leiga. A base pessoal não foi restaurada.

## Publicação e aceites

A versão ativa, smokes e diagnóstico MCP após deploy serão registrados na conclusão deste relatório. As issues #1–#4 permanecem abertas. Seguem pendentes os testes humanos/de cliente ainda não comprovados: celular físico, resultado agendado com MCP, envio pela interface Claude após approve exato, renovação/revogação específicas dos clientes, piloto leigo e os demais limites já documentados. As 11 fontes não podem virar uma revisão integral por supressão da lacuna.
