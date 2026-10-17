# Referências de código — reaproveitamento para o Elo

Pesquisa em 16/10/2026. Auditoria estática, somente leitura nas referências; sem executar deploy, acessar bases, ler arquivos de segredos ou testar integrações reais. Não é certificação de segurança nem comprovação de funcionamento no Claude/ChatGPT. Os testes citados foram inspecionados, não executados.

## Resultado

Reaproveitar padrões pequenos de MCP, autenticação e HTTP; adaptar o contrato de memória para relacionamento. Nenhuma das quatro bases inspecionadas entrega o núcleo do Elo pronto. Um fork integral do Segundo Cérebro imporia um modelo de notas conceituais e dependências que ainda precisam demonstrar utilidade para essa rotina.

Esta análise segue as decisões mais recentes: instalação individual; IA lê conteúdo privado das conversas; não se exige mascarar números dentro do texto; respostas estruturadas não fornecem telefone, e-mail, CPF ou sobrenome; envio resolve o canal real no backend a partir de ID interno; homônimos precisam de identificação simples; mensagens se acumulam por conversa com deduplicação de eventos; WhatsApp exige aprovação. Essas decisões prevalecem sobre hipóteses antigas do briefing.

## Snapshots e rastreabilidade

Os caminhos da coluna “raiz” são locais de auditoria, não dependências propostas. Cada referência de arquivo/linha abaixo usa seu código nessa revisão.

| Ref. | Repositório / raiz auditada | Commit |
|---|---|---|
| SC | [orobsonn/segundo-cerebro](https://github.com/orobsonn/segundo-cerebro), clone temporário `/tmp/elo-segundo-cerebro-audit` | `a527f09c73d1e4ed9e36bd148bc59d8961ab694b` |
| OR | [orobsonn/oraculo-app](https://github.com/orobsonn/oraculo-app), `/Users/robson/Desktop/dev/oraculo-wt-1/mcp` | `211666cce5a90ca6c622fef702d733b828b88470` (raiz do monorepo) |
| VI | [arqxus-flow/MCP_STAYS_RARITY](https://github.com/arqxus-flow/MCP_STAYS_RARITY), `/Users/robson/Desktop/dev/victor-mcp` | `ac955eb9cce68ab50c64866ce115c68527f4d16d` |
| EG | [Expert-Integrado-Ferramentas/expert-governanca](https://github.com/Expert-Integrado-Ferramentas/expert-governanca), `/Users/robson/Desktop/dev/expert-governanca/templates/mcp` | `a0ec3ac6e27655325d965ccffc4bf62c7deab5cd` (raiz do monorepo) |

`git status` não mostrou alterações em `OR/mcp` ou `EG/templates/mcp`. VI tinha alterações e arquivos não rastreados fora dos arquivos de código usados aqui; os trechos citados estavam sem modificação indicada. O clone SC foi feito nesta pesquisa a partir de `master`. Não foi verificado se os checkouts locais OR/VI/EG estão na última revisão remota. Uma eventual extração de código exige conferir licença/permissão, dependências e versão corrente; a disponibilidade do checkout não resolve esses pontos.

## Segundo Cérebro: infraestrutura útil, domínio inadequado para transplantar

### O que o código demonstra

- `src/db/migrations/0001_init.sql:1–61`: notas com título, corpo, resumo, domínios, tipo, datas de criação/atualização; tags; arestas semânticas. FTS5 acompanha inserções, alterações e exclusões por triggers. Não há nesse schema contato, conversa, mensagem, data de acontecimento, confirmação de fato, pendência ou aprovação.
- `src/db/queries.ts:26–44,55–83`: persistência parametrizada por ID, com operações separadas para nota/tags/arestas. É um padrão simples de acesso a D1 que pode inspirar consultas específicas do Elo.
- `src/mcp/tools/recall.ts:8–11,56–61,90–112,125–141`: busca combina embeddings e FTS, consulta resumos e devolve seleção limitada. O balanceamento permite no máximo três resultados por domínio e cinco domínios. Isso serve à descoberta de conceitos; não equivale a paginação completa de histórico nem a uma consulta de todas as pendências vencidas.
- `src/index.ts:7–15` e `src/auth/handler.ts:21–40`: existem endpoints OAuth e login do proprietário com verificação de senha, concluindo a autorização pelo provider. Isso comprova uma implementação de autenticação; não a compatibilidade atual de cada cliente ou fluxo móvel.
- `wrangler.toml:16–48`: exige D1, Vectorize, Workers AI, Durable Object, OAuth KV, Graph Cache KV e assets. O runbook `CLAUDE.md:27–39,50–124` inclui CLI autenticada, criação de recursos, ajuste de bindings, secrets, deploy e provisionamento. É instalação assistida por IDE/agente, não evidência de instalação leiga concluída em um clique.

### Lacunas e riscos concretos

1. **Retentativa pode duplicar.** `src/mcp/tools/save-note.ts:82–83,109–140` cria novo ID por chamada, grava nota, depois tags/arestas e índice vetorial. Se o último passo falhar, a nota já existe, mas o caminho de erro não devolve o ID de sucesso. Repetir a operação pode criar outra nota. Não usar esse contrato na ingestão de mensagens ou reuniões.
2. **Persistência parcial.** Na mesma sequência não há uma transação cobrindo todas as gravações, e D1/Vectorize são operações distintas. `src/mcp/tools/update-note.ts:102–138` atualiza D1 antes de gerar/atualizar vetor. Para Elo, se houver índice semântico, o registro canônico deve continuar consultável e a falha de indexação precisa ter recuperação identificável, sem pedir nova ingestão.
3. **Busca lexical depende da semântica estar funcionando.** `recall.ts:56–61` chama `embed` antes do `Promise.all`; uma falha de Workers AI impede até o FTS daquela chamada. Se vetorização entrar no Elo, a consulta operacional não deve herdar essa dependência.
4. **Atualização substitui conteúdo.** `src/db/queries.ts:55–67` escreve os novos campos na nota existente; o schema auditado não versiona o conteúdo anterior. Não cobre, sozinho, correções rastreáveis ou conflito entre fatos de reuniões diferentes.
5. **Provisionamento sem barreira no handler.** `src/auth/handler.ts:17–19` encaminha `POST /setup/provision` sem checagem de login nessa rota, e `src/auth/setup.ts:73–75` executa migrations. Também `/status` retorna contagens quando configurado (`setup.ts:61–70`). A exposição real depende da camada de publicação, não auditada aqui. Não importar essas rotas como padrão de produção; migrations devem pertencer a um fluxo autenticado de instalação/manutenção.
6. **Credenciais na conversa/argumento do processo.** O runbook pede passphrase ao agente e usa argumento de shell (`CLAUDE.md:41–48,78–88`). Isso contraria uma instalação que minimize passagem de credenciais pelo modelo e histórico do terminal. Adaptar para entrada protegida apropriada ao fluxo escolhido; não copiar literalmente.

**Reaproveitar:** o princípio de D1 canônico, busca lexical com FTS, leituras pequenas seguidas de aprofundamento por ID, e referência de OAuth individual. **Adaptar:** autenticação, instalação, migrações, atualização e erros. **Rejeitar no núcleo inicial:** atomização compulsória de conceitos, analogias entre domínios, taxonomia em inglês, grafo e dashboard genérico sem benefício demonstrado. A exigência de analogias está em `save-note.ts:27–49`; não deriva das jornadas dos consultores.

O README afirma gratuidade (`README.md:52`) e simplicidade de instalação (`110`); essas afirmações não foram adotadas como fatos. Custo atual requer documentação oficial e volume de uso definido. Contas e permissões, falhas parciais, recuperação, exportação e atualização exigem prova própria.

## Oráculo: bom exemplo de separar intenção e execução; não copiar as garantias

### Padrões concretos aproveitáveis

- `src/server.ts:23–56,66–70` registra um servidor base e, separadamente, ações destrutivas. `src/index.codemode.ts:112–126` aplica essa separação no handler. Para Elo, leitura de conversas e preparação de mensagem podem ter contratos distintos do envio final, mesmo que Code Mode não seja escolhido.
- `src/shared-destructive/confirmation-tokens.ts:25–39,54–85,103–121` vincula token a ferramenta, ator pseudonimizado, domínio e hash dos argumentos; estabelece expiração e compara a intenção antes da ação. Reaproveitar a ideia de aprovação vinculada a conteúdo exato e anexos, não apenas “pode enviar”.
- `src/libs/leads/destructive/release-leads.ts:54–75,78–117` verifica a intenção, reconsulta estado e executa UPDATE condicionado ao dono/estado atual. Esse cuidado com mudança de estado entre preview e execução é uma referência útil.
- `src/index.codemode.ts:85–110,132–141` mostra OAuth com contexto de autorização do ator. Se esse padrão entrar no Elo, reduzir para proprietário da instalação; não carregar contas, assentos, experts e papéis sem requisito real.

### O que precisa ser corrigido ou não adotado

1. **“One-shot” não é prova de atomicidade.** O verificador faz `kv.get`, depois `kv.delete` (`confirmation-tokens.ts:108–112`). O código não contém exclusão mútua ou consumo condicional atômico. Duas chamadas concorrentes podem ler o mesmo token antes da exclusão; não usar como garantia de envio único. Isso é inferência do fluxo estático, não um teste concorrente executado.
2. **Token não comprova clique humano.** A descrição do fluxo solicita aprovação no cliente (`release-leads.ts:1–12`), mas o token é emitido no preview e devolvido ao modelo (`confirmation-tokens.ts:71–85`). A verificação valida posse/intenção; não identifica um gesto humano independente. O Elo deve provar a aprovação na experiência escolhida, inclusive celular, ou adicionar um passo de confirmação autenticada quando o cliente não oferecer a garantia necessária. Uma instrução de prompt não basta para afirmar que o backend só envia após aprovação.
3. **Privacidade de logs não é filtragem da saída.** `src/libs/leads/tools/query.ts:54–55,77–81` seleciona e devolve nome, telefone e e-mail; `src/shared/errors.ts:21–24` apenas serializa o objeto, e a instrumentação retorna o resultado (`src/shared/instrument-tool.ts:91–102`). Não adotar esse retorno como exemplo da política de campos estruturados do Elo. A saída exige projeção explícita dos campos permitidos por ferramenta.
4. **Mascaramento amplo conflita com a decisão atual.** `src/shared/pii-sanitize.ts:17–44` mascara números de documentos/telefones, e-mails e valores monetários; `src/shared/decision-log.ts:37–42,62–73` aplica isso a logs. Pode inspirar minimização de logs, mas não deve alterar o corpo autorizado de conversas no Elo nem apagar dados financeiros úteis do texto por padrão. Preservar texto autorizado é diferente de exportar identificadores estruturados.
5. **Complexidade não é requisito herdado.** Code Mode customizado, instrumentação por monkey patch e contexto multi-expert são escolhas do Oráculo (`src/code-tool.ts:79–110`, `src/shared/instrumented-server.ts:24–39`). Só justificá-las se as consultas reais do Elo precisarem. Poucas ferramentas tipadas podem ser mais fáceis de testar e ensinar; isso permanece recomendação condicional.

## Victor MCP: padrões de integração, não base de memória ou aprovação

- `src/server.ts:13–35` tem fábrica de servidor, ping com versão e registro de bibliotecas por domínio. É reaproveitável como organização simples de código e diagnóstico.
- `src/libs/pipeline/client.ts:8–23,32–55` fixa origem e impede seguir redirects com credencial. Reaproveitar o princípio, mas preferir o helper mais restritivo do template EG, que também limita caminho base e aplica timeout.
- `src/index.ts:16–25` envolve o servidor inteiro com Code Mode; esse entrypoint não autentica requests por si. Isso não comprova que a publicação está desprotegida — pode haver proteção externa —, mas não deve ser transplantado presumindo autenticação já resolvida.
- `src/shared/errors.ts:13–21` devolve mensagem e corpo de erro upstream ao modelo, confiando em sanitização anterior mencionada no comentário. `src/libs/pipeline/client.ts:58–75` captura até 500 caracteres de resposta externa. No Elo, esse padrão pode expor identificadores restritos em falha do provedor. Não copiar; mapear códigos/estados conhecidos para mensagens seguras.
- `src/index.ts:7–14` escolhe timeout de 300 segundos por causa de geração de mídia no domínio Victor. Isso não deve virar padrão de uma leitura de conversa ou envio WhatsApp. O limite adequado depende do contrato do provedor e do cliente; para envio, timeout deve gerar estado incerto e reconciliação, sem reenvio cego.

Não há evidência nesses trechos de contrato pronto para anexar mensagens por conversa, deduplicar webhook WhatsApp, distinguir homônimos ou ligar aprovação humana ao envio. As bibliotecas de marketing, imóveis e geração de conteúdo não resolvem esses requisitos por analogia.

## Template Expert Governança: fonte preferível para utilitários pequenos

- `src/shared/http.ts:31–52,55–88`: mantém origem/caminho base, barra caminhos inseguros, não segue redirect, tem timeout e não inclui corpo externo no erro. Bom candidato a extração seletiva para chamadas à Z-API. `test/shared/http.spec.ts:9–53,56–64` contém casos de traversal, origem e headers; os testes mostram a intenção verificável, não resultado executado nesta pesquisa.
- `src/shared/errors.ts:22–49`: erros inesperados viram mensagem genérica; log usa nome/operação. Padrão útil, com atenção a não colocar texto privado em `details`, que continua sendo responsabilidade do chamador.
- `src/shared/access-jwt.ts:108–138`: valida ambiente/configuração, hostname, JWT com issuer/audience e RS256; bypass depende de desenvolvimento local (`55–81`). É referência de defesa no Worker, se Cloudflare Access for compatível com o cliente escolhido. Não prova que Claude/ChatGPT enviarão os headers ou completarão a autenticação necessária. Instalação com domínio/Access não deve ser imposta sem comparar o custo operacional para leigos.
- `src/index.ts:25–43,54–70`: Code Mode pode ser desligado; quando ligado o executor recebe `globalOutbound: null`; autenticação antecede o handler MCP. Esse padrão é mais explícito que copiar um entrypoint sem autenticação. Ainda requer validar os recursos da conta e o fluxo de login real.
- `src/shared/d1.ts:54–74,88–104`: wrapper valida SQL de leitura e tabelas permitidas, depois executa SQL parametrizado escrito pela aplicação. Isso não torna seguro oferecer SQL arbitrário ao modelo. Para Elo, usar consultas tipadas com projeções explícitas evita tanto parser adicional quanto exposição acidental da tabela restrita. Só reaproveitar o wrapper se houver benefício concreto em defesa adicional.

O template é esqueleto de leitura, não produto completo. Aprovação, escrita de memória, eventos, anexos, instalação individual e política de saída ainda precisam ser implementados/validados no Elo. Não transformar o default Code Mode do template em decisão de arquitetura por herança.

## Aplicação às decisões do Elo

| Necessidade | Base útil | Adaptação necessária / critério de prova |
|---|---|---|
| Consultar memória por pessoa | SC: ID, FTS, busca curta | Relacionar fatos a contato/conversa e fonte; datas operacionais por consulta exata; correção sem apagar histórico relevante. Busca não pode inventar ausência por causa de indisponibilidade de embeddings. |
| Respostas estruturadas sem identificadores restritos | EG: contratos e erros pequenos | Nenhuma base auditada entrega esse contrato pronto. Definir projeções permitidas e testar inclusive erros. Primeiro nome/alias e ID interno; telefone, e-mail, CPF, sobrenome e IDs externos ficam fora da resposta estruturada. Texto autorizado de conversa mantém seu conteúdo. |
| Homônimos | IDs estáveis em SC/OR | Mostrar rótulo simples distinguível, como “João · empresa/contexto autorizado”, e pedir escolha quando houver ambiguidade; usar ID interno selecionado na ação. Alias e critério de contexto precisam de validação com o usuário; não usar telefone ou sobrenome como atalho. |
| Histórico que cresce por conversa | Nenhuma pronta | Registrar mensagens/eventos por identidade estável do provedor restrita ao backend; chave de deduplicação por instalação/instância/evento conforme contrato real. Atualizações de status devem atualizar o evento correto sem duplicar mensagem nem regredir estado com evento atrasado. |
| Envio aprovado sem duplicação | OR: intenção imutável e revalidação | Consumo atômico da aprovação, operação estável por ID interno, destinatário real resolvido no backend, texto/anexos versionados. Provar concorrência, retries, timeout depois da aceitação pelo provedor e reconciliação. Token ou anotação MCP não substituem a prova de autorização humana. |
| Instalação individual simples | SC: OAuth individual e runbook | Simplificar dependências, guiar contas/permissões, entrada de segredos, configuração WhatsApp, checagem final, atualização e recuperação. Testar com leigo sem terminal assistido informalmente pelo autor. |
| Claude/ChatGPT como interface | SC/OR: handlers OAuth; EG: transporte MCP | Provar conexão, leitura, aprovação e arquivo em cada cliente/plano/dispositivo adotado. Existência do protocolo no código não prova toda a jornada. |

## Recomendação condicional para o próximo passo

Antes de escolher um fork, definir duas provas pequenas: (1) pessoa correta → contexto com fonte → nova mensagem no mesmo histórico sem duplicação; (2) destinatário/texto/arquivo revisados → aprovação vinculada → um envio → retorno confirmado ou incerto recuperável. Homônimos, webhook repetido e envio com timeout fazem parte da prova, não são acabamento posterior.

Se essas provas funcionarem com D1, FTS e poucas ferramentas, manter esse recorte. Adicionar vetorização apenas após demonstrar consultas relevantes que a busca lexical/estruturada não atende; adicionar Code Mode apenas após demonstrar composição de consultas que justifique sandbox e manutenção. Copiar seletivamente os utilitários EG e o conceito de intenção do OR parece mais promissor que importar qualquer produto inteiro.

A conclusão é análise de reaproveitamento, não autorização de implementação nem proposta técnica encerrada. Ainda depende da pesquisa oficial de provedor/plataformas e da revisão adversarial exigida antes de fechar o desenho.
