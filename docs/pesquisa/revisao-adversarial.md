# Elo — revisão adversarial da proposta

**Data:** 16/10/2026. **Papel:** advogado do diabo, com foco em decisões de alta alavancagem. Avaliação do PRD v0.1 e dos relatórios [referências](referencias.md), [instalação](instalacao-cloudflare.md) e [WhatsApp/clientes](whatsapp-clientes.md), com consulta ao [BRIEF](../../BRIEF.md). Somente análise documental; nenhuma integração, concorrência, instalação ou recuperação foi testada. Este parecer não autoriza implementação nem escolhe prioridades comerciais por Robson.

## Veredito

**Workers + D1 individual é o menor candidato defendível. A proposta ainda não está pronta para congelar o contrato de envio nem para um piloto com dados reais.** O risco principal não é faltar Vectorize, Code Mode ou uma plataforma mais sofisticada: é confundir aprovação com token, identidade com alias, instalação com deploy e captura com histórico completo.

Manter um Worker por instalação, um D1 canônico, ferramentas tipadas e autenticação do proprietário. Arquivos privados entram quando a jornada de anexos for provada. Não há evidência que justifique microserviços, dois bancos apenas para separar telefone, isolamento multi-tenant, SQL arbitrário ao modelo ou execução de código gerado pela IA. Um único serviço pode ter rotas com permissões distintas; isso não dispensa autorização em cada rota.

A instalação individual reduz a consequência de vazamento de uma credencial por aluno. Não protege contra erro comum no código, atualização comprometida, template com segredo compartilhado ou suporte com acesso administrativo à turma. Essas dependências comuns precisam continuar visíveis.

## Furos que exigem correção

| Achado | Ataque ou falha concreta | Mudança necessária | Quando bloqueia |
|---|---|---|---|
| **Aprovação não tem canal comprovado** | Modelo recebe token no preview e chama envio sozinho; permissão “sempre permitir” no cliente deixa de representar revisão daquele texto. | Sessão autenticada do dono confirma a ação exata fora do poder de autorização do modelo, ou o cliente demonstra garantia equivalente verificável pelo servidor. Tool pode preparar/consultar; não pode fabricar o gesto de aprovação. | Contrato de envio antes de codar; prova antes de enviar no piloto. |
| **ID interno estável pode apontar para outra pessoa** | Dono aprova `ct_7K2`; alguém corrige sua associação para outro LID/telefone; executor resolve o endereço novo e envia sem mudar o ID aprovado. | Aprovação inclui versão da associação do destinatário e da instância remetente. Mudança, fusão, reconexão com outro número ou correção relevante invalida pendências. | Contrato de identidade/envio. |
| **Bootstrap pode ser tomado por terceiro** | Worker público nasce sem dono; primeiro visitante cria a conta, lê estado ou provisiona migrations. | Antes da exposição, vincular um dono verificável ou proteger a ativação com segredo de uso único inserido por canal seguro. Nunca usar “primeiro visitante vira dono”. Setup, diagnóstico, migração e aprovação exigem autenticação adequada. | Desenho do instalador e qualquer piloto público. |
| **Autenticidade do webhook não foi estabelecida** | Terceiro forja conversa/mensagem/status e contamina memória; HTTPS e `Client-Token` REST não demonstram assinatura do callback. | Obter contrato técnico do fornecedor ou estabelecer proteção de endpoint documentada e testada, com rotação e modelo de ameaça explícito. Sem isso, não apresentar a origem como autenticada. | Piloto com dados reais; fixtures podem seguir. |
| **Atomicidade local não cobre o WhatsApp** | Z-API aceita envio; processo cai antes de salvar resposta. Expirar trava e repetir duplica. | Operação persistente, claim atômico e resultado incerto recuperável. Expiração de execução não implica autorização para reenviar. Sem idempotência externa comprovada, assumir que pode haver resultado indeterminável. | Contrato e piloto de envio. |
| **Restauração ressuscita permissões** | Backup anterior contém aprovação ainda válida ou apaga registro de envio que já ocorreu. | Restaurar com envio bloqueado, invalidar autorizações anteriores e reconciliar antes de liberar. Bloqueio de recuperação não pode depender apenas de um campo no banco que também será restaurado. | Aceite de recuperação; antes de oferecer operação com envios. |
| **Cobertura do brief está superafirmada** | Elo leu todas as linhas capturadas, mas fornecedor perdeu eventos; responde que avaliou tudo do dia. | Informar cobertura do histórico disponível e saúde conhecida da captura. Não inferir completude do WhatsApp a partir de paginação concluída. Lacuna desconhecida continua desconhecida. | Redação e critérios de aceite agora. |
| **Imunidade a prompt injection não é demonstrável pelo Elo inteiro** | Texto recebido instrui IA a copiar conversas para outro app conectado; Elo não controla esse app nem o raciocínio do host. | Garantir que conteúdo não altera permissões nem autoriza ações nas rotas do Elo. Tratar mensagens/fontes como não confiáveis e limitar dados retornados. Explicitar risco residual do cliente e de outros conectores. | Redação agora; testes adversariais antes do piloto. |

As páginas técnicas da [Z-API](https://developer.z-api.io/security/client-token) descrevem autenticação das chamadas à API; isso não fornece, por inferência, autenticação de callbacks. Uma URL secreta pode funcionar como credencial de acesso ao endpoint se o provedor a preservar, mas depende do sigilo dessa URL e não é uma assinatura do corpo. Não rejeitar uma medida compensatória sem avaliação; também não chamá-la de equivalente sem testar registro em logs, vazamento, rotação, abuso e replay.

## Identidade, dados e escopo: contradições a resolver no documento

**“Não armazenar telefone” foi superado, não continua como requisito paralelo.** O PRD já registra corretamente a exceção autorizada: endereço de entrega e identificadores do provedor restritos ao backend. Preservar essa redação nas próximas versões. A promessa sustentável é minimizar identificadores estruturados enviados à IA. Texto livre, documentos e contexto continuam podendo identificar pessoas; não há anonimização nem DLP universal.

**“Capturar todas as mensagens individuais” não pode virar silenciosamente “só clientes escolhidos”.** A orientação recebida pelo comitê registra captura de todas as individuais como direção; grupos e exclusões precisam de definição própria. No PRD v0.1, a questão de produto 3 reabre “todas ou escolhidas”. Ajustar para registrar a direção mais recente e perguntar somente pelas fronteiras realmente não respondidas. Se houver divergência com a conversa original, apontá-la, sem escolher um requisito novo por conveniência técnica.

Receber evento, persistir conteúdo e liberá-lo à IA são três operações diferentes. Definir em cada uma o que acontece com grupos, desconhecidos, contatos excluídos, mídia e mensagens efêmeras. “Não transformar remetente em cliente” é adequado, mas não constitui controle de leitura. Se a instalação mistura conversas pessoais e profissionais e a IA pode consultar ambas, não prometer isolamento entre esses usos apenas pelo nome da ferramenta.

**Alias evita expor telefone; não prova identidade.** Quatro Marios precisam de aliases reconhecíveis pelo dono, IDs distintos e associação conferida. Dois aliases iguais, alias editado, contato desconhecido e número reciclado são casos reais do contrato. Não gerar identidade confiável a partir de nome de perfil, texto da conversa ou inferência do modelo. Quando não houver contexto suficiente, o resultado correto é não enviar até a pessoa reconhecer o destino. O mecanismo de reconhecimento deve ser provado sem introduzir por conta própria permissão para exibir telefone à IA.

O ID opaco também não é uma permissão. Conhecer `ct_7K2` ou um cursor não deve dar acesso por endpoint sem autenticação. Cursores precisam respeitar filtro e escopo da consulta original; paginação não pode ampliar uma consulta restrita.

**Conteúdo livre pode violar a intenção dos campos estruturados por outra rota.** Uma tool de memória pode devolver “fato: CPF = ...” extraído da conversa e chamar isso de texto livre. Esclarecer que não se cria um cadastro paralelo de identificadores por extração automática. Isso não exige filtrar o corpo original autorizado nem censurar toda frase que contenha um número; exige distinguir conteúdo da fonte, fato útil ao relacionamento e identificador estruturado disfarçado.

## Aprovação, concorrência e recuperação

O fluxo mínimo é intenção persistida → revisão humana autenticada → autorização vinculada e limitada → claim atômico → tentativa externa → resultado consultável. A intenção deve cobrir destinatário interno, versão da associação ao endereço restrito, instância remetente, texto exato e versão/hash dos bytes dos anexos. Alteração material invalida a autorização. A interface de aprovação precisa permitir conferir esse conteúdo e a pessoa certa no celular.

Uma pequena tela de confirmação do Elo é a hipótese mais defensável para compatibilidade entre clientes. O link pode identificar o rascunho; sua posse não basta para aprovar. Precisa de autenticação do dono, proteção contra confirmação involuntária por navegação e contra requisições forjadas. Não aprovar por GET, preview de link ou callback de webhook. Permissão MCP para leitura/preparação não dá permissão ao token do modelo para atuar como a sessão humana dessa tela.

**D1 pode resolver a parte local sem KV como trava e sem adicionar Durable Objects por antecipação.** Uma alteração condicional de estado deve decidir um único vencedor; não fazer `SELECT pendente` e depois `UPDATE` sem condição. Se aprovação e operação estiverem em registros distintos, a transação precisa preservar o vínculo. A documentação confirma que [`batch()` executa transacionalmente](https://developers.cloudflare.com/d1/worker-api/d1-database/), mas uma alteração que afeta zero linhas não equivale necessariamente a erro SQL: os efeitos subsequentes também devem estar condicionados ao vencedor. Testar o estado final e a quantidade de chamadas externas sob concorrência.

Uma transação de banco não engloba o HTTP da Z-API. Depois do claim, falha antes ou depois da chamada pode ser indistinguível. Callback e resposta também podem chegar em ordens diferentes. O produto precisa mostrar “resultado incerto”, tentar conciliação pelos identificadores realmente disponíveis e aceitar intervenção humana quando o provedor não permitir determinar o resultado. Isso é uma limitação honesta; criar abstração “exactly once” não a resolve.

No caminho de recuperação, bloquear envios antes de restaurar, trocar a geração de autorizações ou invalidá-las por mecanismo que não volte junto com o backup, revisar operações potencialmente executadas e só então liberar novas aprovações. Não transformar cada restauração em um projeto distribuído: um procedimento explícito e testado é suficiente para a primeira versão, desde que não possa reaplicar autorizações antigas silenciosamente.

## Histórico, memória e escala

O webhook deve validar tamanho, tipo, origem permitida e escopo; normalizar e persistir antes de reconhecer sucesso. Não executar análise de IA, download de toda mídia ou geração de fatos na mesma recepção. A necessidade de fila só aparece se picos, limites ou trabalhos demorados a justificarem; não adicionar fila para disfarçar ausência de contrato de retry do fornecedor.

Deduplicação requer identidades distintas para mensagem, evento, conversa, pessoa e instância. Não deduplicar pelo texto: “ok” repetido pode ser duas mensagens legítimas. Uma edição não é necessariamente nova fala; status em lote não é mensagem. `READ_BY_ME` e `READ` têm sentidos diferentes, portanto uma ordem numérica única de estados é perigosa. Registrar fatos de entrega/leitura segundo direção e contrato do evento, sem regredir por chegada tardia. Edição/exclusão deve marcar fontes derivadas que precisam de revisão; não continuar apresentando um fato desmentido como confirmação atual.

O brief deve usar intervalo civil no fuso escolhido e uma posição estável de leitura. Mensagens inseridas durante a paginação e eventos tardios não podem desaparecer entre “ontem” e “hoje”. Cobertura de extração, marca de leitura e conclusão de pendência são estados separados. Não é necessário event sourcing genérico: mensagem normalizada, origem/revisões necessárias e checkpoints explícitos atendem a hipótese inicial.

A instalação por usuário evita uma base central concorrida, mas cada D1 continua com limites e cada conta compartilha franquias. As estimativas do relatório de instalação são hipóteses; média de CPU de 5 ms não prova que autenticação, serialização e parsing cabem no teto de uma requisição Free. Medir percentis e pior entrada permitida, volume de índices, tamanho de banco, callbacks repetidos, limpeza e importações. Busca `LIKE` ilimitada pode varrer a base apesar de retornar dez linhas. Usar consultas parametrizadas, índices, limites por resposta e, se necessário, FTS antes de embeddings.

Retenção indefinida de toda conversa mais mídia contradiz qualquer promessa genérica de gratuidade. Não resolver essa tensão impondo retenção curta não aprovada. Apresentar um perfil medido, opções de guarda e o momento em que haverá custo ou limite. Quando atingir quota, a captura pode falhar: o estado precisa ficar visível e a cobertura posterior não pode ser presumida recuperada.

Memória com fonte, revisão e conflito é adequada. Não precisa de grafo nem taxonomia genérica. Importação deve possuir identidade da fonte e versão do processamento; o mesmo arquivo repetido não duplica fatos/tarefas, mas uma fonte corrigida precisa poder atualizar propostas. Aniversário de familiar pode usar vínculo e dia/mês; não inferir parentesco, ano de nascimento ou regra de 29 de fevereiro sem indicação suficiente. Ambiguidades viram revisão, não arquitetura adicional.

## Comparação dos caminhos

| Caminho | O que resolve | Custo e risco que fica | Parecer |
|---|---|---|---|
| **Botão oficial + assistente web individual + Workers/D1** | Evita toolchain local; permite estado de onboarding, alias, aprovação, diagnóstico e revogação no mesmo lugar. | Contas Git/Cloudflare/IA/Z-API, autorização, credenciais, QR e atualização dos clones ainda existem. Bootstrap e autenticação precisam ser empacotados corretamente. | **Candidato principal.** Provar ciclo completo em conta limpa antes de anunciar simplicidade. |
| **Mesmo backend, instalação guiada por IA local/CLI** | Pode acelerar prova técnica e auxiliar desenvolvedor em falhas. | Node/CLI/agente, diferenças de SO, tokens em arquivos/processos, permissões e suporte individual elevam atrito. Uma IA paga local pode virar custo oculto. | Alternativa assistida. Não deve ser a única rota prometida para leigos sem ensaio específico. |
| **Fork amplo de Segundo Cérebro/template ou acesso direto ao MCP Z-API** | Produz demonstração rápida de ferramentas já existentes. | Primeiro importa dependências e domínio inadequados; segundo não entrega memória/histórico e pode contornar identidade restrita/aprovação. Nenhum resolve a instalação inteira. | Rejeitar como atalho de arquitetura. Extrair utilitários pequenos com revisão e testes. |

Uma conta central operada pelo instrutor continua fora da decisão atual. Criar um instalador com token amplo da conta para automatizar tudo adicionaria um produto privilegiado sem evidência de necessidade; não é o menor caminho.

O assistente web deve ser pequeno: configurar, conferir identidade, aprovar, diagnosticar e recuperar. Não expandir isso para CRM visual ou chat próprio. Em contrapartida, chamá-lo de “opcional” enquanto a segurança depende dele esconde uma dependência: escolhê-lo como hipótese explícita ou demonstrar alternativa equivalente no cliente de IA.

## Agendamento e promessas de compatibilidade

Os relatórios encontraram documentação atual de tarefas com plugins/conectores em Claude e ChatGPT. Portanto, **não há fundamento para afirmar incompatibilidade geral de recorrência com MCP**. A prova que falta é do MCP próprio do Elo, no plano e dispositivo escolhidos, com renovação/revogação, execução sem usuário presente e tratamento de ferramenta indisponível. Registrar o que realmente foi chamado e a cobertura do brief, não somente que apareceu uma notificação.

Brief a pedido é uma proposta de etapa, não substituto automaticamente aprovado para uma experiência recorrente que o negócio queira na estreia. O mesmo vale para texto antes de anexos e uma plataforma antes da outra. Manter essas concessões como decisões abertas, enquanto provas independentes avançam com dados fictícios. Backend de captura não implica uma segunda IA executando raciocínio continuamente.

## Correções concretas no PRD

1. **R11–R13 e R33:** incluir versionamento da associação de destino e invalidação de aprovação por mudança de identidade/instância; alias não basta para validar a pessoa.
2. **R03, R06 e R41:** exigir bootstrap fechado, proprietário vinculado, separação entre sessão humana de aprovação e credencial MCP, revogação testada e ausência de bypass em setup/diagnóstico.
3. **R14–R20:** separar mensagem nova, edição/exclusão e eventos de estado; definir comportamento de origem autenticada, evento tardio e efeito sobre fatos derivados.
4. **R27:** trocar promessa de “todas as mensagens do WhatsApp” por avaliação completa do conjunto capturado, com período, posição/cobertura e limitações de captura explícitos; não esconder que a totalidade externa é desconhecida.
5. **R32–R35:** explicitar canal humano verificável, claim atômico e nenhuma repetição automática de operação incerta apenas por expiração de trava.
6. **R09/R45:** acrescentar recuperação com envios bloqueados e invalidação que sobreviva à restauração do banco. Testar backup anterior a um envio já realizado.
7. **R38:** limitar a garantia às permissões e ações do Elo; documentar risco residual de instruções maliciosas no cliente/serviços conectados. Não prometer imunidade geral do modelo.
8. **Suposição 4 e questão 3:** reconciliar captura de todas as individuais com a decisão mais recente; deixar grupos/exclusões como fronteiras em aberto sem reduzir silenciosamente o escopo.
9. **R02/R07/R09 e métricas:** usar uma única hipótese de ensaio. O PRD propõe três pessoas sem prazo; instalação propõe cinco, ≥80% e ≤30 minutos após pré-requisitos. Recomendo cinco e quatro conclusões sem ajuda individual como teste formativo, não prova estatística de adoção. Os 30 minutos continuam hipótese, separando preparo de contas do tempo de configuração. Não apresentar nenhum desses números como aprovado por Robson.
10. **R42 e sequência:** separar “documentado”, “provado em conta/plano” e “prometido no lançamento”, incluindo recorrência e transferência de arquivos. Uma prova local não valida código publicado nem cliente móvel.

## O que pode avançar e o que ainda bloqueia

**Agora, nesta entrega:** concluir PRD e pesquisa, preservar decisões abertas e registrar os riscos acima. Nenhum código está autorizado. A recomendação de arquitetura é condicional, não implementação aprovada.

**Antes de codar os contratos críticos, após autorização:** fechar como o dono é identificado, como aprova, quais dados a IA pode consultar e como identidade/ação são vinculadas. Definir efeitos de concorrência, timeout e restauração. Não precisa congelar cada tabela ou escolher todos os planos comerciais para desenhar isso.

**Antes de piloto com dados reais e envios:** provar autenticação/isolamento, origem do webhook ou compensação aceitável, projeção de dados e erros, reconhecimento do destinatário, aprovação exata, concorrência, timeout, revogação e recuperação sem reenvio. Definir finalidade/escopo/guarda dos dados permitidos. Não colocar o número pessoal principal como primeiro teste de falha.

**Antes de promessa comercial de instalação e operação:** executar conta limpa, aluno leigo, celular, atualização, retorno de falha e custos do perfil adotado. Provar tarefas recorrentes e anexos se fizerem parte da oferta inicial. Se essas provas falharem, reduzir a promessa ou mudar o desenho com o operador; não transferir o problema para suporte informal.

**Pode continuar como hipótese:** D1 único, ferramentas pequenas, botão + assistente, FTS quando necessário, ausência de Code Mode/vector/multitenancy e R2 apenas para arquivos que precisem ser preservados. Nenhuma evidência atual exige ampliar essa infraestrutura.
