# Agenda do WhatsApp sem histórico

Este documento preserva a prova de 18/10. O fluxo atual incorpora a [recuperação e custo da v0.4.1](agenda-custo-retomada-v041.md) e os [reparos limitados da v0.4.2](reparos-lid-v042.md). Evidência histórica não é homologação automática das versões posteriores.

Pedido de 18/10/2026: localizar alguém por nome e preparar uma mensagem, mesmo sem conversa capturada no Elo. Z-API documenta `GET /contacts?page=…&pageSize=…`, com resposta em array: https://developer.z-api.io/contacts/get-contacts.

## Fluxo entregue

`configurar-elo` percorre `contacts_sync` até `complete:true`. `contacts_list` busca alias ou nome normalizado da agenda; `approve` também orienta atualizar o mapa quando faltar alguém. Novo contato é provisório, não cliente. Não há mensagem/fonte/memória artificial para representar a agenda.

O backend vincula pelo endereço exato, nunca pelo nome. Não junta fichas sem endereço por semelhança. Nome completo normalizado fica em `contact_directory.search_name`, restrito ao backend; não sai na projeção MCP. Busca aceita nome composto fornecido pela pessoa, sem retornar sobrenome estruturado. Alias automático só usa `short` do provedor se for uma palavra de letras com 2–24 caracteres, com apóstrofo/hífen interno e validação adicional; não divide nomes completos. Caso contrário usa “Contato da agenda”. Alias existente escolhido pelo dono é preservado.

Homônimos continuam separados e exigem escolha por alias reconhecível/ID. Quando o dono não consegue distinguir as referências, a Skill não prepara o envio. Um resultado numa página não prova unicidade; é preciso percorrer a busca e o mapeamento. Não há envio novo autorizado por esta integração.

## Limites e persistência

- Uma página de até 100 registros por chamada; até 256 KiB de resposta, timeout e redirecionamentos recusados. Só endereços individuais numéricos; ignora próprio número, grupos e LIDs em vez de inventar conversão.
- Até 300 chamadas de agenda por instalação/dia UTC, incluindo páginas repetidas; falhas depois da reserva consomem cota. Cursor criptografado dura uma hora e é ligado à execução, passo, gerações de conexão/dados e epoch. Reinício não zera consumo. Repetir o último cursor confirmado recupera o recibo sem nova importação/cota.
- Até cinco reparos LID sequenciais por chamada, somente com pares comprovados pelo provedor. A página se repete quando há mais reparos. Não há conversão de LID nem associação por nome.
- Confere identidade do aparelho antes/depois da leitura. Nomes, resposta e avanço da página são gravados numa transação com assertivas de geração. Cada reparo tem sua própria transação protegida; uma falha pode preservar reparos anteriores e impedir o avanço da página. Não se anuncia atomicidade da chamada inteira.
- A paginação Z-API não oferece snapshot imutável comprovado. Lista cheia exige página seguinte; `complete` é término observado do percurso. Contatos ausentes não são apagados. Nova execução zera a conclusão anterior; cursores de execução substituída são recusados. Isso não garante completude externa.
- `forgotten_addresses` guarda HMAC do endereço antes da exclusão e é conferido na sincronização e recepção HTTP. A exclusão limpa o índice de nomes; CAS impede exclusão parcial quando a identidade muda. Exclusões anteriores à migração 0008 não tinham esse vínculo e não podem receber garantia retroativa. Rotação da chave exige preservar/migrar esses fingerprints; não trocar a chave isoladamente.
- Exportação autenticada do dono inclui índice restrito e fingerprints; diagnóstico/MCP comum não os expõe. Não há importação retroativa de mensagens/fotos nem chamada de IA para mapear contatos.

## Plano e evidência

1. Testes do comportamento ausente: quatro testes vermelhos antes de `contacts_sync`; agrupamento por endereço, busca acentuada, projeção, alias e esquecimento.
2. Implementação mínima e regressões de página cheia, cursor adulterado/obsoleto, quota, resposta inválida, troca de aparelho/conexão/dados, ficha sem endereço e nova mensagem após esquecer.
3. Corrida de exclusão reproduzida com teste vermelho; corrigida com CAS transacional. Suíte focada: 52 testes aprovados.
4. Revisão adversarial independente: sem bloqueador após incorporar bloqueio de recadastro, cobertura parcial e validação de aparelho. Prova publicada e gravações entram no PR/relatório após implantação; roteiro não é vídeo concluído.

Migração 0008 é aditiva. Rollback do Worker preserva as tabelas; não reverte banco. Nenhum novo envio real integra este ensaio.

## Prova publicada em 18/10/2026

[Relatório sanitizado](agenda-whatsapp-prova-1810.json): 189 testes Worker/D1 + 22 Node, TypeScript/build e seis smokes publicados aprovados. PR [#24](https://github.com/orobsonn/elo/pull/24), commit `f9285065271617ece67739ea95022d3b641cf0f8`, Worker `e14b230c-396b-456c-9b18-9564c9b0ef45` a 100% na conta pessoal Robson Lins. Preview confirmou saúde/D1/commit e recusou MCP em origem alternativa antes da promoção. Migração remota: seis comandos, 0,88 ms reportados pelo D1.

Z-API real via MCP autenticado: dez páginas, 936 registros retornados e 935 endereços mapeados, sem fontes de mensagens no Elo. O próprio aparelho foi excluído. Busca real pelo nome encontrou um contato sem histórico; preparo e cancelamento foram confirmados, sem `action_execute` nem envio WhatsApp. Aliases reais mantidos; eventual alias de demonstração temporário foi restaurado. Os contatos mapeados permanecem disponíveis para o dono.

Plugin pessoal [Elo](https://chatgpt.com/plugins/plugin_asdk_app_6ad36d6a59f881919b3de4f512858abf) atualizado para 1.0.4 com `configurar-elo` e `approve`; leitura de volta confirmou bytes contra o repositório, identidade/App/conexão e privacidade preservadas. Em uma conversa nova do ChatGPT Work, após atualizar as ferramentas da conexão existente, a Skill executou `contacts_sync` até completar dez páginas e confirmou 935 contatos. A conversa antiga ainda mantinha o catálogo anterior; o vídeo [01](../demonstracoes/funcionalidades/01-conexao-e-diagnostico.mp4) documenta a execução real com o catálogo atualizado. Nenhuma inferência foi usada para mapear a agenda; o contador observado foi dez páginas da cota própria, sem inferir valor de cobrança Z-API.

Rollback de código disponível: Worker `4bc7c47b-2d8b-4c19-84ca-a0c81a614354`; não reverte a migração nem os contatos importados. A série de vídeos tem acompanhamento na issue [#23](https://github.com/orobsonn/elo/issues/23), separada da prova técnica acima.
