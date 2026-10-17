# Elo — memória do relacionamento e WhatsApp assistido

- **slug:** elo-v1
- **status:** pronto
- **versão do documento:** 1.0
- **criado:** 2026-10-16 · **atualizado:** 2026-10-16
- **autoria:** decisões de Robson consolidadas com pesquisa e revisão adversarial; escolhas de engenharia identificadas separadamente
- **limite desta entrega:** requisitos e pesquisa; nenhuma implementação, implantação ou validação com dados reais

## Problema

O consultor tem reuniões, anotações e conversas, mas precisa reconstruir o contexto para saber quem procurar, o que ficou combinado e quando agir. O Elo oferece memória durável e ferramentas na IA que a pessoa já utiliza, com WhatsApp como fonte de histórico e canal de ações aprovadas.

O primeiro resultado proposto é: conectar um número, receber mensagens, identificar contatos sem entregar seus números à IA, consultar o que exige atenção, preparar um retorno e enviá-lo após approve do consultor no chat. O relacionamento continua nas reuniões, nos documentos e nas datas futuras. Esse recorte inicial é recomendação do modelo, não decisão de Robson sobre a ordem de entrega.

Instalação e adoção são parte do problema principal. Uma solução que exija programação, configuração extensa de infraestrutura ou ajuda individual recorrente não atende ao público, mesmo que seu MCP funcione tecnicamente.

**Fontes e precedência:** as decisões desta conversa prevalecem sobre [BRIEF.md](../../BRIEF.md), [CONTEXT.md](../../CONTEXT.md) e as fontes enumeradas em [FONTES.md](../../FONTES.md). Entrevistas são evidência de necessidade, não autorização de integração nem prova de ganho. Esta versão adapta o Grill à autorização explícita de pesquisa autônoma: nenhuma resposta não dada pelo operador foi simulada. O PRD está fechado como base de produto para planejar as entregas. Não é um plano técnico aprovado nem autorização de deploy ou envio real. Robson autorizou publicar o projeto e organizar as issues no padrão do Pi Harness.

## Quem se beneficia

- **Consultor financeiro:** organiza memória e acompanhamento sem substituir seu CRM institucional; usa sua conta de IA e sua infraestrutura.
- **Consultor com pouca familiaridade técnica:** instala e recupera a solução por orientação clara, sem programar.
- **Robson como usuário pessoal:** consulta e envia WhatsApp sem precisar cadastrar patrimônio, GPS ou carteira financeira.
- **Cliente acompanhado:** recebe contatos pertinentes e materiais revisados pelo consultor, com menor risco de esquecimento ou troca de destinatário.
- **Equipe da formação:** ensina e diagnostica em grupo, sem acesso padrão ao conteúdo privado dos alunos.

## Requisitos

### Leitura das prioridades e evidências

**Núcleo** é o produto pretendido; **primeira prova** é uma sequência recomendada para demonstrar viabilidade. **Condicional** depende de integração ou decisão aberta. Nenhuma capacidade descrita foi implementada no Elo. Pesquisa documental confirma contratos publicados, não substitui teste ponta a ponta em contas reais.

### Quem entrega cada capacidade

Esta separação foi esclarecida por Robson após a v0.1 e prevalece sobre interpretações de que todo requisito viraria código do Elo.

| Camada | Responsabilidade |
|---|---|
| Backend e MCP do Elo | Capturar/persistir mensagens, contatos e datas; consultar/atualizar memória; resolver destinatário restrito; executar envios autorizados; manter retenção e diagnóstico |
| Skills instaladas no harness da pessoa | GPS, pós-reunião, revisão de conversas, atualização da memória, brief diário e preparação de contatos/documentos |
| Cron/agendamento do Work e Cowork | Executar as Skills nos horários escolhidos; não construir agendador equivalente no Elo |
| Interface de uso | Claude/ChatGPT. Aprovação por Skill no chat. Exceção de tela admitida: sandbox simples para configurar conexão Z-API e fornecer o webhook; não é CRM nem tela de aprovação |
| Extração auxiliar de memória no backend | Extrair candidatos de mensagens novas com modelo generativo, validar contrato/contato/fontes e registrar fatos claros sem conflito; incertezas ficam pendentes. DeepSeek V4 Flash é o modelo inicial de engenharia seguindo a preferência de Robson. Não executa brief, GPS, approve ou rotinas do consultor |

Um requisito de resultado como “gerar GPS” é entregue pela Skill usando a IA da pessoa e o MCP, sem implicar endpoint de geração ou motor de documentos no backend. Skills e instruções de agendamento integram o pacote de instalação; formatos e caminhos por plataforma devem ser testados.

**Versão 0:** envio de WhatsApp somente em texto, sem imagem ou documento. A entrega educacional prioritária é a Skill **Otimize meu processo** para otimizar processos e ajudar o consultor a criar/testar suas próprias Skills; GPS é um caso de aplicação usando o material de referência, sem exigir um gerador específico no Elo. Isso não impede a IA da pessoa de produzir um documento fora do canal de envio MCP.

### R01–R10 — instalação, conexão e operação

| ID | Comportamento e critério observável | Prioridade |
|---|---|---|
| R01 | A instalação pertence à conta Cloudflare da pessoa e não exige uma base central operada pelo Elo. Duas instalações de teste não consultam nem alteram dados uma da outra. | Núcleo |
| R02 | O aluno recebe um ponto de entrada único e um roteiro legível, com contas, planos, custos e intervenções humanas antes de começar. Não precisa editar código, SQL ou arquivos de configuração. | Núcleo |
| R03 | Avaliar botão Deploy como caminho preferencial e orientação por IA local como alternativa. O caminho selecionado deve criar recursos, configurar a aplicação e conduzir até conexão e teste; publicar um Worker sozinho não significa instalação concluída. | Primeira prova |
| R04 | Login, consentimento, QR do WhatsApp, verificações de conta e eventual pagamento são apresentados como ações da pessoa. Nenhum caminho depende de burlar essas etapas ou compartilhar contas. | Núcleo |
| R05 | Segredos são configurados em superfícies protegidas, sem colá-los em chats, materiais de aula ou logs. Orientação por IA não presume invisibilidade de senhas em screenshots ou terminal. | Núcleo |
| R06 | A instalação só termina após teste de autenticação, recebimento de evento, leitura com ID interno, envio aprovado a destino controlado e consulta do resultado. Diagnóstico informa a etapa que falta. | Primeira prova |
| R07 | Configuração interrompida pode ser retomada sem recriar recursos ou apagar dados; a pessoa distingue configuração pendente, número desconectado e serviço indisponível. | Núcleo |
| R08 | Versão instalada, estado da conexão, última recepção e último erro seguro ficam disponíveis. Exportação de diagnóstico não contém mensagens, nomes completos, telefones, tokens ou URLs de mídia privada. | Núcleo |
| R09 | Atualizar preserva dados e configurações; antes de alteração incompatível existe recuperação documentada. Uma instalação de teste deve ser atualizada e recuperada sem assistência individual de engenharia. | Núcleo |
| R10 | A pessoa pode interromper envios pendentes, revogar conexões, exportar e excluir seus dados. O procedimento explica separadamente o que fica no Elo, em backups, na Z-API e no histórico da IA. | Núcleo |

**Aceite de usabilidade:** Robson não definiu prazo em minutos; a exigência é facilidade, sem programação como barreira. Medir tempo ajuda a encontrar atritos, mas não é um limite de produto. Há um amigo leigo disponível para piloto inicial; observação dele não basta para generalizar a adoção da turma. Um ensaio ampliado é recomendação de pesquisa, não condição numérica aprovada. Não alegar “um clique” antes de demonstrar a jornada.

### R11–R20 — identidade e histórico de WhatsApp

| ID | Comportamento e critério observável | Prioridade |
|---|---|---|
| R11 | Cada conversa possui ID interno estável. IDs do provedor, telefone e endereço de envio ficam no lado restrito; a IA não informa telefone para consultar ou enviar. | Núcleo |
| R12 | Quatro contatos chamados Mario permanecem distintos. O consultor escolhe alias reconhecíveis e não sensíveis; a IA mostra opções por ID/alias e pede esclarecimento quando houver ambiguidade. Nome parecido nunca autoriza fusão ou envio. | Núcleo |
| R13 | Remetente desconhecido inicia conversa e referência provisória, sem exigir cadastro financeiro. Não promover automaticamente todo remetente a cliente ou prospect. O usuário pode associá-lo depois à ficha correta. | Núcleo |
| R14 | Mensagem nova cria um registro de mensagem na conversa correta; evento novo sobre mensagem existente atualiza seu estado sem duplicar o conteúdo. Receber o mesmo evento duas vezes não duplica mensagem, tarefa ou envio. | Primeira prova |
| R15 | Guardar direção, instante do evento, instante de recepção, tipo e referência do provedor no lado adequado. Mensagens enviadas pelo próprio aparelho também entram quando a configuração e os eventos do provedor suportarem. | Núcleo |
| R16 | Filtros por contato, conversa, período, direção e termos retornam páginas limitadas, com cursor e cobertura temporal. Não despejar o dia inteiro ou toda a base sem limites. | Núcleo |
| R17 | Respostas MCP usam projeção explícita de campos permitidos. Não devolvem envelope bruto do webhook, sobrenome de perfil, e-mail, CPF, telefone, JID/LID ou endereço que permita recuperar o WhatsApp. Erros e URLs também entram nessa verificação. | Núcleo |
| R18 | O texto das mensagens pode chegar à IA e conter dados pessoais, inclusive números escritos por participantes. Não há requisito de anonimização ou remoção universal do conteúdo. Não criar campos estruturados de CPF/e-mail/sobrenome/telefone na memória consultável. | Decidido |
| R19 | Histórico declara quando a captura começou, indisponibilidades e tipos não suportados. A solução não afirma ter histórico anterior que não recebeu. Captura desde a ativação é a hipótese inicial. | Núcleo |
| R20 | Eventos inválidos, tardios ou fora de ordem não podem trocar a identidade da conversa nem regredir um estado válido. Mudanças de telefone/endereço do provedor não unem pessoas automaticamente. | Núcleo |

**Exemplo fictício:** a IA vê `ct_7K2 / Mario trilhas`, consulta `cv_4R8` e prepara uma ação para `ct_7K2`. O endereço real de entrega nunca é parâmetro exigido do modelo. Os exemplos são ilustrativos, não contrato final de nomes de tools ou schema.

**Fronteira do armazenamento:** mensagens normalizadas com conteúdo original podem conter dados pessoais. A relação ID interno ↔ endereço do WhatsApp é uma exceção técnica explícita, autorizada pela última confirmação de Robson, restrita ao backend. Isso substitui a leitura literal anterior de “nenhum telefone em banco algum”. Não guardar o payload integral por conveniência. Primeiro nome/alias não deve ser derivado cegamente do nome completo fornecido pelo WhatsApp.

**Recepção e alterações:** quando o provedor oferecer esses eventos, edição e exclusão devem atualizar a apresentação da mesma mensagem e sinalizar que fatos derivados podem precisar de revisão. Não inventar conteúdo de áudio/imagem, registrar apenas “mídia não analisada” se não houver representação utilizável. A confirmação ao webhook deve corresponder ao que foi persistido; indisponibilidade deve ser visível e não convertida em sucesso falso. Sem replay comprovado, isso não garante recuperar tudo que deixou de chegar.

### R21–R30 — memória, retornos e atenção diária

| ID | Comportamento e critério observável | Prioridade |
|---|---|---|
| R21 | Ficha contém contexto, fatos, combinados e próximos passos. A Skill registra automaticamente fatos claros sustentados pela fonte, sem pedir confirmação de cada item. Inferências, ambiguidades e conflitos ficam como informação a avaliar, distinta do confirmado. Campo ausente não é inventado. | Decidido |
| R22 | Cada fato relevante tem origem, data do evento, registro e confirmação. Correção preserva rastreabilidade; conflito pede revisão e não sobrescreve o dado confirmado com extração incerta. | Núcleo |
| R23 | Reunião pode entrar por texto de transcrição/anotações autorizadas. Reimportar a mesma fonte não multiplica fatos e tarefas. Fatos claros podem ser consolidados automaticamente; extração ambígua ou conflitante entra para avaliação. Correções são rastreáveis. | Núcleo |
| R24 | Pendências guardam assunto, responsável quando conhecido, motivo, vencimento ou data futura e estado. “Conversar em novembro” não vira atraso em outubro. Datas relativas ambíguas pedem confirmação. | Núcleo |
| R25 | Cadência pode variar por contato e tipo de relacionamento, com adiamento e exceções. Última mensagem, último envio, última reunião e último contato relevante são informações distintas. | Núcleo |
| R26 | Brief diário junta prazos, retornos, datas, mensagens não avaliadas e informações pendentes de avaliação pelo consultor. Cada item mostra motivo, fonte disponível, contexto e ação sugerida; o consultor pode confirmar, corrigir ou descartar uma proposta. | Núcleo |
| R27 | A análise diária percorre mensagens capturadas pelo Elo no dia local solicitado, com retomada/paginação e cobertura explícita. Distingue data original da mensagem e data de ingresso. Se o limite impedir terminar, informa até onde avaliou e o que falta; não responde “nenhuma urgência” para um período parcialmente lido. Cobertura da base capturada não comprova integridade do WhatsApp ou ausência de eventos perdidos. | Núcleo |
| R28 | Distinguir marca de leitura/avaliação de conclusão de tarefa e envio de mensagem. Reexecução não duplica pendências; mensagem tardia pode entrar na próxima avaliação sem perder a data original. | Núcleo |
| R29 | Oferecer desde o início campos opcionais para aniversário do cliente, cônjuge, filhos e outras datas especiais. Consultor preenche se quiser, com vínculo e data suficiente; não exigir ano de nascimento ou cadastro completo do familiar. A Skill propõe felicitação; não envia automaticamente. | Decidido |
| R30 | Consulta antes da reunião recupera objetivos, mudanças, combinados e origem. A Skill genérica ajuda o consultor a criar/adaptar uma Skill de GPS a partir do próprio modelo, dos fatos e das recomendações que ele definir; identifica lacunas e orienta revisão da entrega. Não exige gerador ou Skill GPS fixa no backend. | Direção decidida |

**Urgência:** a IA sugere classificação e justificativa; não faz triagem garantida nem promete monitoramento em tempo real. Solicitações de ordens financeiras podem ser apontadas como “consultor precisa atender manualmente”; não são executadas pelo Elo. Urgências de saúde ou familiares não autorizam ações externas por conta própria.

**Datas e revisão diária:** usar fuso configurado da instalação e intervalo explícito, sem depender do fuso do servidor. Avaliações incompletas não avançam o marcador de conclusão de todo o período. Reexecução, mensagens tardias e duas plataformas consultando a mesma base não devem marcar como concluído trabalho que não terminou. Um aniversário sem ano não permite inferir idade; data ambígua ou regra de 29/02 precisa de comportamento declarado, sem suposição silenciosa.

**Agendamento:** a rotina é uma Skill no harness da pessoa, executada por cron/agendamento no Work/Cowork. Webhook captura; não executa a Skill. O pacote deve orientar a instalação da Skill e a configuração do agendamento com acesso ao MCP em ambas as plataformas. Execução manual é útil para teste/retomada, mas não substitui silenciosamente o fluxo agendado desejado. Não construir um segundo orquestrador de agentes no Elo. Inferência auxiliar de memória no backend é uma questão separada: o [experimento comparativo](../experimentos/memoria-30dias/RELATORIO.md) favoreceu generativo sem Clef obrigatório.

**Integrações próximas preservadas do briefing:** agenda e e-mail podem aproveitar conectores já autorizados da IA para preparar reuniões e contexto. Não exigem criar outra agenda ou serviço de e-mail. Negociar horários ou continuar ações após aprovação inicial requer limites específicos e prova, sem entrar automaticamente no primeiro recorte. Uso financeiro não exige Salesforce; WhatsApp pessoal não exige GPS. Bônus de conteúdo/prospecção não viram requisito de um CRM ampliado.

### R31–R40 — preparar, aprovar e executar ações

| ID | Comportamento e critério observável | Prioridade |
|---|---|---|
| R31 | Preparar mensagem produz rascunho vinculado ao contato correto e permite revisar conteúdo/contexto. A IA pode preparar ação usando apenas ID interno. | Núcleo |
| R32 | Uma Skill de aprovação mostra no chat o destinatário e texto propostos; a pessoa lê e dá o approve. Só depois a Skill solicita o envio pelo MCP. Mensagem de cliente não é aprovação do consultor; mudança material requer novo approve. Autenticação e validação da ação no servidor continuam necessárias, sem exigir tela própria ou gesto fora do chat. V0 não envia anexos. | Decidido |
| R33 | Aprovação tem validade, cancelamento e consumo único; vincula ID, versão do endereço resolvido e identidade/versão da instância remetente. Editar destinatário, associação contato→WhatsApp, número conectado, conteúdo ou arquivo invalida a autorização. Dois pedidos concorrentes não executam a mesma ação duas vezes. | Núcleo |
| R34 | Depois de timeout externo, registrar estado incerto e reconciliar antes de permitir nova tentativa. Não prometer entrega exatamente uma vez quando o provedor não oferece contrato para isso. | Núcleo |
| R35 | Estado distingue preparado, aguardando aprovação, autorizado, em execução, aceito pelo provedor, entregue quando confirmado, falho, cancelado e incerto. “Aceito” não é “lido”. | Núcleo |
| R36 | A versão 0 envia somente texto. Não oferece upload/envio de PDF, imagem ou outro documento pelo MCP. Chamadas de envio com anexos são rejeitadas com explicação do limite. | Decidido |
| R37 | Se mídia entrar em versão posterior, validar origem/tipo/tamanho/expiração e impedir acesso arbitrário pela URL. V0 não cria pipeline de download/upload/envio de anexos; mídia recebida não analisada é indicada como tal. | Posterior à v0 |
| R38 | Mensagens e documentos são dados, não instruções de autorização. O servidor trata esse conteúdo como dado sem autoridade para alterar regras ou permissões; segredos não são retornáveis por tool. O approve humano é exigido pela Skill, sem alegar que o servidor comprova sua autoria independentemente do modelo. Testar instruções maliciosas conhecidas, sem prometer imunidade do modelo ou controle sobre outros conectores habilitados no chat. | Núcleo |
| R39 | Aprovação diária em conjunto fica para versão posterior. Se adotada, lista destinatários e conteúdos exatos, sem permissão indefinida para disparar ou negociar. V0 aprova cada mensagem individualmente no chat. | Posterior à v0 |
| R40 | Ação aprovada e resultado ficam ligados ao histórico; tentativa falha ou rascunho não reinicia a cadência de relacionamento. Contato relevante é registrado explicitamente pelo consultor/Skill como interação efetiva, com origem e data; uma mensagem genérica não o redefine. Esse padrão de engenharia pode ser configurado sem alterar o histórico bruto. | Núcleo |

### R41–R51 — compatibilidade, manutenção e limites

| ID | Comportamento e critério observável | Prioridade |
|---|---|---|
| R41 | MCP remoto autentica dono e limita ferramentas e dados no servidor. Antes do primeiro uso, somente o dono comprova posse e conclui o bootstrap; ser a primeira pessoa a abrir uma URL pública não concede propriedade. Permissão para consultar/preparar não dispensa o fluxo approve da Skill antes do envio. Nenhum bypass de desenvolvimento, chave compartilhada entre alunos ou endpoint alternativo público pode expor a instalação. | Núcleo |
| R42 | Documentar matriz por plataforma/plano: conectar, ler, escrever, revisar, celular e agendar. Arquivos da própria IA, se descritos, não implicam envio de anexos WhatsApp na V0. Marcar suportado documentalmente, testado ou pendente; não presumir paridade Claude/ChatGPT. | Primeira prova |
| R43 | Jornadas principais são testadas no celular real. Configuração inicial orientada no computador é a hipótese de planejamento, coerente com a instalação assistida pela IA local; uso diário não pode depender de terminal. Restrição maior exige apresentar impacto antes de mudar o escopo. | Núcleo |
| R44 | Credenciais revogadas, número desconectado, quotas e indisponibilidade geram mensagem compreensível com próxima ação. Queda da IA não interrompe captura por webhook quando backend/provedor continuam disponíveis. | Núcleo |
| R45 | Histórico bruto é removido do armazenamento ativo em até 30 dias da data original da mensagem; consultas aplicam o corte mesmo durante limpeza pendente. Evento tardio não reinicia o prazo. Fonte sem data confiável tem retenção conservadora e diagnóstico explícito, sem prolongamento silencioso; detalhe do tratamento é da engenharia. Fatos claros registrados automaticamente e propostas concisas a avaliar podem permanecer na memória, sem copiar o histórico integral. Fonte expirada é sinalizada. Backups/Time Travel e sua recuperação residual são documentados. Exclusão não recria histórico por replay; restauração reaplica retenção antes de liberar consultas, bloqueia envios e invalida autorizações antigas. | Decidido / prova técnica |
| R46 | Perfil de uso mensurável estima requisições, CPU, linhas lidas/escritas, índices, armazenamento, mídia e plano da IA. Mostrar custos externos e avisos antes de habilitar recursos pagos. | Núcleo |
| R47 | Diagnóstico e testes usam dados fictícios por padrão. O suporte em grupo recebe estado técnico suficiente sem receber base de clientes ou acesso administrativo permanente. | Núcleo |
| R48 | Procedimentos/Skills vêm com exemplo, saída esperada, informação ausente, erro e conferência. Não depender de formato de Skill idêntico em todos os clientes. | Núcleo |
| R49 | Extração auxiliar backend processa novidades em lotes limitados com generativo, sem Clef obrigatório. Valida schema, contato, campos, fontes e estado antes da escrita; fato claro sem conflito pode entrar automaticamente, demais candidatos ficam pendentes. Falha não perde mensagens, não marca período incompleto como concluído nem estende retenção. Extração e Skills compartilham escrita idempotente, origem e regras de conflito. Qualidade incremental, formato, custo e limite de execução são aceites da entrega. | V0 / escolha de engenharia |
| R50 | GPS e rotinas são Skills instaladas no harness da pessoa; o pacote inclui orientação de cron no Work/Cowork. O backend oferece operações de dados e ação, sem duplicar esses procedimentos como serviços próprios. | Decidido |
| R51 | Entregar “Otimize meu processo”: entrevistar o consultor sobre a rotina e o resultado desejado; avaliar recursos disponíveis na plataforma/harness (computer use, cron, conectores, MCP, arquivos e demais capacidades pertinentes); desenhar uma rotina melhor; criar/adaptar a Skill e testá-la junto com a pessoa até demonstrar o resultado ou explicitar um bloqueio. Conferir disponibilidade/permissões reais, sem prometer toda capacidade em todo ambiente. GPS é exemplo, sem formato único obrigatório. | Decidido |

### Padrões de engenharia para começar, sem nova pesquisa bloqueante

- **Base:** Workers + D1, MCP com ferramentas tipadas e Z-API REST. Reaproveitar padrões auditados, sem fork integral, banco genérico exposto ou abstração de múltiplos provedores.
- **Modelo auxiliar inicial:** `@cf/deepseek-ai/deepseek-v4-flash-0731`. Preferir a variante Flash por escopo/custo; não adicionar Pro, Clef ou segunda chamada de verificação por padrão. Limitar entrada, saída, repetição e raciocínio conforme o contrato efetivamente suportado. Modelo é configuração da instalação; Llama 4 Scout (`@cf/meta/llama-4-scout-17b-16e-instruct`) é alternativa a validar, sem failover automático silencioso ou roteador novo.
- **Custo explícito:** esse DeepSeek exige Workers Paid ou créditos pré-pagos AI Gateway. A tarifa publicada em 16/10/2026 é US$ 0,44/M tokens de entrada e US$ 1,32/M de saída. Isso é consumo de IA, não promessa de que US$ 5 cubram todos os serviços. A instalação informa requisitos e custo antes de ativar inferência. [Modelo DeepSeek](https://developers.cloudflare.com/workers-ai/models/deepseek-v4-flash-0731/), [Scout](https://developers.cloudflare.com/workers-ai/models/llama-4-scout-17b-16e-instruct/).
- **Extração versus rotina:** o backend extrai candidatos limitados e conserva estado/origem; as Skills revisam pendências com a pessoa, preparam brief/contatos e executam seus procedimentos. Não fazer a mesma extração duas vezes por padrão. Mecanismos técnicos de processamento/retry/limpeza são permitidos; não constituem um agendador próprio de agentes. A confirmação do webhook não depende de terminar uma inferência remota.
- **Falha segura de extração:** falha de modelo/schema mantém trabalho pendente e diagnóstico, com repetição limitada; não faz escrita parcial inválida nem retarda o expurgo. Schema/validador garantem contrato e identidade, não verdade semântica. Qualidade do DeepSeek e preservação de contexto incremental serão verificadas com o corpus e novos casos na entrega.

### Sequência recomendada e provas de aceite

Esta sequência descreve testes de aceite **durante/depois da implementação**, não pré-requisitos para organizar issues. Não há MCP nem instalador Elo para testar hoje. Antes das issues, é possível exercitar Skills com entradas/saídas fictícias e inferência isolada (como o teste Clef); persistência e integração ficam para as entregas correspondentes. A sequência não constitui plano de implementação aprovado:

1. **Instalação e identidade:** implantação em conta limpa, autenticação do MCP, evento fictício e projeção de campos. Provar quatro Marios, remetente desconhecido e rejeição de envelope bruto.
2. **Ciclo de WhatsApp:** conversa nova, continuação, mensagem própria, duplicata, fora de ordem, consulta paginada, rascunho, aprovação e envio controlado com conciliação de timeout.
3. **Memória e acompanhamento:** importar uma reunião fictícia duas vezes, revisar fatos, corrigir conflito, registrar próximo contato e aniversário, gerar brief com fontes e cobertura.
4. **Clientes e operação:** celular, texto aprovado, rotina agendada, quota, desconexão, atualização, restauração e exclusão. PDF/imagem ficam fora da v0.
5. **Instalação com público:** concluir o roteiro com pessoas leigas; registrar atritos e corrigir a experiência antes do workshop.

**Métricas de valor:** tempo até primeiro ciclo completo, conclusão da instalação sem ajuda individual, tempo de preparação do contato, recuperação correta de combinados, correções necessárias, falhas de envio, duplicações, cobertura da avaliação diária e custo no perfil medido. Não anunciar ganho “10x” ou horas economizadas como resultado já obtido.

### Modelo conceitual e fronteiras, sem schema congelado

| Registro | Função e vínculo | Restrição principal |
|---|---|---|
| Instalação e preferências | Dono, fuso, idioma, versão, cadência padrão e estado de configuração | Não é um tenant de serviço central; autenticação do dono separada da identidade de clientes |
| Contato | ID interno, alias, tipo de relacionamento e fatos aprovados | Alias é apresentação; homônimos não compartilham chave |
| Canal restrito | Endereço do provedor ligado ao contato, instância e versão da associação | Telefone/LID e demais identificadores não saem pelas tools |
| Conversa e mensagem | Histórico com origem, datas, direção e tipo | Nova mensagem não é novo cadastro; status/edição/exclusão não são novas falas |
| Fonte e fato | Reunião/anotação/mensagem de origem, valor, confirmação e correções | Distinguir o que foi dito de interpretação e recomendação |
| Informação a avaliar | Proposta concisa ligada ao contato, origem/data e estado pendente/confirmada/descartada | Pode sobreviver ao histórico de 30 dias; rotina consulta pendências, sem tratá-las como fatos confirmados ou copiar conversa inteira |
| Pendência e evento | Compromisso, aniversário ou marco; data, responsável e motivo | Uma mensagem genérica não conclui tarefa ou reunião |
| Avaliação | Período, cursor e cobertura das mensagens capturadas | Estado de avaliação não é recibo de leitura do WhatsApp nem garantia de urgências encontradas |
| Documento/mídia | Referência privada, versão e conteúdo aprovado | URL mutável não comprova os mesmos bytes revisados |
| Ação e aprovação | Intenção imutável, dono, destino resolvido/versionado, expiração e consumo | Approve humano solicitado pela Skill no chat; servidor valida vínculo, validade e consumo, sem atestar independentemente a autoria humana |
| Execução | Estado, IDs externos restritos, tentativas e resultado | Registro ausente não comprova que o envio externo não aconteceu |

A memória consultável não ganha campos de sobrenome, CPF, telefone ou e-mail de clientes. Texto original de conversa é exceção de conteúdo expressamente aceita; não criar uma promessa de remoção desses dados de toda nota escrita em linguagem natural. Extração de memória não deve criar deliberadamente fichas paralelas com esses identificadores. O suporte não recebe exportação restrita; exportação completa, se necessária para migração, é operação autenticada do titular fora da resposta MCP comum.

**Informação a avaliar no banco:** precisa de vínculo com contato, conteúdo conciso, origem/data, motivo da pendência e estado. A rotina do consultor recupera o que está pendente e registra confirmação/correção/descarte. O desenho físico (mesma tabela de memória com estado ou estrutura própria) é detalhe da futura issue, sem decisão de banco transferida ao operador. Expirar a mensagem não elimina automaticamente essa proposta nem transforma seu estado em confirmado. Documento/mídia na tabela acima é extensão posterior, não requisito de armazenamento de arquivos na v0.

**Capacidades MCP candidatas:** encontrar contatos; consultar ficha/contexto; listar conversas e mensagens por período; pesquisar trechos; propor/revisar atualização da memória; consultar/adicionar/adiar pendências e eventos; consultar dados para o brief produzido pela Skill; preparar rascunho de ação; consultar estado da ação e estado seguro da instalação. Nomes, quantidade e schemas finais ficam para o desenho técnico. Não oferecer SQL, fetch arbitrário, credenciais como parâmetro ou acesso genérico ao banco restrito. Apenas tools de manutenção explicitamente autorizadas alteram configuração.

**Estados que não devem ser confundidos:** captura de mensagem; avaliação pela IA; proposta de fato; confirmação do fato; lembrete vencido; contato realizado; ação autorizada; envio aceito; entrega confirmada. Mudança em um desses estados não implica os demais.

A revisão humana é feita no chat pela Skill de aprovação: apresentar proposta, aguardar approve do consultor e então chamar o MCP. A confirmação é do conteúdo/destino propostos, não autorização genérica. O backend valida a ação vinculada; o texto de uma Skill não constitui, sozinho, prova criptográfica de gesto humano e essa não será uma garantia anunciada. Não criar confirmação fora do chat para resolver essa distinção. Cursores/IDs não dispensam autenticação; aprovação consumida ou execução expirada não autoriza repetir operação incerta.

### Evidências de viabilidade e limites atuais

- **Reaproveitamento:** auditoria estática das quatro bases concluiu por extração seletiva de utilitários e padrões, sem fork integral. A aprovação KV do Oráculo não demonstra consumo atômico; seus retornos de leads expõem identificadores que o Elo deve restringir. [Relatório e commits](../pesquisa/referencias.md).
- **WhatsApp:** REST documenta texto, PDF e imagem; MCP nativo não cobre todo o histórico e contrato do Elo. Mensagens próprias exigem configuração específica. Histórico retroativo, replay e autenticação verificável dos callbacks permanecem sem contrato suficiente encontrado. [Matriz oficial](../pesquisa/whatsapp-clientes.md).
- **Recorrência:** documentação atual de Claude e ChatGPT descreve tarefas com conectores/plugins; isso apoia uma prova do brief automático, sem exigir de saída um executor próprio. Conta, plano, autenticação do Elo e execução efetiva continuam pendentes. [ChatGPT](https://learn.chatgpt.com/docs/automations), [Claude](https://support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-claude-cowork).
- **Instalação:** o botão oficial pode provisionar recursos e rodar migrations preparadas pelo autor; não substitui contas, pareamento ou autenticação da IA. [Deploy buttons](https://developers.cloudflare.com/workers/platform/deploy-buttons/), [jornada e alternativas](../pesquisa/instalacao-cloudflare.md).
- **Custo:** Z-API Ultimate publicou R$ 99,99/mês por instância na consulta de 16/10/2026; não é custo completo. Workers Free e D1 podem atender uma hipótese pequena, mas D1 Free tem limite de 500 MB por banco e Workers Free tem teto de CPU. A estimativa anterior de seis meses é cenário histórico e não representa a retenção atual de 30 dias; custo vigente deve ser medido incluindo memória durável, inferência e crescimento da carteira. Code Mode adiciona plano/dependência sem necessidade inicial demonstrada. [Preço Z-API](https://z-api.io/), [estimativas e fontes Cloudflare](../pesquisa/instalacao-cloudflare.md).

### Pontos de decisão técnica já encaminhados como recomendação

1. Preferir memória relacional e ferramentas tipadas pequenas; adiar grafo, embeddings e Code Mode até existir um problema de consulta que justifique seu custo.
2. Preferir botão + configuração guiada na instalação da pessoa; a alternativa por IA local é complementar, pois pode introduzir dependências e acesso amplo no computador.
3. Implementar o fluxo de aprovação pela Skill no chat, como decidido: sugestão, revisão pelo consultor, approve e chamada MCP. Persistir/validar a intenção exata no backend. Compatibilidade e tratamento de mudança/repetição são aceites da futura issue, sem exigir tela adicional.
4. Priorizar prova da rotina recorrente com MCP próprio, já apoiada documentalmente. Caso falhe, trazer alternativa e impacto de produto; não declarar unilateralmente que brief manual satisfaz a mesma necessidade.

Essas recomendações não dispensam aprovação de escopo nem resolvem por discussão os testes de segurança, CPU, compatibilidade e usabilidade.

## Decisões travadas

1. Elo é memória e ações para acompanhamento de clientes, com uso pessoal de WhatsApp pelo Robson; não é uma biblioteca de modelos mentais.
2. Infraestrutura individual Cloudflare, sem SaaS central para todos os alunos. Instalação simples para leigos é condição central, com botão ideal ou orientação clara da IA no computador da pessoa.
3. Claude e ChatGPT são ambos obrigatórios. A base MCP é comum; conexão, leitura, Skills, agendamentos, aprovações e arquivos têm aceites separados nos dois clientes.
4. Z-API é a integração de WhatsApp indicada. Backend guarda histórico recebido e permite análise do período pela IA.
5. IDs internos são a interface para selecionar contatos e enviar mensagens. Identificadores necessários ao WhatsApp podem permanecer restritos no backend.
6. Cadastro/memória consultável não deve ter sobrenome, e-mail, CPF ou telefone como campos. Conversas podem conter esses dados e podem ser lidas pela IA. Não exigir anonimização universal do texto nem afirmar que há anonimização completa.
7. Ações externas passam por aprovação do usuário; consultor revisa recomendações e materiais. Sem operações financeiras autônomas.
8. Retornos são confirmados inicialmente pelo consultor; datas de cliente, cônjuge, filhos e datas especiais são campos opcionais desde o início.
9. Suporte em grupo; não transferir arquitetura, segurança ou escolha de banco para Robson julgar tecnicamente.
10. Robson autorizou goal com comitê, pesquisa autônoma e primeiro PRD com decisões em aberto, **sem implementar**. Pediu eficiência de custo e Astra nos pontos de decisão de alta alavancagem.
11. Grupos de WhatsApp ficam fora da primeira versão; eventual inclusão depende de demanda posterior. Captura de conversas individuais preservada.
12. Histórico no máximo 30 dias; revisar informação útil para memória do cliente. Robson sugeriu Clef no backend e autorizou teste de qualidade com dados sintéticos em sua conta paga da Cloudflare.
13. Instalação precisa ser fácil, sem meta de tempo imposta. Free é alvo; plano Workers de US$5 é aceitável se necessário, sem tratar esse valor como teto de todos os serviços.
14. GPS, revisão e outras rotinas serão Skills no harness da pessoa, com agendamentos no Work/Cowork; não funcionalidades equivalentes a reconstruir no backend.
15. Front amplo permanece fora do escopo. Robson admitiu um sandbox com tela simples e clean exclusivamente para conectar WhatsApp: a pessoa informa credenciais obtidas na Z-API e recebe o webhook para configurar lá. Não há aprovação de envios nessa tela. Os mocks anteriores continuam arquivados, sem aprovação; um amigo leigo pode participar do piloto quando houver instalador.
16. Aprovação de envio é uma Skill no chat da IA: a IA sugere, a pessoa lê e dá o approve, então a Skill solicita a execução pelo MCP. Não criar aprovação fora do chat.
17. A Skill pode registrar fatos claros automaticamente; revisão do consultor fica para ambiguidades/conflitos e informações marcadas a avaliar. Isso não automatiza autorização de envio.
18. Propostas concisas podem permanecer após os 30 dias como informação a avaliar e aparecer na rotina do consultor. Não manter conversas inteiras disfarçadas de memória.
19. V0 sem envio de imagem ou documento: apenas texto pelo WhatsApp.
20. A Skill se chama **Otimize meu processo**, substituindo o nome anterior “Simplifique meu processo”. Ela entrevista, considera os recursos da plataforma/harness, cria uma Skill para o processo escolhido e testa junto com o consultor. GPS em Downloads é referência/exemplo, sem formato único obrigatório.
21. Robson autorizou novo goal experimental para comparar modelo generativo + Clef na análise de histórico sintético de 30 dias. Não autoriza implementar essa stack no produto antes de avaliar resultados e integrar o desenho.

### Resultado experimental e escolha inicial para construção

O [experimento de 30 dias](../experimentos/memoria-30dias/RELATORIO.md), com revisão adversarial Astra, favoreceu **Llama 3.3 70B fast + schema compatível + validação local**, sem Clef obrigatório. Dois filtros Clef perderam fatos explícitos; a segunda chamada pós-extração não corrigiu a baseline e acrescentou pendências/custo. Recuperação de schema foi demonstrada em dois casos dirigidos, não validada em produção. O ensaio comparou Llama 3.3 e Qwen, não Llama 4 Scout ou DeepSeek. Posteriormente Robson relatou bons testes próprios com Scout e aceitou DeepSeek na Cloudflare. Por essa preferência, a escolha inicial de engenharia passa a DeepSeek V4 Flash, mantendo schema/validação local e sem Clef obrigatório. Isso não declara o novo modelo superior nem já validado no Elo. Qualidade incremental e aceites integrados ficam na entrega correspondente.

## Suposições do modelo

1. **Base técnica para planejar, responsabilidade da engenharia:** um serviço pequeno em Workers, memória e histórico relacionais em D1, arquivos privados somente se necessários, credenciais em secrets. Separação lógica de dados restritos não implica dois bancos ou vários serviços. Busca semântica, grafo, Code Mode e infraestrutura multiusuário não são pré-requisitos. Contratos e detalhes serão definidos no plano e revisados; não é código já entregue.
2. **Instalação candidata:** botão Deploy e/ou orientação por IA local. Sandbox simples de conexão Z-API coleta a chave da conta e os dados de instância/número necessários e fornece o webhook para a pessoa copiar ao provedor. Definição técnica dos campos e guarda protegida dos segredos ficam para a issue; valores não entram em chat/logs. Alias e datas por MCP/Skill; nenhuma tela de aprovação ou CRM. Teste completo com leigo somente quando houver caminho instalável.
3. **Identidade:** ID aleatório e alias escolhido pelo consultor. Contatos novos ficam provisórios até associação confirmada. Não usar apelido como chave, hash simples de telefone como ID público ou nome completo do perfil para distinguir homônimos.
4. **Captura inicial:** começar na ativação, registrar mensagens próprias e recebidas disponíveis, sem promessa de importação retroativa. Grupos excluídos por decisão; exclusões específicas de conversas individuais ainda podem ser configuradas conforme necessidade.
5. **Memória:** fatos com fonte e revisão, não importação do grafo de conceitos do Segundo Cérebro. Sem cotação, cálculo de carteira ou recomendações financeiras automáticas.
6. **Cadência:** atividade de comunicação não conclui sozinha pendência ou reunião. A confirmação manual inicial foi aceita; sugestões futuras podem ser avaliadas sem expandir o backend agora.
7. **Primeira experiência:** ambas as plataformas fazem parte do produto; provas podem ocorrer uma por vez. Rotinas e criação/adaptação de Skills pertencem ao harness. V0 envia texto; PDF/imagem ficam para depois.
8. **Retenção:** limite de 30 dias foi decidido. Estimativas antigas de 90/365 dias nos relatórios são cenários anteriores, não a política atual. Modelagem de backups e fontes expiradas precisa respeitar essa distinção.
9. **Dados institucionais:** pesquisa e provas iniciais fictícias. Regras externas não são consideradas validadas por esta discussão; isso não bloqueia desenho do produto.

## Em aberto

### Fechamento de produto

**Nenhuma decisão de produto bloqueia o planejamento da V0.** As respostas de Robson estão incorporadas, incluindo DeepSeek como preferência inicial e Otimize meu processo. Os itens abaixo são trabalho de engenharia e aceites da implementação, não uma nova entrevista ou condição de possuir o sistema pronto antes de organizar as issues. Se uma integração não sustentar um requisito, apresentar a limitação concreta e o impacto; não reduzir escopo silenciosamente.

O [handoff em quatro entregas](../entregas/elo-v0.md) mapeia todos os requisitos da V0. R37 (anexos) e R39 (approve em conjunto) são posteriores. O nome do produto e detalhes educacionais/comerciais não bloqueiam esse recorte.

### Aceites técnicos das futuras issues, sem exigir produto pronto antes de criá-las

- Autenticação compatível com cada cliente; integração e segurança do webhook; isolamento de identificadores, logs e mídia.
- Fluxo approve pela Skill no chat; vínculo da ação, concorrência, idempotência externa e conciliação do resultado incerto.
- Provisionamento, migrações, segredos, bootstrap seguro, conexão e atualização no caminho escolhido.
- Recorrência com custom MCP e planos/dispositivos suportados; alternativa explícita caso não exista.
- Revisão e texto no celular; mensagens próprias, histórico e lacunas da Z-API. PDF/imagem/transcrição própria não são aceites da v0.
- Perfil de custo e limites de aplicação ainda precisa ser medido; nenhuma instalação real do Elo foi executada nesta pesquisa.
- Classificação Clef e extração generativa foram comparadas com dados sintéticos; extração incremental, integração, carga, retenção e instalação ainda não foram testadas. O candidato é generativo com schema/validação local, sem depender de classificação sem falsos negativos.

## Fora de escopo

- Implementar o produto, provisionar infraestrutura de execução ou enviar mensagens reais nesta etapa de fechamento. Publicação do repositório e das issues foi autorizada por Robson.
- CRM corporativo completo, migração/substituição obrigatória de Salesforce, chat próprio e agenda própria.
- SaaS central com dados de todos os alunos, credenciais compartilhadas ou suporte individual permanente.
- Ordens, movimentações, alocação financeira ou aconselhamento autônomo; SDR de voz e disparos em massa.
- Anonimização integral de mensagens e documentos; filtro universal de dados pessoais no conteúdo livre.
- Grafo de modelos mentais, busca vetorial por padrão, Code Mode por padrão, execução de JavaScript arbitrário e abstrações multiusuário sem necessidade.
- Grupos na primeira versão; histórico retroativo, transcrição própria e negociação autônoma sem validação específica.
- Upload/envio de imagens e documentos pelo MCP na versão 0, pipeline de anexos e obrigação de uma Skill GPS fixa para todos.
- Reimplementar Skills GPS/revisão/brief como serviços geradores no backend ou construir um agendador de agentes substituindo cron do Work/Cowork.
- Front de CRM, dashboard ou tela de aprovação. A exceção admitida é o sandbox simples de configuração Z-API/webhook. Mocks anteriores continuam arquivados sem aprovação.
- Bônus de conteúdo/prospecção como expansão obrigatória do backend do Elo; permanecem entregas educacionais separadas.

## Riscos conhecidos

| Risco | Consequência e tratamento exigido |
|---|---|
| Conteúdo livre contém dados pessoais | Aceito como limite de produto pelo operador; comunicar corretamente. Identificadores estruturados continuam restritos. Não anunciar anonimização. |
| Mensagem injeta instruções | Ferramentas e servidor aplicam limites; mensagem não autoriza envio ou acesso adicional. |
| Confusão entre quatro Marios | ID estável, alias e desambiguação; fusão não automática; aprovação aponta o destinatário inequívoco. |
| Skill/modelo executa sem approve | Skill deve aguardar a pessoa no chat e enviar a ação exata. Autenticação/vínculo/estado são verificados no backend; não anunciar o prompt como garantia criptográfica da autoria do approve. |
| Timeout e retry externo | Estado incerto e conciliação; sem promessa universal de envio exatamente uma vez. |
| Webhook não autenticado adequadamente | Não assumir que autenticação REST protege callbacks. Fechar contrato do provedor e medidas compensatórias antes de piloto. |
| Requisitos de cron incompatíveis com cliente | Documentar combinações suportadas; base interativa explícita; alternativa autônoma teria custos e responsabilidades próprios. |
| Instalação técnica disfarçada de um clique | Medir ciclo completo; remover edição de código e dependências manuais desnecessárias; não vender botão como solução de todas as contas. |
| Base gratuita insuficiente | Medir CPU, armazenamento e consultas com índices; mostrar teto, retenção e custo antes de ativação paga. |
| Provedor/WhatsApp desconecta ou restringe número | Testar com número controlado, registrar cobertura e reconexão, explicar dependência; sem garantia de continuidade da conta. |
| Captura, mídia ou paginação incompletas | Expor cobertura, cursores e formatos não processados; não prometer análise total quando parcial. |
| Updates e exclusão recriam/perdem dados | Prova de migração, restauração e replay após exclusão; backups e versões tratados separadamente. |

O Elo controla suas ferramentas e armazenamento. Não consegue garantir que uma mensagem maliciosa jamais influencie o modelo nem que outros conectores do mesmo chat não sejam usados indevidamente. Separar a rotina de leitura do WhatsApp de acessos amplos desnecessários é recomendação de configuração, não uma alegação de imunidade universal.

### Registro da revisão e da pesquisa

Foram lidos os relatórios [referências de código](../pesquisa/referencias.md), [WhatsApp e plataformas](../pesquisa/whatsapp-clientes.md), [instalação Cloudflare](../pesquisa/instalacao-cloudflare.md) e a [revisão adversarial do Astra](../pesquisa/revisao-adversarial.md). [Método e roteamento](../pesquisa/metodo.md) registram o escopo. A v0.2 acrescentou [teste real de inferência Clef sintético](../pesquisa/clef-memoria-30dias.md); a v0.3 retirou as telas por decisão de Robson e [arquivou rascunhos sem aprovação](../pesquisa/adiados/README.md). Relatórios anteriores preservam propostas históricas, inclusive front, não mais vigente. Na v0.4 prevalecem Skills no harness, dois clientes obrigatórios, grupos fora, retenção de 30 dias, approve no chat e sandbox de tela simples somente para configurar Z-API/webhook. Testes de integração são aceites de implementação, não condições de produto pronto antes das issues.

| Achado do adversário | Tratamento documental incorporado |
|---|---|
| 1. Identidade mutável sob ID aprovado | R33 inclui associação e instância remetente versionadas; mudança invalida aprovação |
| 2. Bootstrap e aprovação sem dono verificável | R41 e fronteiras de sessão humana/MCP, sem propriedade pelo primeiro visitante |
| 3. Mensagem/evento/edição/estado confundidos | R14–R20 e nota sobre recepção/alterações/fatos derivados |
| 4. Cobertura superafirmada | R27 limita conclusão ao conjunto capturado e explicita completude externa desconhecida |
| 5. Token e trava confundidos com autorização/entrega | R32–R35 e fluxo humano; operação incerta não repete só por expiração |
| 6. Restauração revive aprovações | R45 exige bloqueio independente do estado restaurável e invalidação |
| 7. Garantia ampla contra injection | R38 e risco residual limitado à fronteira do Elo |
| 8. Reabrir captura de todas as individuais | Pergunta 3 agora trata apenas grupos e exclusões, preservando a direção de captura |
| 9. Metas de piloto divergentes | Cinco pessoas / quatro conclusões / 30 minutos como hipótese, não promessa aprovada |
| 10. Documentação confundida com teste | R42 e matriz distinguem evidência documental, prova real e oferta |

“Incorporado” significa corrigido no requisito ou tratado como hipótese/limitação, não que a proteção foi implementada ou provada. O produto está pronto para planejar; desenho dos contratos críticos e ensaios pertencem às entregas. A revisão não é aprovação de pipeline nem prova de implementação. O fechamento v1.0 passou por nova leitura adversarial Sol/medium; foram corrigidos o limite do approve no chat, retenção ativa, responsabilidade de extração, desktop inicial e exclusão inequívoca de R37/R39.
