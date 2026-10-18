# Agenda do WhatsApp sem histórico

Pedido de 18/10/2026: localizar alguém por nome e preparar uma mensagem, mesmo sem conversa capturada no Elo. Z-API documenta `GET /contacts?page=…&pageSize=…`, com resposta em array: https://developer.z-api.io/contacts/get-contacts.

## Fluxo entregue

`configurar-elo` percorre `contacts_sync` até `complete:true`. `contacts_list` busca alias ou nome normalizado da agenda; `approve` também orienta atualizar o mapa quando faltar alguém. Novo contato é provisório, não cliente. Não há mensagem/fonte/memória artificial para representar a agenda.

O backend vincula pelo endereço exato, nunca pelo nome. Não junta fichas sem endereço por semelhança. Nome completo normalizado fica em `contact_directory.search_name`, restrito ao backend; não sai na projeção MCP. Busca aceita nome composto fornecido pela pessoa, sem retornar sobrenome estruturado. Alias automático só usa `short` do provedor se for uma palavra de letras com 2–24 caracteres, com apóstrofo/hífen interno e validação adicional; não divide nomes completos. Caso contrário usa “Contato da agenda”. Alias existente escolhido pelo dono é preservado.

Homônimos continuam separados e exigem escolha por alias reconhecível/ID. Quando o dono não consegue distinguir as referências, a Skill não prepara o envio. Um resultado numa página não prova unicidade; é preciso percorrer a busca e o mapeamento. Não há envio novo autorizado por esta integração.

## Limites e persistência

- Uma página de até 100 registros por chamada; até 256 KiB de resposta, timeout e redirecionamentos recusados. Só endereços individuais numéricos; ignora próprio número, grupos e LIDs em vez de inventar conversão.
- Até 300 páginas por instalação/dia UTC; falhas depois da reserva consomem cota. Cursor criptografado dura uma hora e é ligado às gerações de conexão e dados. Reinício é idempotente pelo endereço; não zera consumo.
- Confere identidade do aparelho antes/depois da leitura. As gravações têm assertivas de geração numa única transação D1. Alteração concorrente aborta a página inteira.
- A paginação Z-API não oferece snapshot imutável comprovado. Lista cheia exige página seguinte; `complete` é término observado do percurso. Contatos ausentes não são apagados. `directory_state.completed_at` é a última conclusão, não comprovação da tentativa em curso nem garantia de completude externa.
- `forgotten_addresses` guarda HMAC do endereço antes da exclusão e é conferido na sincronização e recepção HTTP. A exclusão limpa o índice de nomes; CAS impede exclusão parcial quando a identidade muda. Exclusões anteriores à migração 0008 não tinham esse vínculo e não podem receber garantia retroativa. Rotação da chave exige preservar/migrar esses fingerprints; não trocar a chave isoladamente.
- Exportação autenticada do dono inclui índice restrito e fingerprints; diagnóstico/MCP comum não os expõe. Não há importação retroativa de mensagens/fotos nem chamada de IA para mapear contatos.

## Plano e evidência

1. Testes do comportamento ausente: quatro testes vermelhos antes de `contacts_sync`; agrupamento por endereço, busca acentuada, projeção, alias e esquecimento.
2. Implementação mínima e regressões de página cheia, cursor adulterado/obsoleto, quota, resposta inválida, troca de aparelho/conexão/dados, ficha sem endereço e nova mensagem após esquecer.
3. Corrida de exclusão reproduzida com teste vermelho; corrigida com CAS transacional. Suíte focada: 52 testes aprovados.
4. Revisão adversarial independente: sem bloqueador após incorporar bloqueio de recadastro, cobertura parcial e validação de aparelho. Prova publicada e gravações entram no PR/relatório após implantação; roteiro não é vídeo concluído.

Migração 0008 é aditiva. Rollback do Worker preserva as tabelas; não reverte banco. Nenhum novo envio real integra este ensaio.
