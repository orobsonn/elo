# Elo — briefing completo de produto e requisitos

**Data:** 16 de outubro de 2026.
**Responsável:** Robson Lins.
**Nome de trabalho:** Elo.
**Estado:** briefing histórico; o PRD v1.0 fecha o produto para planejamento. Arquitetura detalhada e implementação pertencem às entregas.

> **Atualização de precedência — 16/10/2026:** Robson autorizou o levantamento autônomo com comitê e primeiro PRD, sem implementação. Consulte [docs/prd/elo-v1.md](docs/prd/elo-v1.md). Na decisão mais recente, o conteúdo das conversas pode chegar à IA, sem anonimização universal; os campos estruturados de telefone, sobrenome, e-mail e CPF não são expostos. Endereços de WhatsApp necessários ao envio permanecem restritos ao backend, resolvidos por ID interno. Instalação individual Cloudflare acessível a leigos é requisito central, idealmente por botão ou orientação clara por IA local. Essas definições substituem leituras anteriores incompatíveis, sem transformar hipóteses técnicas em decisões aprovadas.

> **Esclarecimentos da v0.2:** GPS e rotinas são Skills no harness da pessoa, agendadas no Work/Cowork; não serviços equivalentes a recriar no backend. Claude e ChatGPT obrigatórios, grupos fora inicialmente, histórico consultável até 30 dias, datas familiares/especiais opcionais. Instalação fácil sem prazo em minutos; Workers US$5 aceitável se necessário. Telas são revisadas no Lavish e cada aprovação é preservada em mock versionado. Teste Clef sintético foi autorizado e executado separadamente, sem implementar o Elo.

> **v0.3 — decisão mais recente:** front e telas próprias estão fora do escopo; considerar somente se houver demanda futura. Lavish encerrado e mocks arquivados sem aprovação. Interface pelo Claude/ChatGPT; procedimentos pelas Skills e crons Work/Cowork. O parágrafo anterior sobre revisão de telas é histórico, não trabalho atual autorizado.

> **Precedência atual — PRD v1.0:** há uma exceção de tela simples para conectar Z-API e fornecer o webhook. Envios na V0 são somente texto, aprovados pela Skill no chat. Fatos claros podem ser registrados automaticamente; incertezas e conflitos ficam como informação concisa a avaliar na rotina, mesmo após expirar a conversa. A Skill genérica se chama **Otimize meu processo**: entrevista, avalia recursos da plataforma, cria/adapta uma Skill e testa junto com o consultor. O [experimento sintético de 30 dias](docs/experimentos/memoria-30dias/RELATORIO.md) favorece generativo com schema/validação local sem Clef obrigatório; é recomendação experimental, sem implementação de produto. Robson posteriormente aceitou DeepSeek na Cloudflare; a escolha inicial de engenharia é DeepSeek V4 Flash, ainda a validar no Elo. O produto está fechado no PRD v1.0, com quatro issues publicadas; perguntas antigas deste briefing são históricas.

## 1. O que estamos construindo

Uma estrutura individual de memória e ferramentas que permita ao usuário transformar sua IA pessoal em um assistente capaz de consultar informações organizadas, preparar trabalho e executar ações aprovadas.

O primeiro uso é a rotina do consultor financeiro: transformar reuniões e interações em histórico útil, gerar briefing e GPS, lembrar combinados, preparar o acompanhamento e ajudar nos contatos pelo WhatsApp. A experiência desejada pelo Robson foi descrita como um “Jarvis”, dentro de um escopo pequeno e previsível.

O usuário continua conversando com Claude ou ChatGPT. A intenção é que sua própria IA faça o raciocínio, a redação e a geração de documentos; o Elo oferece memória e ferramentas. Não foi decidido criar um chat próprio, um modelo de IA próprio ou uma operação central para atender todos os alunos.

Robson também pretende usar o MCP de WhatsApp pessoalmente. Por isso, ler histórico e enviar mensagens não deve exigir que todo contato tenha um cadastro financeiro, um GPS ou uma etapa da formação.

## 2. Como interpretar as decisões

Este documento separa quatro situações:

- **Decidido:** orientação explícita do Robson ou definição consolidada na oferta.
- **Direção preferida:** caminho desejado, sujeito à viabilidade e ao grill.
- **Hipótese:** alternativa ou detalhe sugerido que ainda não foi validado.
- **Em aberto:** decisão, capacidade ou restrição que precisa ser resolvida.

Requisitos de comportamento não equivalem a uma escolha de arquitetura. As entidades e capacidades abaixo ajudam a fazer perguntas e testar o produto; não são um schema de banco nem um contrato MCP já aprovado.

## 3. Decisões e restrições consolidadas

| Tema | Situação atual |
|---|---|
| Público comercial | **Decidido:** consultores financeiros. Bancários deixam de ser o foco da comunicação. |
| Valor central | **Decidido:** solução aplicável e pronta para configurar, com memória e ações; não um pacote de prompts genéricos. |
| Prioridade zero | **Decidido:** gestão de dados do relacionamento, pós-reunião, acompanhamento e WhatsApp. |
| Modelo de entrega | **Decidido:** formação ao vivo, com fundamentos e instalação acompanhada. |
| Infraestrutura | **Decidido como requisito:** cada pessoa terá sua própria estrutura em sua infraestrutura; o isolamento precisa ser demonstrado. |
| SaaS central | **Fora da proposta atual:** não vender o segundo cérebro como serviço hospedado e mantido centralmente para todos. |
| Cloudflare | **Direção preferida:** implantação na conta do próprio aluno, buscando uso normal dentro do gratuito. Limites precisam ser verificados. |
| Banco e memória | **Direção preferida:** armazenamento simples, com consultas e atualizações por MCP; vetorização somente onde agregar valor. |
| IA que executa o trabalho | **Direção preferida:** Claude ou ChatGPT do usuário, acessando o MCP e os conectores que já possui. Compatibilidade deve ser comprovada. |
| WhatsApp | **Direção preferida:** Z-API, com armazenamento próprio do histórico recebido e ferramentas MCP. |
| Uso pessoal | **Decidido neste pedido:** Robson também pretende usar o MCP de WhatsApp para si. |
| Ações externas | **Decidido:** mensagens e materiais devem passar pela aprovação do usuário no fluxo proposto. |
| Salesforce | **Decidido:** não contar com sua integração para o produto funcionar. |
| Agenda | **Direção preferida:** aproveitar conexões existentes da IA; não construir outro sistema de agenda. |
| E-mail | **Em avaliação:** mapear leitura e uso de e-mails pertinentes à rotina, por conexões já autorizadas. |
| Áudio | **Condicional:** usar transcrição oferecida pelo provedor se existir; serviço próprio de transcrição não é compromisso do núcleo. |
| Suporte | **Decidido:** somente em grupo. Quantidade, prazo e condições gerais ainda precisam ser fechados. |
| Bônus | **Decidido:** produção de conteúdo assistida e prospecção assistida por IA. |
| Instagram Direct | **Em aberto:** envio direto precisa ser validado; não está prometido como funcionalidade pronta. |
| Disparos | **Fora do escopo:** envio em massa e prospecção indiscriminada. |
| Preço da formação | **Consolidado na proposta:** R$ 997 para fundadores; R$ 1.997 como preço futuro pretendido. |

## 4. Problemas que justificam o produto

### 4.1 Histórico existe, mas exige reconstruir o contexto

Os consultores têm anotações, transcrições, CRM e conversas. O trabalho reaparece quando precisam descobrir o que foi combinado, qual assunto retomar e quando procurar cada pessoa.

O ganho desejado é abrir a IA e encontrar o contexto necessário para agir, sem reler anos de anotações nem repetir manualmente todas as informações em cada chat.

### 4.2 Relacionamento e captação disputam tempo com tarefas operacionais

A oportunidade comercial está em preservar a atenção à carteira e abrir espaço para reuniões, relacionamento e captação. Economia de tempo deve estar ligada a essas atividades, com qualidade de atendimento preservada.

Envio de ordens aparece como uma dor importante nas entrevistas, mas permanece fora do produto. Não usar o tempo total gasto no operacional como se todo ele pudesse ser recuperado pelo Elo.

### 4.3 Assinar IA não resolve a organização da rotina

Há entrevistados que já usam bem Claude, ChatGPT e transcrições. O produto precisa oferecer uma forma organizada e reutilizável de trabalhar: memória consistente, processos, preparação de ações e instalação acessível.

### 4.4 A consulta precisa funcionar quando o profissional está longe do computador

Acesso pelo celular foi pedido explicitamente por participante S04. Não basta provar a solução no ambiente de desenvolvimento: os fluxos principais precisam ser testados na experiência real escolhida para o usuário.

## 5. Evidências das entrevistas

Os identificadores remetem a FONTES.md. Os resultados relatados pertencem aos entrevistados e não constituem métricas verificadas do futuro produto.

| Fonte | Evidência relevante | Consequência para o escopo |
|---|---|---|
| S01, participante S01, aproximadamente 4:00–9:10 | Descreve uso de IA como apoio à operação, Skills, transcrições e GPS. Relata que um GPS que podia levar mais de um dia passou a ser preparado em cerca de 10 minutos. | Existe um fluxo de trabalho a estudar e organizar. O relato não comprova ganho universal de 10x nem tempo garantido do Elo. |
| S01, aproximadamente 5:03–6:06 | Distingue contato mensal, reuniões e cadência conforme o cliente. Parte do agendamento das tarefas ainda é manual. | Cadência deve ser configurável, incluindo tipo de contato; não assumir uma frequência igual para toda a carteira. |
| S02, entrevista de 17 minutos | Usa transcrições e IA em briefing, GPS e materiais; relata limites institucionais para dados e alto custo de tempo com ordens. | Respeitar permissões de dados e manter ordens fora do produto. A identidade do participante precisa ser confirmada: título e rótulo de fala divergem. |
| S03, participante S03, aproximadamente 5:48–9:00 | Registra informações no Word e no CRM, faz kickoff e atualiza contexto ao longo do relacionamento. | O fluxo deve aceitar materiais existentes e registrar atualizações, sem pressupor que todos já usam o mesmo método. |
| S03, aproximadamente 17:01 e 27:19 | Valoriza contatos, agendamento, indicações e ajuda com marketing; considera complexa a automação de ordens. | Priorizar continuidade e contatos; manter voz/SDR e ordens fora do primeiro produto. |
| S04, participante S04, 1:59–4:25 | Acompanha 94 clientes; falta de manutenção do relacionamento pode contribuir para destrato; operacional reduz o espaço de captação. | Memória e próximos contatos precisam se conectar à retenção e ao crescimento, sem atribuir todo destrato a uma causa única. |
| S04, 9:16–10:24 | Tem tarefas no CRM, mas sente falta de uma visão organizada de frequência de contato, última interação e atividade da semana. | Preparar uma visão utilizável do acompanhamento; definir se ela será entregue no chat, em um relatório ou em outra interface mínima. |
| S04, 10:55–11:20 e 18:27–22:00 | Já paga Claude e ChatGPT; transfere informações filtradas ao Claude, mas ainda não organizou todos os clientes. | O diferencial é aplicação e organização, com migração inicial viável; não apresentar a entrevistada como iniciante em IA. |
| S04, 20:40–23:56 | Quer recuperar o foco da última conversa, combinados e assuntos a retomar meses depois. Considera muito útil receber o norte do contato já preparado. | Guardar pendências com data, motivo e origem; recuperar contexto antes de redigir o contato. |
| S04, aproximadamente 24:00–25:00 | Estima média de três horas diárias em tarefas operacionais, incluindo ordens. | Não anunciar três horas diárias de economia pelo Elo. Medir separadamente os fluxos incluídos no produto. |
| S04, 16:57–17:30 e 28:57–30:40 | Quer ajuda para produzir conteúdo e prioriza captação entre as frentes viáveis discutidas. | Sustenta os dois bônus, sem transformar prospecção automática em compromisso do núcleo. |
| S04, 31:08–32:20 | Pede acesso pelo celular e manifesta interesse em aprovar contatos preparados para envio. | Validar celular e a passagem de revisão para envio como jornadas completas. |

O Robson também mencionou necessidades de um consultor chamado Leonardo, especialmente em relação a e-mail e uso mais avançado de IA. A correspondência desse nome com os arquivos recebidos não foi confirmada; não atribuir falas desses arquivos a Leonardo sem conferir.

Respostas positivas a propostas apresentadas pelo entrevistador são sinais de interesse. Não equivalem, sozinhas, a compra, aceitação do preço ou validação técnica da solução.

## 6. Públicos e situações de uso

### Consultor que já usa IA

Já produz resumos ou documentos, mas perde contexto, repete instruções e mantém informações espalhadas. Precisa organizar a memória e transformar atividades isoladas em um fluxo de acompanhamento.

### Consultor com pouca experiência prática

Precisa aprender os fundamentos e usar uma estrutura guiada. A instalação deve acontecer depois dessa base, no workshop, com exemplos e materiais preparados.

### Robson usando o WhatsApp pessoalmente

Quer permitir que sua IA consulte conversas, encontre pendências e prepare ou envie mensagens aprovadas. O caso não deve depender de GPS, carteira de investimentos, formação ou de campos exclusivos de consultoria.

É necessário definir no grill como o componente de WhatsApp poderá ser usado separadamente e quais partes da memória serão opcionais. Isso não determina, por enquanto, quantidade de repositórios, serviços ou implantações.

## 7. Escopo por prioridade

### P0 — capacidades do núcleo a ordenar no grill

1. Instalação individual e conexão com uma IA compatível.
2. Cadastro e identificação inequívoca dos contatos/clientes.
3. Memória longitudinal com origem, datas, atualização e correção.
4. Entrada de transcrição autorizada e revisão dos fatos, combinados e próximos passos extraídos.
5. Briefing interno do cliente e preparação de documento GPS a partir das informações aprovadas.
6. Cadência, pendências, datas futuras e preparação do acompanhamento diário.
7. Recebimento e armazenamento do histórico de WhatsApp que o provedor disponibilizar no escopo autorizado.
8. Consulta desse histórico pelo MCP com busca, recorte e paginação adequados ao contexto do modelo.
9. Rascunho, revisão e aprovação de mensagem antes do envio.
10. Envio de texto e PDF; imagem também faz parte do envio desejado, com viabilidade do fluxo de arquivos a validar.
11. Registro de resultado do envio e tratamento de falha ou status desconhecido.
12. Uso pessoal do WhatsApp sem obrigação de adotar o domínio financeiro.
13. Experiência utilizável pelo celular para os fluxos principais.

O grill deverá ordenar a implementação interna desse núcleo e identificar o menor recorte que possa ser provado de ponta a ponta. Essa lista não é uma autorização para prometer todas as integrações como prontas.

P0 expressa a prioridade de negócio do sistema de relacionamento. Não significa que todas as capacidades tenham de ser construídas na primeira etapa técnica. O primeiro recorte de implementação ainda será escolhido no grill.

### P1 — extensões próximas e integrações a validar

- Briefing antes de uma reunião.
- Resumo semanal de atividade e pendências.
- Agenda por conectores existentes, incluindo proposta de horários e confirmação de reunião.
- Leitura de e-mails relevantes por conexão já autorizada.
- Apoio à negociação de horário após uma aprovação inicial, dentro de limites explícitos.
- Envio de relatório ao cliente, com aprovação do conteúdo e do destinatário.
- Transcrição de áudio recebida do provedor, se disponível e adequada.
- Importação de histórico anterior à ativação, se o provedor permitir.

### Bônus da formação

**Produção de conteúdo assistida:** pesquisa de referências, inclusive com Apify quando fizer sentido; temas, roteiros, materiais e edição assistida demonstrada; Skills reutilizáveis. Publicação automática depende de validação própria e não deve ser presumida.

**Prospecção assistida:** pesquisa de perfis e contexto profissional público, organização de oportunidades, sugestão de abordagem individual e acompanhamento. Não é um disparador em massa. Envio no Direct do Instagram permanece a validar e não é condição para o valor inicial do bônus.

Os dois bônus são entregas educacionais e Skills com critérios próprios. Não exigem integrar Apify, Instagram ou publicação de conteúdo à infraestrutura central do Elo.

### Fora do escopo atual

- Enviar ordens, alocar recursos, movimentar dinheiro ou executar operações financeiras.
- Produzir recomendações financeiras autônomas para os clientes.
- SDR de voz, ligações automáticas e operação comercial de call center.
- Depender de acesso ao Salesforce ou contornar restrições institucionais.
- Criar um CRM corporativo completo ou exigir substituição do CRM oficial.
- Construir um novo aplicativo de calendário, e-mail ou chat para reproduzir ferramentas existentes.
- SaaS com uma base central para todos os alunos.
- Prospecção em massa ou envio sem limites e sem autorização.
- Gestão de grupos de WhatsApp como requisito inicial; eventual leitura ou gestão de grupos precisa de decisão específica.
- Plataforma própria de transcrição como obrigação do núcleo.
- Suporte individual ou customização ilimitada para cada aluno.

## 8. Jornadas de uso

### J01 — instalar e começar a usar

1. Usuário entende quais contas, permissões e custos serão necessários.
2. Instala sua própria estrutura na infraestrutura escolhida.
3. Configura credenciais e conecta seu WhatsApp e sua IA.
4. Confere uma consulta de teste e um envio de teste para um destino controlado.
5. Verifica onde ficam seus dados e como desconectar, exportar ou recuperar a instalação.

**Aceitação:** uma pessoa do público consegue concluir o caminho guiado, sem depender de programação nem de uma sessão de suporte individual.

“Um clique” é a experiência desejada. Número real de etapas, requisitos de conta e manutenção ainda precisam ser demonstrados. Não esconder passos manuais obrigatórios atrás dessa expressão.

### J02 — transformar reunião em memória e material

1. Consultor escolhe o cliente correto e fornece uma transcrição cujo uso esteja autorizado.
2. A Skill prepara fatos, objetivos, mudanças, combinados, pendências e datas, indicando a origem.
3. O consultor revisa, corrige e aprova o que será registrado.
4. A memória é atualizada sem apagar silenciosamente informações contraditórias ou ainda não confirmadas.
5. A Skill prepara o briefing interno e o GPS, usando recomendações previamente definidas pelo consultor.
6. Próximo contato e tarefas são propostos segundo as regras configuradas e as datas da conversa.

**Aceitação:** existe rastreabilidade entre informação registrada e fonte; o sistema não inventa informação ausente nem transforma inferência em fato confirmado.

### J03 — receber o que precisa fazer hoje

1. A IA consulta tarefas, cadências e combinados vencidos ou próximos.
2. Entrega uma lista ordenada com pessoa, motivo, contexto da última interação, pendência e ação sugerida.
3. Prepara uma mensagem coerente com o histórico, quando isso fizer sentido.
4. O usuário pode abrir a fonte, ajustar a ação, adiar ou concluir.

**Aceitação:** o usuário entende por que cada contato apareceu. Uma simples notificação de calendário não substitui o contexto que ele precisa para agir.

O agendamento recorrente da IA com acesso ao MCP precisa ser provado em cada plataforma adotada. Não presumir que todo recurso de cron/tarefa agendada pode usar qualquer conector.

### J04 — revisar e enviar pelo WhatsApp

1. Usuário pede uma mensagem ou seleciona um rascunho do brief.
2. Confere a pessoa, a conversa, o texto e os arquivos.
3. Aprova uma ação específica.
4. O sistema envia e registra o resultado confirmado pelo provedor.
5. Em falha, timeout ou status incerto, informa o estado e evita reenvio cego.

**Aceitação:** alterar destinatário, texto ou arquivo invalida a aprovação anterior. Repetir um pedido ou receber um webhook duplicado não deve produzir envios duplicados.

Aprovação de vários contatos pode ser útil, desde que cada destinatário e conteúdo estejam visíveis e que o lote aprovado seja delimitado. Isso não autoriza disparo em massa.

### J05 — recuperar o contexto antes de falar com alguém

1. Usuário consulta uma pessoa ou reunião.
2. Recebe briefing com objetivos, contexto pertinente, último contato, combinados, pendências e mudanças recentes.
3. Pode pedir aprofundamento e conferir a origem da informação.

**Aceitação:** nomes iguais não se confundem, informação antiga é identificada e um assunto combinado para o futuro não aparece como vencido antes da data.

### J06 — apoiar agendamento de reunião

1. A IA usa a agenda já conectada, dentro das permissões concedidas.
2. Propõe horários e prepara o convite ou a mensagem.
3. O usuário aprova o início do contato e define os limites da negociação.
4. A IA continua apenas dentro desses limites e confirma o que efetivamente foi marcado.

**Em aberto:** quais etapas poderão ocorrer após a aprovação inicial, quando pedir nova aprovação e o que fazer com horário indisponível, fuso diferente ou ausência de resposta.

### J07 — usar somente o WhatsApp pessoal

1. Robson conecta o componente ao próprio número e à IA que utiliza.
2. Consulta conversas e pede a identificação de pendências ou informações pertinentes.
3. Redige e aprova mensagens e arquivos para contatos escolhidos.
4. Consulta o histórico e o estado das ações realizadas.

**Aceitação:** o fluxo não exige um GPS, uma carteira financeira ou um curso. Limites de leitura, retenção e exposição de dados precisam estar configurados para esse uso.

## 9. Requisitos de memória e relacionamento

| ID | Requisito |
|---|---|
| M01 | Identificar cada contato de forma estável e distinguir homônimos. |
| M02 | Consultar e atualizar uma ficha longitudinal, sem depender da memória nativa do chat. |
| M03 | Registrar origem, data do evento, data do registro e estado de confirmação das informações relevantes. |
| M04 | Distinguir informação fornecida, inferência, sugestão e decisão aprovada. |
| M05 | Extrair de reunião objetivos, combinados, pendências, datas futuras e mudanças de contexto. |
| M06 | Permitir revisão e correção antes da consolidação de informação sensível ou de consequência externa. |
| M07 | Definir cadências por usuário e por cliente, com tipo de contato e possibilidade de exceção. |
| M08 | Recuperar o motivo de um retorno, inclusive quando ele tiver sido combinado meses antes. |
| M09 | Distinguir último encontro, última mensagem recebida, última mensagem enviada e último contato relevante. A definição de contato relevante está em aberto. |
| M10 | Não considerar rascunho, tentativa de envio ou envio falho como relacionamento efetivamente realizado. |
| M11 | Preparar brief diário e, se incluído, visão semanal com pendências e atividade. |
| M12 | Gerar briefing antes de reunião e documento GPS a partir de informações e recomendações aprovadas. |
| M13 | Buscar com recorte e referências; não despejar toda a base no contexto do modelo. |
| M14 | Permitir corrigir, exportar e excluir informações segundo uma política definida. |
| M15 | Evitar duplicação ao receber novamente a mesma reunião, mensagem ou documento. |
| M16 | Identificar conflitos e informações desatualizadas, sem substituir automaticamente um dado confirmado por uma extração incerta. |

Nomes de ativos por cliente foram sugeridos pelo Robson como possível informação de consulta. Necessidade, sensibilidade e utilidade ainda precisam ser avaliadas. Não foram aprovados acompanhamento de posições, quantidades, saldos, cotações ou recomendação automática de carteira.

## 10. Requisitos do MCP de WhatsApp

| ID | Requisito ou condição |
|---|---|
| W01 | Receber eventos do número autorizado e manter histórico próprio no escopo definido. |
| W02 | Permitir consulta por conversa, contato, período e termos pertinentes. |
| W03 | Oferecer leitura paginada e contexto suficiente para interpretar uma conversa. |
| W04 | Distinguir recebido, enviado pelo sistema, enviado pelo próprio usuário e respectivos estados, conforme dados disponíveis no provedor. |
| W05 | Enviar texto após aprovação. |
| W06 | Enviar PDF após aprovação; validar o caminho completo de criação, disponibilização e entrega do arquivo. |
| W07 | Enviar imagem após aprovação; validar o mesmo caminho de arquivos. |
| W08 | Manter telefones, segredos e identificadores reais que não precisam chegar ao modelo no lado restrito da integração. |
| W09 | Resolver o destinatário a partir de um identificador estável e impedir troca ou ambiguidade de pessoa. |
| W10 | Ligar a aprovação ao destinatário, conteúdo e anexos exatos; definir validade e uso único. |
| W11 | Registrar resultado real do envio, com estado incerto quando não houver confirmação. |
| W12 | Tratar webhook duplicado, fora de ordem, atrasado ou inválido sem corromper histórico nem repetir ações. |
| W13 | Prever desconexão da instância, indisponibilidade do provedor e recuperação do vínculo. |
| W14 | Definir a política de retenção de mensagens, arquivos e dados de contato. |
| W15 | Permitir interromper ações pendentes e desconectar a integração. |
| W16 | Não transformar texto recebido em autorização para enviar, alterar permissões ou expor dados. |
| W17 | Funcionar em um uso pessoal sem campos obrigatórios da consultoria. |
| W18 | Tornar claros o início da captura e eventuais lacunas do histórico. Importação de mensagens antigas depende de capacidade verificada. |

O desejo de “receber todas as mensagens” precisa ser delimitado no grill: conversas individuais, grupos, mensagens próprias, tipos de mídia e exclusões. A documentação deve provar o que cada evento realmente entrega.

Distinguir o evento que chega à integração, o conteúdo que é armazenado e o conteúdo que é liberado ao modelo. Recebimento pelo webhook não equivale a autorização de leitura irrestrita pela IA. Definir recortes e exclusões, inclusive para grupos, mídia e mensagens efêmeras, sem depender apenas de instruções no prompt.

Áudio: primeiro verificar se a Z-API oferece o texto transcrito necessário. Receber um arquivo ou uma URL de áudio não significa receber uma transcrição. Se não houver transcrição adequada, decidir separadamente se a funcionalidade fica de fora ou ganha uma implementação opcional com custo e limites próprios.

## 11. Skills e resultados esperados

| Skill ou procedimento | Entrada | Resultado esperado |
|---|---|---|
| Pós-reunião | Cliente identificado e transcrição autorizada | Proposta de atualização da memória, combinados, pendências e próximos contatos, com revisão. |
| GPS | Informações confirmadas, metodologia e recomendações do consultor | Documento personalizado, revisável e coerente com o modelo de entrega. |
| Briefing pré-reunião | Cliente ou reunião | Contexto relevante, mudanças, objetivos e pautas a retomar, com origem. |
| Planejamento diário | Cadências, tarefas, eventos e histórico | Quem precisa de atenção, motivo, contexto, ação e rascunhos sugeridos. |
| Contato pelo WhatsApp | Destinatário, objetivo, histórico e material pertinente | Rascunho, revisão, autorização delimitada e envio registrado. |
| Simplifique meu processo | Relato de uma rotina atual | Resultado necessário, gargalos, etapas dispensáveis, alternativa simples e forma de testar. |
| Conteúdo assistido | Público, posicionamento, referências e regras | Pesquisa, pauta, roteiro e materiais revisáveis. Bônus. |
| Prospecção assistida | Perfil desejado e contexto profissional público | Oportunidades organizadas, abordagem individual sugerida e acompanhamento. Bônus. |

Os nomes são descritivos. Não são nomes finais de ferramentas MCP nem garantia de que todas as plataformas executam o mesmo formato de Skill.

## 12. O que o GPS precisa representar

O material fornecido e a entrevista de participante S01 descrevem uma metodologia com pilares de construção, otimização, estruturação e perpetuação. O documento reúne diagnóstico, objetivos, situação do cliente, pontos de atenção, recomendações e acompanhamento.

Para o Elo, o requisito é organizar informações da reunião e recomendações definidas pelo consultor em um documento utilizável. Não é decidir automaticamente investimentos, tributação, seguros ou sucessão.

Itens a avaliar para o modelo de documento:

- Contexto, objetivos e horizontes de tempo.
- Situação atual e pontos de atenção registrados.
- Renda, despesas, aportes e patrimônio somente quando autorizados e necessários.
- Recomendações e prioridades já definidas pelo profissional.
- Plano de acompanhamento, próximos marcos e cadência.
- Fontes e lacunas que precisam ser confirmadas.

Formato final, profundidade, possibilidade de edição e uso de template devem ser definidos. Também é necessário esclarecer o uso autorizado dos materiais da Portfel e a adaptação para consultores de outras estruturas.

## 13. Dados a discutir na modelagem

Este é um inventário conceitual. Não determina tabelas, banco, grafo ou armazenamento final.

| Informação | Conteúdo necessário ou candidato | Decisão pendente |
|---|---|---|
| Proprietário e preferências | Dono da instalação, fuso, idioma, regras de acompanhamento e limites de ação | Configuração inicial e possibilidade de mais de um número. |
| Contato | ID estável, alias, contexto profissional e vínculo com canal de contato | O que pode ser exibido ao modelo em cada perfil de uso. |
| Identificação restrita | Correspondência com telefone e identificadores reais necessários à integração | Proteção, acesso e relação com a ficha consultável. |
| Relacionamento | Estado do vínculo, objetivos, contexto e preferências pertinentes | Mínimo comum entre uso pessoal e consultoria. |
| Reunião e fonte | Data, tipo, origem, versão e referência ao conteúdo permitido | Guardar transcrição integral ou somente extratos aprovados. |
| Fato de memória | Conteúdo, origem, data, confiança/confirmado e correções | Como resolver conflitos e informações que expiram. |
| Combinado ou pendência | Assunto, responsável, motivo, data de retorno e estado | Diferença entre lembrete, tarefa e assunto futuro. |
| Cadência | Frequência, tipo de contato, exceções e próxima data | Quando um contato redefine a cadência. |
| Conversa e mensagem | IDs do provedor, direção, datas, tipo e conteúdo permitido | Retenção, escopo de ingestão e histórico anterior. |
| Documento ou mídia | Tipo, versão, origem e referência ao arquivo | Onde fica, por quanto tempo e quem pode acessá-lo. |
| Rascunho e aprovação | Ação proposta, destinatário, conteúdo, anexos, validade e autorizador | Como o usuário aprova e como evitar reuso indevido. |
| Execução | Pedido, resultado, estado confirmado/incerto, datas e falha | Reconciliação e prevenção de duplicidade. |
| Ativos por cliente | Nomes, se trouxerem valor real à consulta | Inclusão, finalidade e limites; ainda não aprovado. |

Datas como aniversário e contexto familiar foram citados como possíveis ganchos de relacionamento. Não devem ser coletados sem necessidade ou incorporados como obrigatórios. Definir a finalidade e os dados mínimos adequados ao uso autorizado.

## 14. Memória e busca

Robson quer uma modelagem simples e considera vetorização mínima nos pontos em que fizer sentido. O repositório `orobsonn/segundo-cerebro` é uma base de avaliação, não uma escolha pronta de implementação.

Investigar quais consultas precisam apenas de filtros, datas e estados, e quais precisam de recuperação por significado. Lembretes com prazo exato não devem depender apenas de similaridade semântica.

O grill deve comparar reaproveitamento com simplificação: o grafo de conhecimento genérico do repositório pode ter partes úteis, mas a rotina do consultor precisa de fatos temporais, cadências, mensagens, documentos e ações aprovadas. Não importar abstrações que não ajudem essas jornadas.

## 15. Capacidades do MCP a especificar

O conjunto final deve ser pequeno e orientado às jornadas. Candidatos para discussão:

- Encontrar contato e consultar sua ficha.
- Consultar histórico, fatos, pendências e próximos contatos.
- Propor e confirmar atualização de memória.
- Preparar brief e dados para um documento.
- Pesquisar mensagens e ler um trecho de conversa.
- Preparar uma ação de envio.
- Apresentar ou verificar uma aprovação delimitada.
- Executar o envio autorizado e consultar seu estado.
- Configurar preferências e consultar o estado da integração, com acesso adequado.

É necessário definir permissões de leitura e alteração, limites de retorno, paginação, tipos de erro, tratamento de mídia e o que cada cliente MCP consegue transportar. Expor um CRUD não significa oferecer SQL arbitrário ou acesso irrestrito a toda a instalação.

Não congelar nomes, schemas ou quantidade de ferramentas antes de validar jornadas, tamanho de contexto e compatibilidade com os clientes escolhidos.

## 16. Privacidade, autorização e segurança

### Dados restritos e conteúdo que chega ao modelo

O Robson propôs que telefone e outros identificadores reais fiquem no backend, enquanto a IA trabalha com referências sem esses dados. Essa intenção deve ser preservada e avaliada.

Substituir nome ou telefone por um ID é pseudonimização/minimização; a conversa, um PDF, o contexto familiar ou o conteúdo financeiro ainda podem identificar alguém. Não prometer anonimização completa por causa da troca de identificador.

A política também precisa considerar informações recebidas por agenda, e-mail e documentos. Não adianta esconder o telefone em uma ferramenta e entregá-lo em outra resposta ou anexo.

### Permissões institucionais

As entrevistas relatam restrições para dados de clientes e preferência por ferramentas autorizadas. Instalar na própria conta Cloudflare ou omitir um sobrenome não concede autorização para exportar dados do CRM ou enviá-los a uma IA externa.

O sistema deve permitir operar apenas com os materiais e campos autorizados. Não depender de acesso institucional que o aluno não tenha nem oferecer uma forma de contornar essas regras.

### Aprovação e conteúdo não confiável

Mensagens, transcrições, e-mails e documentos podem conter instruções maliciosas ou pedidos de ação. Devem ser tratados como conteúdo, não como autorização do dono.

Aprovação precisa ser verificável no fluxo de execução, e não apenas uma frase no prompt da Skill. A forma concreta dessa verificação ainda será definida e revisada tecnicamente.

O mecanismo deve distinguir a autorização autenticada do dono de texto produzido pelo modelo ou recebido de terceiros. O modelo pode propor uma ação; uma chamada feita pelo próprio modelo não comprova que o usuário a aprovou. Definir autoria, escopo, validade, uso único e cancelamento da autorização, sem congelar agora a interface ou o mecanismo técnico.

### Uso pessoal e profissional

O interesse do Robson no WhatsApp pessoal não determina que suas conversas compartilhem a mesma base dos fluxos de consultoria. Se ambos os usos forem permitidos na mesma instalação, definir os limites de leitura, retenção e ação e provar que uma consulta profissional não recupera conteúdo pessoal indevido. O grill deve avaliar se essa combinação faz sentido; não criar desde já múltiplos modos, serviços ou bases sem necessidade.

### Ciclo de vida dos dados

Excluir ou exportar no Elo não implica excluir ou exportar em todos os provedores. Mapear separadamente armazenamento local da instalação, Z-API, plataforma de IA, histórico do chat, conectores, mídia, logs e backups. Documentar o que cada dependência permite e os limites de retenção e exclusão, sem prometer apagamento total fora do controle da solução.

### Pontos que a equipe técnica deve provar

- Autenticação e autorização do MCP e das rotas administrativas.
- Verificação dos eventos recebidos e proteção contra chamadas indevidas e repetidas.
- Isolamento efetivo entre instalações e ausência de credenciais compartilhadas entre alunos.
- Ausência de acessos administrativos ou componentes compartilhados que anulem esse isolamento; qualquer dependência comum deve ficar explícita.
- Segredos fora do contexto do modelo, dos documentos, dos logs e do material de aula.
- Registro de ações suficiente para entender um envio, sem replicar dados pessoais desnecessários.
- Proteção de arquivos e links de mídia, inclusive expiração e acesso.
- Exportação, exclusão e recuperação dos dados segundo uma política definida.

Robson observou que a Z-API usa segredos de conta/instância. Isso é um insumo para verificar a integração, não uma avaliação completa de segurança de credenciais, webhooks e MCP.

## 17. Integrações e dependências

| Dependência | Direção | Validação necessária |
|---|---|---|
| Cloudflare | Infraestrutura própria de cada usuário | Produtos realmente necessários, limites, quotas, cobrança, configuração e recuperação. |
| Z-API | Provedor preferido para WhatsApp | Eventos disponíveis, autenticação, tipos de envio, mensagens próprias, estados, mídia, histórico e restrições de operação. |
| MCP nativo da Z-API | Avaliar reutilização | Não presumir que cobre leitura de histórico, PDF, identidade restrita ou aprovação. Comparar com as necessidades reais. |
| Claude | Um dos clientes desejados | Conexão ao MCP, permissões, arquivos, celular, Skills e execução recorrente no plano e ambiente adotados. |
| ChatGPT | Outro cliente desejado | Mesmas verificações; não assumir paridade com Claude. |
| Agenda e e-mail | Conectores existentes | Operações autorizadas e possibilidade de participação nos fluxos, inclusive em tarefas agendadas. |
| Apify | Ferramenta possível dos bônus | Actors atuais, custos, limites, termos e distinção entre coleta, preparação e envio. |
| Repositório Segundo Cérebro | Base possível | Ler código e estado atual; avaliar aproveitamento, autenticação, dados e diferenças do domínio. |

A pesquisa anterior apontou diferenças entre a API REST, webhooks e o MCP nativo da Z-API. Essa diferença deve ser revalidada na documentação durante o grill; capacidade presente em uma dessas superfícies não está automaticamente disponível nas outras.

A opção discutida pelo Robson foi uma API não oficial de WhatsApp. Antes de fechar a integração, verificar condições de uso, restrições do provedor e possíveis interrupções ou bloqueios do número. Não apresentar a conexão como API oficial ou como operação garantida pela Meta.

Verificar também o tratamento dos dados pelo fornecedor, a portabilidade e o procedimento de desligamento. O uso do número pessoal principal deve ser precedido por um teste controlado de conexão, queda, reconexão e recuperação.

## 18. Custos e manutenção

A intenção do Robson é que o uso comum caiba no gratuito da Cloudflare e que o principal custo adicional seja a API de WhatsApp, discutida na ordem de R$ 100 por mês por instância. O valor exato e as condições precisam ser conferidos antes de virar informação comercial definitiva.

Também é necessário considerar o plano da IA compatível com os recursos adotados, eventuais custos de transcrição, mídia e uso opcional de Apify. Não afirmar que existe um único custo obrigatório antes dessa verificação.

Definir um perfil de uso de referência: quantidade de contatos, mensagens por dia, retenção, mídias, consultas, eventos e recorrências. “Uso normal” precisa virar uma hipótese mensurável para avaliar o plano gratuito.

Manutenção deve incluir atualização da solução, mudanças de API, reconexão do número, falhas de credencial e recuperação de dados. A proposta de escopo pequeno não elimina essas tarefas.

Uma parceria com a Z-API foi levantada como possibilidade comercial. Não existe parceria confirmada nem condição negociada registrada neste briefing.

## 19. Instalação e operação individual

O workshop deve conduzir a turma a instalar a solução em sua própria conta. O produto precisa explicar os requisitos antes da aula e permitir validar a instalação com dados fictícios e um envio controlado.

Questões obrigatórias para a instalação:

- Quais contas e planos o aluno precisa ter previamente?
- O que é automático e o que exige ação na interface de cada provedor?
- Como guardar e trocar credenciais sem expô-las ao modelo ou à turma?
- Como confirmar que a instalação pertence à pessoa correta?
- Como fazer atualização sem perder dados ou configurações?
- Como recuperar uma instalação com falha e como encerrar o uso?
- O que o instrutor consegue diagnosticar em grupo sem acessar a base privada do aluno?

O formato de pacote, CLI, botão de deploy ou assistente de instalação ainda está em aberto. A viabilidade de “um clique” é uma questão de produto e engenharia a demonstrar, não uma descrição de algo já construído.

Provar a instalação com pessoas representativas do público: registrar tempo, conclusão sem ajuda individual, intervenções necessárias, atualização e recuperação. Prever identificação de versão e diagnóstico sem dados privados para tornar o suporte em grupo viável.

## 20. Formação e oferta relacionadas ao Elo

### Estrutura de ensino mantida

| Módulo | Ganho e forma de aplicação |
|---|---|
| M0 — Fundamentos da IA generativa | Entender modelo, aplicativo, contexto, histórico, memória e conferência. Revisão guiada por perguntas no bloco de dúvidas, com alternativas, respostas no chat e explicação. |
| M1 — Recursos das plataformas | Conhecer recursos de Claude e ChatGPT por função: organizar contexto, trabalhar fontes, produzir e editar entregas, conectar aplicativos e conhecer formas de delegar continuidade. Prática conclui o conteúdo ensinado. |
| M2 — Processos e Skills | Definir a entrega, simplificar etapas, separar procedimento de dados, criar/adaptar Skills e testar variações. Inclui Simplifique meu processo. |
| M3 — Implementação acompanhada | Desenho consolidado: um workshop de instalação da estrutura e dois encontros em grupo para aplicação, ajustes e dificuldades de adoção. |

Os encontros ao vivo devem ser pensados em miniaulas encadeadas, com demonstração, aplicação e dúvidas. A edição posterior pode separar as gravações nesses cortes. Quantidade total, duração, calendário, prazo de acesso e suporte geral ainda precisam ser definidos.

A antiga proposta de votar três processos para os workshops foi substituída pela prioridade de instalar e adotar a estrutura. A antiga classificação do segundo cérebro como bônus opcional também foi superada: a solução aplicável é parte central do valor da oferta atual.

### Condições comerciais registradas

- Formação Consultor 10x focada em consultores.
- Turma de fundadores proposta por R$ 997.
- R$ 1.997 como preço futuro pretendido; não descrever como preço anterior já praticado.
- Dois bônus: conteúdo e prospecção assistidos por IA.
- Sem suporte individual; suporte em grupo com limites a fechar.
- Instalação e uso acompanhados após os fundamentos, e não entrega imediata de uma infraestrutura já pronta no momento da compra.
- Não há garantia, parcelamento, número de vagas ou prazo de acesso fechado neste contexto. Não inventar essas condições.

“10x” é a big idea e o nome adotado. O relato de participante S01 inspirou essa narrativa, mas não há medição controlada que sustente prometer o mesmo ganho a todo aluno.

## 21. Aula de convite e página de apresentação

A aula foi planejada para **20 de outubro de 2026, às 20h, horário de Brasília**, online e ao vivo. O horário foi adotado provisoriamente por orientação do Robson. A gratuidade não foi confirmada explicitamente.

O agente é o principal atrativo. A aula apresenta a proposta e o fluxo; a instalação pertence à formação. Não anunciar que o agente completo será entregue gratuitamente na aula de convite.

Texto aprovado para a primeira dobra:

> **Atenda mais clientes com seu próprio agente de IA trabalhando para você.**
>
> Na aula Consultor 10x, descubra como ter um agente que organiza o histórico dos seus clientes, prepara o GPS e ajuda nos próximos contatos pelo WhatsApp — liberando tempo para reuniões, relacionamento e novas oportunidades.
>
> **Quero conhecer meu agente de IA**

A página publicada é uma apresentação para avaliação. O formulário é demonstrativo, não cria inscrição, e o agente exibido é uma simulação com dados fictícios. A existência dessa página não prova que a solução está implementada.

Na oferta final, informar o estado real de desenvolvimento e o momento previsto para instalação. A turma de fundadores pode receber a solução durante a formação, conforme a direção do Robson; isso não deve ser apresentado como acesso imediato a uma integração já validada.

Robson pediu linguagem direta, sem frases artificiais como “A reunião termina. O acompanhamento continua.”. A identidade visual foi aproximada da TopInvest com roxo escuro, magenta e branco. Os nomes das empresas atendidas pelo Robson foram removidos de sua bio por pedido posterior.

## 22. O que já existe e pode ser reaproveitado

- Repositório público indicado por Robson: https://github.com/orobsonn/segundo-cerebro.
- Conteúdo e estrutura anterior da formação, com quatro módulos e a Skill Simplifique meu processo.
- Materiais GPS e apresentações de referência da oferta.
- Pesquisa anterior sobre Z-API e webhooks, a conferir antes de desenhar o contrato final.
- Landing page de apresentação e logo do Consultor 10x, em projeto separado.

Não foi desenvolvido código do Elo nesta pasta. Nenhum pacote, conta, banco ou integração é considerado pronto só por existir como referência em outro projeto.

## 23. Questões de produto para o grill com Robson

Priorizar as primeiras perguntas e evitar uma lista longa em uma única interação.

1. **Primeiro resultado obrigatório:** qual jornada precisa funcionar integralmente para que a solução já tenha valor: pós-reunião, brief diário ou WhatsApp pessoal? Como ordenar a prova inicial sem perder o núcleo comercial?
2. **Uso independente do WhatsApp:** Robson quer instalar apenas esse componente? Quais tarefas pessoais serão usadas como piloto?
3. **Plataformas do primeiro lançamento:** precisa suportar Claude e ChatGPT desde o primeiro dia ou uma experiência comprovada pode inaugurar o produto?
4. **Instalação e quantidade de contas:** qual esforço inicial é aceitável para o aluno? Um número por instalação atende o primeiro uso?
5. **Informações permitidas:** quais materiais e campos os primeiros consultores realmente podem utilizar fora dos sistemas institucionais?
6. **Contato relevante e cadência:** o que conta como relacionamento realizado? Uma resposta curta no WhatsApp redefine o próximo contato?
7. **Memória inicial:** o usuário vai começar com clientes novos, importar registros existentes ou os dois? Quanto trabalho inicial é aceitável?
8. **Histórico de WhatsApp:** captura a partir da ativação atende o primeiro uso se não houver importação anterior confiável?
9. **Aprovações:** quais ações exigem confirmação individual e quais podem estar em um conjunto delimitado? Até onde pode ir a negociação de horário?
10. **Documentos:** que formato de GPS e briefing o consultor precisa editar e entregar? O que é específico da Portfel e o que deve ser genérico?
11. **Escopo de leitura pessoal:** quais conversas o MCP do Robson poderá acessar? Existem contatos, grupos ou assuntos a excluir?
    Se houver uso pessoal e profissional simultâneo, precisam ficar separados? Há necessidade real de compartilhar algum contexto entre eles?
12. **Suporte e prazo:** o que a formação assume como acompanhamento em grupo, manutenção e evolução após os encontros?
13. **Bônus:** qual resultado mínimo de conteúdo e prospecção será prometido independentemente do envio por Direct?
14. **Lançamento:** quais provas devem existir antes de uma promessa pública de instalação fácil e de determinada integração?

## 24. Verificações técnicas que não devem ser delegadas ao julgamento do Robson

- Confirmar API e MCP da Z-API, eventos, transcrição, histórico, mídia e estados de entrega.
- Verificar o mecanismo adequado para autenticar webhooks e MCP, incluindo repetição e abuso.
- Provar o fluxo de aprovação no servidor e o vínculo com a ação exata.
- Validar transporte de PDF e imagem a partir das plataformas de IA escolhidas.
- Provar agendamento recorrente com acesso efetivo ao MCP e ao contexto necessário.
- Testar a experiência no celular.
- Comparar o modelo simples necessário com o código do Segundo Cérebro e decidir reaproveitamento com evidência.
- Dimensionar armazenamento, retenção, busca, limites de contexto e custos para um perfil de uso realista.
- Definir forma de implantação, atualização, backup, recuperação e desinstalação.
- Testar proteção contra instruções em mensagens, transcrições e documentos.
- Testar chamadas simultâneas, consumo único da aprovação, eventos tardios e mudança do conteúdo de um anexo após sua aprovação. Não aceitar duplicação ou alteração indevida por causa da ordem dos eventos.
- Antes de um piloto com dados reais, registrar origem, finalidade, permissão de uso, campos, destinos e retenção. Sem permissão esclarecida, usar dados fictícios no teste.
- Submeter a proposta técnica a revisão adversarial antes de congelar arquitetura e plano.

## 25. Cenários de aceitação para a primeira solução

| Caso | Resultado que precisa ser demonstrado |
|---|---|
| Instalação individual | Uma instalação não consulta nem altera a base de outra pessoa. |
| WhatsApp pessoal | Robson lê uma conversa e envia uma mensagem aprovada sem cadastrar um GPS. |
| Homônimos | O sistema pede esclarecimento ou usa ID inequívoco; não escolhe um destinatário por nome parecido. |
| Reunião repetida | Reimportar a mesma fonte não duplica fatos e tarefas indiscriminadamente. |
| Informação ausente | Campo desconhecido fica ausente ou pendente; não é inventado. |
| Correção e conflito | O usuário consegue corrigir o dado e entender de onde veio a versão anterior. |
| Compromisso futuro | Assunto combinado para um mês futuro aparece na data correta, considerando o fuso e a data da reunião. |
| Contato falho | Tentativa sem confirmação não é tratada como relacionamento concluído. |
| Brief diário | Cada item mostra por que apareceu, a origem e uma próxima ação compreensível. |
| GPS | Documento usa informações e recomendações aprovadas; não cria uma orientação financeira autônoma. |
| Texto no WhatsApp | Usuário confere e aprova destinatário e mensagem; o resultado do envio é consultável. |
| PDF e imagem | Arquivo correto chega ao destinatário aprovado, sem um link público desnecessário. |
| Mudança após aprovação | Editar texto, destinatário ou anexo exige renovar a autorização. |
| Repetição | Clique repetido, retry ou evento duplicado não gera uma segunda ação indevida. |
| Concorrência | Duas execuções simultâneas não consomem a mesma aprovação nem produzem duas ações; evento tardio não apaga estado mais recente válido. |
| Anexo aprovado | Trocar o arquivo disponível no mesmo endereço não permite enviar conteúdo diferente do que foi aprovado. |
| Timeout | Estado incerto é mostrado; não há reenvio cego nem afirmação falsa de sucesso. |
| Mensagem maliciosa | Conteúdo recebido não consegue autorizar envio, mudar regras ou revelar segredos. |
| Identificação restrita | Ferramentas não devolvem telefone ou segredo sem necessidade; o restante do conteúdo também é avaliado quanto à identificação. |
| Limite de leitura | A IA não consulta conversa, perfil ou conteúdo fora do escopo autorizado, inclusive quando uma mensagem pede essa ampliação. |
| Histórico incompleto | A IA sabe que existe uma lacuna e não afirma ter lido mensagens que nunca foram capturadas. |
| Celular | As jornadas escolhidas são concluídas em uma experiência móvel real. |
| Queda e reconexão | Usuário entende o problema e consegue recuperar a integração sem misturar identidades. |
| Saída e recuperação | Exportar, excluir, atualizar e recuperar têm um procedimento testado. |
| Custo | O perfil de uso de referência possui uma estimativa e um teste de limites, sem promessa genérica de gratuidade ilimitada. |

Esses cenários são a base para desenhar testes após o grill. Não são resultados já obtidos.

## 26. Como medir valor sem inventar resultados

Medir antes e depois nas mesmas tarefas e com qualidade comparável:

- Tempo para preparar um briefing antes de reunião.
- Tempo entre receber a transcrição e ter memória/documento revisado.
- Tempo para preparar a lista de próximos contatos.
- Quantidade de combinados recuperados corretamente e pendências esquecidas.
- Precisão das informações e necessidade de correção pelo consultor.
- Qualidade e adequação das mensagens preparadas.
- Esforço para instalar e retomar o uso sem ajuda individual.
- Falhas, duplicidades e ações incorretas.
- Custo da instalação para o perfil de uso definido.

Uma demonstração impressionante ajuda a vender a aula; a adoção exige que o usuário consiga repetir o resultado com seus dados permitidos. Não extrapolar um caso de sucesso para multiplicação garantida de faturamento ou produtividade.

## 27. O que precisa sair do grill antes de implementar

1. Escopo funcional do primeiro produto e fronteira dos bônus.
2. Jornadas, entradas, saídas, permissões e tratamento de exceções.
3. Política de dados, identidade, aprovação, retenção e exclusão.
4. Arquitetura escolhida com documentação, provas de capacidade e revisão adversarial.
5. Contrato do MCP, formato dos documentos e compatibilidade por plataforma.
6. Instalação, atualização, recuperação, custos e suporte viáveis para a turma.
7. Plano de implementação por etapas e critérios de verificação.
8. Linguagem comercial alinhada ao que for efetivamente provado.

A implementação do produto será conduzida nesta pasta após esse processo. Este briefing não substitui o grill nem autoriza construir todas as possibilidades levantadas.
