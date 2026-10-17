## Problema e resultado esperado

O consultor precisa conectar sua própria instalação e consultar as mensagens recebidas sem entregar os números dos contatos à IA. A entrega cria o primeiro ciclo de captura e leitura, com identidade estável e autenticação do dono.

## Escopo

Workers + D1, migrations iniciais, MCP remoto autenticado, integração Z-API REST/webhooks, projeção de dados permitidos, aliases e histórico paginado. Instalação guiada inicial e única tela simples para credenciais Z-API e webhook. A tela não é CRM e não aprova envios. Reaproveitar seletivamente padrões das bases auditadas após conferir licença/permissão. Não copiar o framework inteiro.

Base: [PRD v1.0](https://github.com/orobsonn/elo/blob/main/docs/prd/elo-v1.md). Padrão: `.pi/harness/skills/harness-issues/SKILL.md` e contratos de entrega/governança. Este texto define resultado/aceites, não sela plano técnico nem requer cerimônia do harness. Execução por goal será autorizada em outra sessão; não habilitar fila automática por criar esta issue.

## Dependências

Nenhuma.

Inspecionar o PRD e o estado real do repositório.

## Critérios de aceitação

- [ ] Uma instalação pertence à conta Cloudflare da pessoa; duas instalações sintéticas permanecem isoladas. URL pública não concede posse ao primeiro visitante. Endpoints de configuração, leitura e manutenção exigem a autorização apropriada.
- [ ] Roteiro informa contas/custos/intervenções e permite retomar sem editar código/SQL. Bootstrap e captura não dependem de o restante do produto já existir. A instalação completa será demonstrada em E4, depois dos fluxos de envio e memória.
- [ ] Tela protegida coleta somente os dados exigidos pelo contrato Z-API, não ecoa segredos e fornece o webhook configurável. Callback tem autenticação/medidas compensatórias comprovadas; não presumir que a chave REST autentica webhook.
- [ ] Mensagem nova inicia ou continua a conversa correta. Evento repetido, status, edição, exclusão e fora de ordem seguem o contrato sem criar nova pessoa ou nova fala indevida. Mensagem própria entra quando o provedor oferecer/configurar o evento; lacunas ficam explícitas.
- [ ] Quatro Marios são distintos por ID/alias. Desconhecidos ficam provisórios; associação/fusão e troca de endereço não são inferidas pelo nome.
- [ ] Consultas por contato/período/direção/termo são paginadas e indicam cobertura. Saída e erros não expõem telefone/JID/LID, CPF, e-mail ou sobrenome de perfil em campos estruturados; corpo textual da conversa não recebe DLP universal.
- [ ] Falha de persistência não vira confirmação falsa de captura. Segredos, payload bruto, URLs privadas e mensagens não entram em diagnóstico. Consulta já respeita o corte de 30 dias; extração futura não pode bloquear o recebimento.
- [ ] MCP básico é exercitado nos dois clientes quando as credenciais/superfícies estiverem disponíveis. Teste local/protocolo e conexão real são registrados separadamente; restrição real de plataforma não vira alegação de paridade.

## Requisitos rastreados do PRD

- **R01:** A instalação pertence à conta Cloudflare da pessoa e não exige uma base central operada pelo Elo. Duas instalações de teste não consultam nem alteram dados uma da outra.
- **R02:** O aluno recebe um ponto de entrada único e um roteiro legível, com contas, planos, custos e intervenções humanas antes de começar. Não precisa editar código, SQL ou arquivos de configuração.
- **R03:** Avaliar botão Deploy como caminho preferencial e orientação por IA local como alternativa. O caminho selecionado deve criar recursos, configurar a aplicação e conduzir até conexão e teste; publicar um Worker sozinho não significa instalação concluída.
- **R04:** Login, consentimento, QR do WhatsApp, verificações de conta e eventual pagamento são apresentados como ações da pessoa. Nenhum caminho depende de burlar essas etapas ou compartilhar contas.
- **R05:** Segredos são configurados em superfícies protegidas, sem colá-los em chats, materiais de aula ou logs. Orientação por IA não presume invisibilidade de senhas em screenshots ou terminal.
- **R07:** Configuração interrompida pode ser retomada sem recriar recursos ou apagar dados; a pessoa distingue configuração pendente, número desconectado e serviço indisponível.
- **R08:** Versão instalada, estado da conexão, última recepção e último erro seguro ficam disponíveis. Exportação de diagnóstico não contém mensagens, nomes completos, telefones, tokens ou URLs de mídia privada.
- **R11:** Cada conversa possui ID interno estável. IDs do provedor, telefone e endereço de envio ficam no lado restrito; a IA não informa telefone para consultar ou enviar.
- **R12:** Quatro contatos chamados Mario permanecem distintos. O consultor escolhe alias reconhecíveis e não sensíveis; a IA mostra opções por ID/alias e pede esclarecimento quando houver ambiguidade. Nome parecido nunca autoriza fusão ou envio.
- **R13:** Remetente desconhecido inicia conversa e referência provisória, sem exigir cadastro financeiro. Não promover automaticamente todo remetente a cliente ou prospect. O usuário pode associá-lo depois à ficha correta.
- **R14:** Mensagem nova cria um registro de mensagem na conversa correta; evento novo sobre mensagem existente atualiza seu estado sem duplicar o conteúdo. Receber o mesmo evento duas vezes não duplica mensagem, tarefa ou envio.
- **R15:** Guardar direção, instante do evento, instante de recepção, tipo e referência do provedor no lado adequado. Mensagens enviadas pelo próprio aparelho também entram quando a configuração e os eventos do provedor suportarem.
- **R16:** Filtros por contato, conversa, período, direção e termos retornam páginas limitadas, com cursor e cobertura temporal. Não despejar o dia inteiro ou toda a base sem limites.
- **R17:** Respostas MCP usam projeção explícita de campos permitidos. Não devolvem envelope bruto do webhook, sobrenome de perfil, e-mail, CPF, telefone, JID/LID ou endereço que permita recuperar o WhatsApp. Erros e URLs também entram nessa verificação.
- **R18:** O texto das mensagens pode chegar à IA e conter dados pessoais, inclusive números escritos por participantes. Não há requisito de anonimização ou remoção universal do conteúdo. Não criar campos estruturados de CPF/e-mail/sobrenome/telefone na memória consultável.
- **R19:** Histórico declara quando a captura começou, indisponibilidades e tipos não suportados. A solução não afirma ter histórico anterior que não recebeu. Captura desde a ativação é a hipótese inicial.
- **R20:** Eventos inválidos, tardios ou fora de ordem não podem trocar a identidade da conversa nem regredir um estado válido. Mudanças de telefone/endereço do provedor não unem pessoas automaticamente.
- **R41:** MCP remoto autentica dono e limita ferramentas e dados no servidor. Antes do primeiro uso, somente o dono comprova posse e conclui o bootstrap; ser a primeira pessoa a abrir uma URL pública não concede propriedade. Permissão para consultar/preparar não dispensa o fluxo approve da Skill antes do envio. Nenhum bypass de desenvolvimento, chave compartilhada entre alunos ou endpoint alternativo público pode expor a instalação.
- **R44:** Credenciais revogadas, número desconectado, quotas e indisponibilidade geram mensagem compreensível com próxima ação. Queda da IA não interrompe captura por webhook quando backend/provedor continuam disponíveis.
- **R47:** Diagnóstico e testes usam dados fictícios por padrão. O suporte em grupo recebe estado técnico suficiente sem receber base de clientes ou acesso administrativo permanente.

## Fora de escopo

Envio real, extração/modelo, memória/brief, grupos, anexos, CRM/dashboard, SQL/fetch genérico, importação retroativa garantida e agendador próprio de agentes.

## Riscos e caminhos sensíveis

Bootstrap/OAuth, credenciais e callback Z-API, migrations D1, vínculo contato→endereço, projeções e logs. Escala: limites de página/payload, índices, CPU e confirmação de ingestão. Nunca implantar uma porta pública de provisionamento sem dono verificado.

## Verificação e evidência de conclusão

Testes de auth/isolamento/projeção e ingestão repetida/fora de ordem contra persistência real de teste; fixture sintética para quatro homônimos e mensagem própria; replay, paginação e falha upstream. Registrar comandos/exit status e limitações. Sandbox Cloudflare/Z-API somente no ambiente autorizado; nenhuma mensagem a terceiros.

Registrar arquivos/diff, comandos executados e resultado no código final. Revisão adversarial independente dos caminhos críticos; corrigir achados materiais antes de fechar. Não usar só o relato do executor como evidência. Provas que exigem ação humana ou conta real ficam explicitamente pendentes, sem simular sucesso ou bloquear trabalho independente.
