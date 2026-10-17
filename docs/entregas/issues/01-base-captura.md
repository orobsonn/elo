## Resumo + por quê

O consultor precisa conectar sua própria instalação e consultar as mensagens recebidas sem entregar os números dos contatos à IA. A entrega cria o primeiro ciclo de captura e leitura, com identidade estável e autenticação do dono.

## User journeys

- #uj-1: O consultor instala sua própria base, conecta Z-API e encontra conversas sem revelar o telefone do contato à IA.
- #uj-2: O consultor distingue quatro Marios por ID/alias, retoma configuração interrompida e recebe diagnóstico sem segredos.

## Critérios de aceite (testáveis e observáveis)

- [ ] #ac-1.1: A instalação pertence à conta Cloudflare da pessoa e não exige uma base central operada pelo Elo. Duas instalações de teste não consultam nem alteram dados uma da outra. (PRD R01)
- [ ] #ac-2.1: O aluno recebe um ponto de entrada único e um roteiro legível, com contas, planos, custos e intervenções humanas antes de começar. Não precisa editar código, SQL ou arquivos de configuração. (PRD R02)
- [ ] #ac-3.1: Avaliar botão Deploy como caminho preferencial e orientação por IA local como alternativa. O caminho selecionado deve criar recursos, configurar a aplicação e conduzir até conexão e teste; publicar um Worker sozinho não significa instalação concluída. (PRD R03)
- [ ] #ac-4.1: Login, consentimento, QR do WhatsApp, verificações de conta e eventual pagamento são apresentados como ações da pessoa. Nenhum caminho depende de burlar essas etapas ou compartilhar contas. (PRD R04)
- [ ] #ac-5.1: Segredos são configurados em superfícies protegidas, sem colá-los em chats, materiais de aula ou logs. Orientação por IA não presume invisibilidade de senhas em screenshots ou terminal. (PRD R05)
- [ ] #ac-7.1: Configuração interrompida pode ser retomada sem recriar recursos ou apagar dados; a pessoa distingue configuração pendente, número desconectado e serviço indisponível. (PRD R07)
- [ ] #ac-8.1: Versão instalada, estado da conexão, última recepção e último erro seguro ficam disponíveis. Exportação de diagnóstico não contém mensagens, nomes completos, telefones, tokens ou URLs de mídia privada. (PRD R08)
- [ ] #ac-11.1: Cada conversa possui ID interno estável. IDs do provedor, telefone e endereço de envio ficam no lado restrito; a IA não informa telefone para consultar ou enviar. (PRD R11)
- [ ] #ac-12.1: Quatro contatos chamados Mario permanecem distintos. O consultor escolhe alias reconhecíveis e não sensíveis; a IA mostra opções por ID/alias e pede esclarecimento quando houver ambiguidade. Nome parecido nunca autoriza fusão ou envio. (PRD R12)
- [ ] #ac-13.1: Remetente desconhecido inicia conversa e referência provisória, sem exigir cadastro financeiro. Não promover automaticamente todo remetente a cliente ou prospect. O usuário pode associá-lo depois à ficha correta. (PRD R13)
- [ ] #ac-14.1: Mensagem nova cria um registro de mensagem na conversa correta; evento novo sobre mensagem existente atualiza seu estado sem duplicar o conteúdo. Receber o mesmo evento duas vezes não duplica mensagem, tarefa ou envio. (PRD R14)
- [ ] #ac-15.1: Guardar direção, instante do evento, instante de recepção, tipo e referência do provedor no lado adequado. Mensagens enviadas pelo próprio aparelho também entram quando a configuração e os eventos do provedor suportarem. (PRD R15)
- [ ] #ac-16.1: Filtros por contato, conversa, período, direção e termos retornam páginas limitadas, com cursor e cobertura temporal. Não despejar o dia inteiro ou toda a base sem limites. (PRD R16)
- [ ] #ac-17.1: Respostas MCP usam projeção explícita de campos permitidos. Não devolvem envelope bruto do webhook, sobrenome de perfil, e-mail, CPF, telefone, JID/LID ou endereço que permita recuperar o WhatsApp. Erros e URLs também entram nessa verificação. (PRD R17)
- [ ] #ac-18.1: O texto das mensagens pode chegar à IA e conter dados pessoais, inclusive números escritos por participantes. Não há requisito de anonimização ou remoção universal do conteúdo. Não criar campos estruturados de CPF/e-mail/sobrenome/telefone na memória consultável. (PRD R18)
- [ ] #ac-19.1: Histórico declara quando a captura começou, indisponibilidades e tipos não suportados. A solução não afirma ter histórico anterior que não recebeu. Captura desde a ativação é a hipótese inicial. (PRD R19)
- [ ] #ac-20.1: Eventos inválidos, tardios ou fora de ordem não podem trocar a identidade da conversa nem regredir um estado válido. Mudanças de telefone/endereço do provedor não unem pessoas automaticamente. (PRD R20)
- [ ] #ac-41.1: Cloudflare Access é o padrão de login do dono, integrado ao OAuth do MCP compatível com Claude/ChatGPT. A identidade validada (emissor e subject) é vinculada ao dono previamente autorizado; primeiro visitante ou política ampla de login não concede propriedade. Servidor valida sessão/tokens, permissões, expiração e revogação; nenhum hostname alternativo, preview, bypass de desenvolvimento ou chave compartilhada expõe dados/ferramentas. Consulta/preparação autenticadas não dispensam approve da Skill para envio. (PRD R41)
- [ ] #ac-44.1: Credenciais revogadas, número desconectado, quotas e indisponibilidade geram mensagem compreensível com próxima ação. Queda da IA não interrompe captura por webhook quando backend/provedor continuam disponíveis. (PRD R44)
- [ ] #ac-47.1: Diagnóstico e testes usam dados fictícios por padrão. O suporte em grupo recebe estado técnico suficiente sem receber base de clientes ou acesso administrativo permanente. (PRD R47)

- [ ] #ac-41.2: Na conexão MCP, o cliente usa OAuth e o dono entra pelo Cloudflare Access; uma identidade diferente, mesmo admitida por política ampla por engano, não assume a instalação. Validar vínculo de emissor/subject com o dono autorizado e callbacks/state/nonce/PKCE conforme o fluxo.
- [ ] #ac-41.3: Token expirado, revogado, de emissor/destinatário incorreto ou dono inativo é recusado sem revelar dados. Definir e testar o prazo efetivo de revogação de tokens MCP derivados; não supor revogação instantânea só pela política Access.
- [ ] #ac-41.4: Origem workers.dev/hostname alternativo e preview não permitem contornar autorização. Callback Z-API tem autenticação própria, sem exigir login humano nem abrir o MCP por exceção. Segredos Access/OIDC ficam em configuração protegida, não em retorno de tool.

### Verificações complementares da entrega

- [ ] Uma instalação pertence à conta Cloudflare da pessoa; duas instalações sintéticas permanecem isoladas. URL pública não concede posse ao primeiro visitante. Endpoints de configuração, leitura e manutenção exigem a autorização apropriada.
- [ ] Roteiro informa contas/custos/intervenções e permite retomar sem editar código/SQL. Bootstrap e captura não dependem de o restante do produto já existir. A instalação completa será demonstrada em E4, depois dos fluxos de envio e memória.
- [ ] Tela protegida coleta somente os dados exigidos pelo contrato Z-API, não ecoa segredos e fornece o webhook configurável. Callback tem autenticação/medidas compensatórias comprovadas; não presumir que a chave REST autentica webhook.
- [ ] Mensagem nova inicia ou continua a conversa correta. Evento repetido, status, edição, exclusão e fora de ordem seguem o contrato sem criar nova pessoa ou nova fala indevida. Mensagem própria entra quando o provedor oferecer/configurar o evento; lacunas ficam explícitas.
- [ ] Quatro Marios são distintos por ID/alias. Desconhecidos ficam provisórios; associação/fusão e troca de endereço não são inferidas pelo nome.
- [ ] Consultas por contato/período/direção/termo são paginadas e indicam cobertura. Saída e erros não expõem telefone/JID/LID, CPF, e-mail ou sobrenome de perfil em campos estruturados; corpo textual da conversa não recebe DLP universal.
- [ ] Falha de persistência não vira confirmação falsa de captura. Segredos, payload bruto, URLs privadas e mensagens não entram em diagnóstico. Consulta já respeita o corte de 30 dias; extração futura não pode bloquear o recebimento.
- [ ] MCP básico é exercitado nos dois clientes quando as credenciais/superfícies estiverem disponíveis. Teste local/protocolo e conexão real são registrados separadamente; restrição real de plataforma não vira alegação de paridade.

## Escopo

Workers + D1, migrations iniciais, MCP remoto autenticado, integração Z-API REST/webhooks, projeção de dados permitidos, aliases e histórico paginado. Instalação guiada inicial e única tela simples para credenciais Z-API e webhook. A tela não é CRM e não aprova envios. Reaproveitar seletivamente padrões das bases auditadas após conferir licença/permissão. Não copiar o framework inteiro.

Base: [PRD v1.1](https://github.com/orobsonn/elo/blob/main/docs/prd/elo-v1.md). Padrão: `.pi/harness/skills/creating-issues/SKILL.md`, formulário `harness-task.yml` e contratos de entrega/governança. Este texto define resultado/aceites, não sela plano técnico nem requer cerimônia do harness. Execução por goal será autorizada em outra sessão; a label `harness:ready` indica metadados validados conforme o harness; não autoriza configurar um scheduler ou iniciar a implementação nesta sessão.

**Paths permitidos e exclusões:** Pode: src/ de autenticação, configuração, Z-API, MCP de leitura e repositórios de captura/identidade; migrations/; test/ ou tests/ correspondentes; scripts/ de instalação; package.json/lockfile, configuração Workers e CI mínimo necessário; docs/ de instalação/diagnóstico. Esses paths são áreas candidatas a criar, não arquivos já existentes. Não tocar: .pi/, fontes/privadas/, serviços de outros projetos; não implementar envios, extração IA ou CRM nesta issue.

## Decisões já resolvidas (opcional)

Infraestrutura individual Cloudflare; login padrão Cloudflare Access integrado ao OAuth MCP; Claude e ChatGPT; grupos/anexos fora da V0; approve por Skill no chat sem tela adicional; identificadores de entrega restritos ao backend; histórico bruto ativo até 30 dias; fatos claros automáticos e conflitos pendentes; Skills/cron no harness e Work/Cowork; única tela própria de configuração Z-API/webhook.

O escopo detalhado e as exclusões adicionais estão no PRD v1.1. Robson autorizou organizar estas quatro entregas e implementar em outra sessão por goal, sem a cerimônia do harness; testes, revisão e verificação continuam exigidos.

### Suposições do modelo (atacáveis)

Integração OAuth MCP → Access for SaaS/OIDC como caminho inicial, com referência oficial em https://developers.cloudflare.com/cloudflare-one/access-controls/ai-controls/secure-mcp-servers/. Login HTML/cookie isolado ou service-token headers não substituem a integração. Workers + D1, Z-API REST, organização de módulos e paths acima são escolhas iniciais de engenharia, atacáveis pelo revisor. Botão/roteiro e autenticação precisam dos aceites da entrega. Não importar automaticamente arquitetura/garantias das bases auditadas.

## Dependências

Nenhuma.

Inspecionar o PRD e o estado real do repositório.

## Domínio sensível?

auth/sessão

## Prioridade

P1

## Tamanho estimado

L

Estas quatro issues são marcos de entrega da V0 já definidos com o operador, não mudanças pequenas. O tamanho L é explícito; na execução por goal, organizar tarefas e PRs revisáveis sem alegar que o marco inteiro cabe em 400 linhas ou retomar a cerimônia dispensada. A issue só fecha quando seus aceites materiais estiverem comprovados.

## Fora de escopo

Envio real, extração/modelo, memória/brief, grupos, anexos, CRM/dashboard, SQL/fetch genérico, importação retroativa garantida e agendador próprio de agentes.

## Riscos e caminhos sensíveis

Bootstrap/OAuth, credenciais e callback Z-API, migrations D1, vínculo contato→endereço, projeções e logs. Escala: limites de página/payload, índices, CPU e confirmação de ingestão. Nunca implantar uma porta pública de provisionamento sem dono verificado.

## Verificação e evidência de conclusão

Testes de auth/isolamento/projeção e ingestão repetida/fora de ordem contra persistência real de teste; fixture sintética para quatro homônimos e mensagem própria; replay, paginação e falha upstream. Registrar comandos/exit status e limitações. Sandbox Cloudflare/Z-API somente no ambiente autorizado; nenhuma mensagem a terceiros.

Registrar arquivos/diff, comandos executados e resultado no código final. Revisão adversarial independente dos caminhos críticos; corrigir achados materiais antes de fechar. Não usar só o relato do executor como evidência. Provas que exigem ação humana ou conta real ficam explicitamente pendentes, sem simular sucesso ou bloquear trabalho independente.
