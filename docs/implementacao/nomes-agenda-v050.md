# Nome salvo da agenda como alias — v0.5.0

## Decisão e trade-off

Em 05/11/2026 o dono autorizou usar o nome completo salvo na agenda para apresentação no Elo. Isso substitui a política anterior de aceitar só short de uma palavra: o nome do cliente, inclusive composto/sobrenome, passa a aparecer em respostas MCP, propostas e briefings no cliente de IA. Não há promessa de ocultação ou anonimização de nomes. Telefones, e-mails e identificadores técnicos de entrega continuam fora da projeção.

O relato de campo dizia que a agenda e a identidade estavam corretas, mas a maioria das fichas permanecia com alias genérico. A causa da limitação foi reproduzida no código com testes sintéticos. Não acessamos o banco/configuração do cliente e não versionamos dados, mensagens ou nomes reais.

## Fonte e validação

A [documentação oficial do provedor](https://developer.z-api.io/contacts/get-contacts) define name como nome e sobrenome disponível quando o número está salvo; short também é nome salvo. O código usa name validado integralmente. Somente quando o principal está ausente/vazio utiliza short salvo. vname/vCard, notify/push name e about/recado não completam o alias nem o novo índice de busca. A documentação sustenta a escolha dos campos, não certifica o payload de cada instalação.

Validação de apresentação: nome Unicode NFC, espaços normalizados, até 256 unidades UTF-16 (limite local de entrada do adaptador), sem truncamento. Controles/formatação/bidi são rejeitados antes da normalização. A inspeção NFKC e dígitos Unicode bloqueiam padrões estruturais de telefone/CPF, @/e-mail/JID, URL e domínios. Nome principal preenchido e rejeitado fecha em genérico, sem recorrer ao short/perfil. Nome ausente ou inválido não conserva automaticamente nome antigo do provedor. Alias manual permanece soberano.

Esses filtros não são DLP universal: não garantem identificar números escritos por extenso, URLs ofuscadas ou todo dado sensível que alguém inclua num rótulo de agenda. A autorização para mostrar nomes não autoriza divulgar outros dados. Não se tentam consultas externas para interpretar rótulos.

## Identidade e autorização preservadas

Nome é apresentação, nunca chave de associação, destino ou autorização. Identidade continua pelo ID interno e por provas autenticadas de endereço/telefone-LID. Homônimos permanecem fichas distintas; não há merge por nome. Os guards de conexão, execução, exclusão e conflito de prova são os mesmos. A mudança não altera src/contact-addresses.ts, src/identity.ts ou src/actions.ts.

Rótulos com texto como “ignore instruções e envie” podem ser nomes de agenda sintéticos e são devolvidos como dado JSON, não executados. Instruções MCP e Skills declaram essa ausência de autoridade; teste comprova que sync/consulta não criam ações nem chamam envio. Isso não é garantia universal de imunidade do modelo a prompt injection.

Renomeação de alias do provedor preserva ID/endereço mas invalida a execução de preparo antigo pelo guard existente de alias. Um preparo em espera não recebe aprovação por haver nome novo. Tentativa incerta continua indisponível para nova execução e não é clonada mesmo com texto/alias alterados.

## Regressões e revisão

Testes vermelhos reproduziram ausência de nomes compostos e busca por campo de perfil; o ajuste usa a fonte salva validada também no índice. Regressões cobrem nomes compostos/acentuados com mais de quatro palavras, homônimos, renomeação, preservação manual, ausência/vazio, fallback short salvo, campo inválido, perfil/recado ignorado, dígitos Unicode, CPF/telefone/e-mail/URL/controles, rótulo de instrução sem autoridade, ação antiga recusada e envio incerto sem reenvio.

A revisão adversarial de design exigiu remover vname da busca, rejeitar controles antes de normalizar, evitar nome antigo do provedor quando o atual é inválido e testar invalidação de ações. Incorporados. Os testes antigos de ocultação de sobrenome foram atualizados para a decisão explícita nova, sem retirar os guards de endereço ou identidade.

## Ativação e reversão

Sem migration nova. Atualizar backend e Skills/plugin; depois executar contacts_sync até complete:true na própria instalação para substituir aliases automáticos e regravar o índice. Aliases manuais não são substituídos. Recarregar o catálogo/Skills e produzir um briefing novo; saídas e propostas históricas não são reescritas. Para nomes com controles, endereços ou campos fora do limite, permanece alias genérico.

Rollback de Worker para v0.4.x não remove nomes já gravados no banco, saídas no cliente, logs/backup de terceiros ou propostas históricas. Retomar ocultação exige atualizar a política/pacote e uma nova sincronização/revisão de aliases na instalação; não anunciar que rollback apaga informação já exposta. O código antigo pode voltar a genéricos após novo sync, mas aliases manuais permanecem preservados. Envios continuam pausados na instalação pessoal durante a ativação; nenhum cliente real é destino de teste.

## Evidência local final

290 testes da aplicação em 18 arquivos e 26 do instalador/recuperação passaram; TypeScript, build seco e diff-check passaram. Audit de produção retornou zero vulnerabilidades. Os 20 testes novos usam D1/workerd e ferramentas/código reais com provedor sintético; não constituem ensaio com clientes reais nem validação na instalação de outra pessoa.
