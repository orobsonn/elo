# Clientes, Skills e agendamento

Consulta documental: **16–17/10/2026**. Fontes oficiais foram abertas nesta implementação. **D** = capacidade descrita pelo fornecedor; **P** = prova Elo pendente; **T** = exercitada de fato, com evidência. T vale somente para o recorte indicado, não para a linha inteira nem para qualquer conta/plano.

| Jornada | Claude | ChatGPT | Prova Elo exigida |
|---|---|---|---|
| Conectar MCP remoto | T: Elo conectado na conta pessoal Free (um conector), 23 tools, OAuth/Access; demais planos apenas documentados [1] | T: plugin Elo na conta pessoal, Chrome/web, OAuth e 23 tools; não generalizado para outro plano [2] | Ferramentas do Elo descobertas com autenticação, conta/plano/versão registrados |
| Login Cloudflare Access | T: login Access/OIDC e consentimento no Claude web Free; sem bypass [7] | T: OTP do dono no fluxo real do ChatGPT; identidade indevida também coberta por testes controlados, não por outra conta real | Dono correto entra; outro usuário é negado; sem exceção de origem/preview |
| Autorizar MCP | T: consentimento e callback Elo no Claude pessoal [1] | T: DCR, consentimento para ChatGPT e callback à conta, sem colar credencial no chat | Consentimento, callback e vínculo ao dono exercitados; nenhum segredo no chat |
| Ler e escrever | T: leitura paginada, importação sintética atômica de reunião, memória/tarefa persistidas e replay sem duplicação no Claude web Free | T: diagnóstico, quatro homônimos, fonte idempotente, memória paginada, conflitos/revisões, tarefas, datas e atenção sintéticas com GPT-5.6 Sol Medium; Skills também exercitadas no Work com GPT-6.1 Sol High | Consulta paginada e memória sintética persistida/relida em cada cliente |
| Revisão e approve | T parcial: quatro Skills instaladas/carregadas, rascunho/espera/cancelamento, homônimos e anexos recusados; revisão diária parcial; envio real pela interface Claude P | T parcial: quatro Skills instaladas, pós-reunião e revisão diária parcial no Work, ferramentas de revisão de memória/tarefas e rascunho cancelado; revisão diária integral e novo envio pela Skill ainda P | Homônimos, edição, expiração e consulta do mesmo envio; não confundir permissão geral do host com approve concreto |
| Renovação | P: sessão Access e autorização MCP são camadas distintas | T parcial: renovação MCP observada no cliente conectado; renovação natural Access neste cliente não foi isolada como prova específica | Expirar token de acesso, renovar quando admitido; se exigir login, falhar claramente sem bypass |
| Revogação | D: desconectar conector é documentado [1]; efeito Elo P | P: efeito da desconexão/remoção sobre grant Elo | Revogar grant no Elo e acesso do dono, testar token antigo e refresh; remover plugin/conector sozinho não prova revogação no servidor |
| Celular | D: fonte atual descreve Cowork web/mobile conforme plano e rollout [4]; jornadas Elo P | D: plugins disponíveis à conta em mobile; “Desktop only” não funciona [5]; Elo P | Ler, revisar e aprovar texto no aparelho real; registrar Android/iOS, versão e atrito |
| Recorrência | D: tarefas Cowork com conectores/Skills em planos pagos e rollout [4]; custom MCP Elo + renovação P | D: tarefas web podem usar tools/Skills/plugins acessíveis ao chat [3]; plano/workspace e Elo P | Execução no horário real chama MCP autenticado e gera brief; erro de login e revogação visíveis |
| Instalar Skills | T: quatro ZIPs fonte instalados nas Skills pessoais Free e carregados pelo Claude; quinta rotina gerada, revisada, salva e executada em dois ensaios | T: plugin Elo privado 1.0.3 contém approve, revisao-diaria, pos-reuniao e otimize-meu-processo; manifesto e bytes conferidos. Três Skills de base carregadas e exercitadas no Work; revisão diária parcial. Rotina de pauta gerada, instalada e carregada/executada no Work com dados fictícios [6] | Skill selecionável e fluxo exercitado; não assumir caminhos/formato idênticos |

Em 17/10/2026, o cliente HTTP próprio passou por Access OTP, consentimento/OAuth, initialize e 23 tools, criação/consulta sintética e renovação MCP em produção. Após mais de três horas renovou também a credencial Access e usou o MCP; o grant sintético foi revogado com recusa dos tokens antigos. Evidência em [validação publicada](../implementacao/validacao-publicada.md). Essa prova continua separada da homologação posterior no ChatGPT; navegador local de autorização não prova uso no smartphone.

No ChatGPT web, GPT-6 nesta sessão falhou ao carregar respostas inclusive sem ferramentas. GPT-5.6 Sol Medium respondeu e executou os cenários sintéticos no Elo publicado. Houve também erros internos transitórios em consultas paralelas pelo conector instalado; as repetições sequenciais de leitura funcionaram. A causa dessas falhas paralelas não foi determinada. O plano comercial da conta não foi identificado nesta homologação; o recurso foi comprovado apenas na conta pessoal efetivamente usada. [Homologação, limites e prova visual das quatro Skills](../implementacao/homologacao-chatgpt.md).

O plano do cliente e as permissões de organização precisam ser conferidos na conta-alvo. Campos/documentos de um fornecedor não configuram o outro. Arquivos criados na IA podem permanecer nela; a V0 Elo envia somente texto individual, sem anexos.

## Instalar este pacote

As pastas em `skills/` são o fonte das instruções, não uma alegação de instalação automática no Claude/ChatGPT. Entregue ao instalador/IA este pedido:

> Instale ou adapte approve, revisao-diaria, pos-reuniao e otimize-meu-processo do pacote Elo no mecanismo de Skills disponível nesta conta. Preserve limites de aprovação e cobertura. Conecte o MCP com login Access e confirme ferramentas e Skills selecionáveis. Se faltar permissão ou recurso, indique a etapa pendente sem substituir por promessa ou me pedir para programar.

Para ChatGPT, a documentação recomenda plugins para distribuição reutilizável de Skills [6]. Para Claude, o upload dos quatro ZIPs e o carregamento persistente foram exercitados no Free em 17/10; use o mecanismo efetivamente habilitado na conta. Uma instrução colada no chat pode servir para testar comportamento, mas não comprova instalação persistente.

## Agendar no Work/Cowork

Este guia não cria nenhuma automação. Só agende depois de a pessoa pedir a rotina e escolher horário/fuso. Execute o prompt manualmente primeiro, confira acesso ao Elo, salve a Skill no contexto acessível ao agendador e faça uma execução recorrente real controlada. No ChatGPT web não conte com pasta local persistente [3]. No Claude, tarefas dependentes de arquivos/apps locais têm restrição própria de execução [4].

Prompt base, a adaptar ao pedido autorizado:

> Execute a Skill revisao-diaria do Elo em [horário] no fuso [IANA], para o período [regra de datas]. Consulte apenas fontes autorizadas do Elo. Percorra a paginação, separe fatos claros de pendências e declare cobertura e lacunas. Se a avaliação estiver incompleta ou o login expirar, diga o que falta; não declare ausência de pendências. Não execute envios: apresente sugestões para approve em sessão humana. Notifique somente quando houver achado relevante, falha, necessidade de reconexão ou ação humana, salvo se eu pedir brief em toda execução.

Após criação, confira nome, fuso, próxima execução, tools permitidas e prompt salvo. Na execução real registre chamada MCP, resultado e horário; receber só um lembrete não prova rotina com ferramentas. Confira renovação antes/depois da expiração e falha após revogação. Se a conta não oferecer a combinação, explicite impacto no brief automático e mantenha o aceite pendente. Não criar scheduler substituto no backend nem converter aprovação antiga em autorização de envio agendado.

## Fontes oficiais

1. [Claude: custom connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).
2. [OpenAI: Add custom MCP server](https://developers.openai.com/api/docs/guides/custom-mcp-server).
3. [OpenAI: Scheduled tasks](https://learn.chatgpt.com/docs/automations).
4. [Claude: Schedule recurring tasks](https://support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-claude-cowork).
5. [OpenAI: Plugins](https://learn.chatgpt.com/docs/plugins).
6. [OpenAI: Build skills](https://learn.chatgpt.com/docs/build-skills).
7. [Cloudflare: Secure MCP servers](https://developers.cloudflare.com/cloudflare-one/access-controls/ai-controls/secure-mcp-servers/).

## Conferência posterior de 17/10

O envio aprovado à Lainny foi entregue pelo conector instalado no **Codex**, não pela interface web ChatGPT. O cron técnico do backend processou uma nova fonte sem reprocessar o lote da Skill. O teste único do Work salvo para 12h05 não teve execução comprovada (`last_run_time=null`); foi pausado e não tem próxima execução. No Claude pessoal Free, o botão de conector personalizado estava desabilitado; a descrição acessível confirmou o limite de um conector personalizado do Free já ocupado. [Evidências e limites](../implementacao/homologacao-complementar.md).

Retomada posterior: o dono autorizou liberar a vaga removendo os quatro cadastros personalizados antigos e confirmou o consentimento Claude. O Elo conectou com 23 tools; diagnóstico, memória e tarefas fictícias foram consultados no Claude web Free/Sonnet 5.5 Médio. O bloqueio de criação foi resolvido; as demais jornadas Claude ainda não foram homologadas. [Prova atualizada](../implementacao/homologacao-complementar.md#retomada-conexão-claude-concluída).

## Homologação posterior das Skills no Claude

As quatro Skills foram instaladas e exercitadas no Claude web Free/Sonnet 5.5 Médio. Pós-reunião gravou um lote sintético e repetiu sem duplicação; approve aguardou outro turno e cancelou sem execução; revisão diária percorreu 18 fontes disponíveis, com 11 indisponíveis; Otimize criou uma rotina instalada e executada em dois contatos fictícios. O benefício humano ainda não foi medido. [Relatório e limites](../implementacao/homologacao-skills-claude.md).

No Free, Cowork apresentou Fazer Upgrade; nenhum plano foi contratado nem job Claude criado. O mesmo teste único Work recebeu uma tentativa limitada de reconfiguração e permaneceu pausado, sem próxima execução. Posteriormente apareceu `last_run_time=2026-10-17T15:07:17.590127Z`, mas não foi localizado resultado agendado com chamadas MCP; esse timestamp não comprova o aceite. Não houve Run now nem scheduler substituto.
