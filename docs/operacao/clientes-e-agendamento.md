# Clientes, Skills e agendamento

Consulta documental: **16/10/2026**. Fontes oficiais foram abertas nesta implementação. **D** = capacidade descrita pelo fornecedor; **P** = prova Elo pendente; **T** = exercitada de fato, com evidência. Nenhuma linha abaixo é T. “D + P” não é promessa de funcionamento em qualquer conta/plano.

| Jornada | Claude | ChatGPT | Prova Elo exigida |
|---|---|---|---|
| Conectar MCP remoto | D: conectores próprios; fonte atual cita Free (um conector), Pro, Max, Team e Enterprise [1] | D: adicionar MCP como plugin na web, OAuth configurável [2]; elegibilidade do plano-alvo P | Ferramentas do Elo descobertas com autenticação, conta/plano/versão registrados |
| Login Cloudflare Access | D: caminho Access for SaaS/OIDC para MCP descrito pela Cloudflare [7]; combinação com Claude P | Mesmo caminho documental [7]; combinação com ChatGPT P | Dono correto entra; outro usuário é negado; sem exceção de origem/preview |
| Autorizar MCP | D: fluxo de login/OAuth do conector [1] | D: OAuth na conexão custom MCP [2] | Consentimento, callback e vínculo ao dono exercitados; nenhum segredo no chat |
| Ler e escrever | D: conectores podem acessar dados e agir [1]; tools Elo P | D: MCP próprio com tools de leitura/escrita [2]; tools Elo P | Consulta paginada e memória sintética persistida/relida em cada cliente |
| Revisão e approve | P: Skills Elo, espera humana e estado da ação | P: Skills Elo e combinação com confirmação do host | Homônimos, edição, expiração e consulta do mesmo envio; não confundir permissão geral do host com approve concreto |
| Renovação | P: sessão Access e autorização MCP são camadas distintas | P: mesma distinção | Expirar token de acesso, renovar quando admitido; se exigir login, falhar claramente sem bypass |
| Revogação | D: desconectar conector é documentado [1]; efeito Elo P | P: efeito da desconexão/remoção sobre grant Elo | Revogar grant no Elo e acesso do dono, testar token antigo e refresh; remover plugin/conector sozinho não prova revogação no servidor |
| Celular | D: fonte atual descreve Cowork web/mobile conforme plano e rollout [4]; jornadas Elo P | D: plugins disponíveis à conta em mobile; “Desktop only” não funciona [5]; Elo P | Ler, revisar e aprovar texto no aparelho real; registrar Android/iOS, versão e atrito |
| Recorrência | D: tarefas Cowork com conectores/Skills em planos pagos e rollout [4]; custom MCP Elo + renovação P | D: tarefas web podem usar tools/Skills/plugins acessíveis ao chat [3]; plano/workspace e Elo P | Execução no horário real chama MCP autenticado e gera brief; erro de login e revogação visíveis |
| Instalar Skills | P: adaptar ao mecanismo habilitado no Claude da pessoa | D: diretório com SKILL.md e name/description; distribuição reutilizável por plugins [6]; pacote Elo P | Skill selecionável e fluxo exercitado; não assumir caminhos/formato idênticos |

O plano do cliente e as permissões de organização precisam ser conferidos na conta-alvo. Campos/documentos de um fornecedor não configuram o outro. Arquivos criados na IA podem permanecer nela; a V0 Elo envia somente texto individual, sem anexos.

## Instalar este pacote

As pastas em `skills/` são o fonte das instruções, não uma alegação de instalação automática no Claude/ChatGPT. Entregue ao instalador/IA este pedido:

> Instale ou adapte approve, revisao-diaria, pos-reuniao e otimize-meu-processo do pacote Elo no mecanismo de Skills disponível nesta conta. Preserve limites de aprovação e cobertura. Conecte o MCP com login Access e confirme ferramentas e Skills selecionáveis. Se faltar permissão ou recurso, indique a etapa pendente sem substituir por promessa ou me pedir para programar.

Para ChatGPT, a documentação recomenda plugins para distribuição reutilizável de Skills [6]. Para Claude, use o mecanismo efetivamente habilitado; o pacote ainda precisa de ensaio de distribuição e seleção. Uma instrução colada no chat pode servir para testar comportamento, mas não comprova instalação persistente.

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
