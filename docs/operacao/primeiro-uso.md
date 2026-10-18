# Primeiro uso do Elo

Sua instalação pessoal está em **https://elo.robsonlins.workers.dev**. Para conectar um cliente, o endereço MCP é **https://elo.robsonlins.workers.dev/mcp**. Entre com o Cloudflare Access; não há senha estática do Elo.

Este guia acompanha a instalação assistida. Não comprova uma instalação concluída. A URL publicada, o ponto de entrada do instalador e a versão efetiva devem vir da evidência de deploy da própria instalação; não há link fictício de botão neste guia. Use os [ensaios de aceite](ensaios.md) e a [matriz de clientes](clientes-e-agendamento.md).

## Nesta instalação do Robson

O [plugin pessoal Elo no ChatGPT](https://chatgpt.com/plugins/plugin_asdk_app_6ad36d6a59f881919b3de4f512858abf) já está conectado e contém as quatro Skills de base, além da rotina de pauta criada no ensaio. Abra o plugin na mesma conta, inicie uma conversa com Elo e peça “registre esta reunião”, “faça minha revisão diária” ou “otimize meu processo”. Se pedir reconexão, faça o login Access com o e-mail autorizado e aceite o consentimento. O agente cuida da configuração técnica; não cole senhas ou códigos no chat.

A página [Configurar WhatsApp](https://elo.robsonlins.workers.dev/setup) é o ponto de entrada para conexão Z-API e webhook. Não é necessário refazer o cadastro MCP para usar o Elo já conectado. Esse link de plugin é particular desta conta; outra instalação precisa do seu próprio provisionamento e autorização.

[Resultados e limitações dos testes no ChatGPT](../implementacao/homologacao-chatgpt.md). O Claude pessoal também foi conectado e as quatro Skills foram instaladas/exercitadas, com revisão diária parcial; veja [a evidência específica do Claude](../implementacao/homologacao-skills-claude.md). Celular e rotina agendada continuam com aceites próprios pendentes; conexão no computador não os comprova.

## No dia a dia

Abra uma conversa com Elo no ChatGPT ou Claude já conectado e peça o que precisa. Exemplos:

- **Depois da reunião:** “Use a Skill pós-reunião do Elo para registrar estas anotações de [contato]: […]. Separe os combinados, as dúvidas e os próximos passos.”
- **Antes da reunião:** “Consulte a memória e as tarefas de [contato] no Elo e prepare uma pauta curta, destacando o que preciso perguntar.”
- **Revisar o dia:** “Use a revisão diária do Elo para hoje. Mostre prioridades, prazos, pendências e o que não conseguiu avaliar.”
- **Enviar uma mensagem:** “Prepare pelo Elo uma mensagem para [contato] com este texto: […]. Mostre a proposta e aguarde minha aprovação.” Confira a pessoa e o texto antes de aprovar no próximo turno.
- **Adaptar sua rotina:** “Use Otimize meu processo para melhorar minha rotina de [atividade].”

Se houver mais de um contato com o mesmo nome, escolha a ficha indicada pelo Elo. Corrija fatos ou tarefas no próprio chat quando necessário. Áudios e imagens sem texto utilizável aparecem como não avaliados; isso não impede consultar as demais informações disponíveis.

A revisão manual já pode ser usada. O agendamento automático no Work/Cowork ainda não tem comprovação completa nesta instalação; não conte com um brief automático até essa etapa ser validada. Não é preciso refazer a configuração para usar as funções já conectadas.

## O que você precisa fazer

1. Abra o ponto de entrada fornecido com sua instalação, preferencialmente no computador. Autorize a IA instaladora na **sua conta Cloudflare** e confira o nome da conta antes de prosseguir. Ela deve executar a configuração; você não precisa estudar OAuth, criar políticas ou copiar IDs técnicos.
2. Faça o login e os consentimentos solicitados. Segredos entram em campos protegidos ou no gerenciador de segredos do instalador, nunca no chat ou em capturas de tela. Se a IA não tiver permissão para executar uma etapa, a instalação deve dizer exatamente qual autorização falta e retomar depois dela.
3. Peça para conectar o Elo no Claude ou ChatGPT escolhido e instalar as quatro Skills deste pacote. Faça o login Cloudflare Access quando o cliente abrir a autorização. Teste consulta e memória fictícias antes de conectar WhatsApp.
4. Quando tiver contratado sua própria instância Z-API, insira as credenciais pela superfície protegida de configuração, autorize a conexão do número controlado e siga o pareamento. A instância ainda não contratada deve aparecer como **WhatsApp não configurado**. Não compre automaticamente por seguir este guia.
5. Peça à Skill `configurar-elo` para mapear a agenda do WhatsApp. Ela percorre as páginas de `contacts_sync` e permite buscar por nome com `contacts_list`, mesmo sem conversa prévia. Se houver homônimos, identifique o alias correto antes de preparar mensagem. Isso não importa histórico anterior nem autoriza envio.
6. Somente com autorização específica para o número de teste, faça receber um texto sintético, consulte-o por ID interno, prepare outro com a Skill approve, confira destinatário/texto, aprove no chat e consulte o resultado. Aceito pelo provedor não significa entregue.

Uso diário: peça “faça minha revisão diária”, “registre esta reunião” ou “otimize meu processo”. A revisão mostra cobertura e pendências. Enviar exige uma revisão concreta no chat. Não é necessário terminal no uso diário; o dono confirmou uma consulta sintética no ChatGPT/iPhone; revisão e aprovação no celular ainda precisam de ensaio. [Recorte da confirmação](../implementacao/mobile-chatgpt-1710.md).

## O que a instalação deve executar por você

Este é o contrato do instalador/IA, não uma lista de tarefas técnicas para o aluno. Se alguma parte não estiver implementada ou falhar, registrar **instalação incompleta**, mantendo o diagnóstico por etapa.

- Identificar conta e recursos existentes do Elo para retomar sem recriar/apagar dados; provisionar somente recursos deste projeto.
- Configurar Cloudflare Access for SaaS/OIDC, acesso restrito ao dono, callbacks e segredos/bindings. Integrar o login à autorização MCP e vincular identidade validada ao dono autorizado. A referência oficial é [Secure MCP servers](https://developers.cloudflare.com/cloudflare-one/access-controls/ai-controls/secure-mcp-servers/). Esse caminho documentado não prova que a conta e os dois clientes já passaram no Elo.
- Usar a URL publicada do próprio Elo. Não exigir compra de domínio por analogia com Access de aplicações web quando OIDC em workers.dev atender. Não trocar autenticação por cookie de navegador, cabeçalho fixo ou exceção pública para facilitar o teste.
- Testar descoberta e fluxo de autorização, identidade indevida, expiração/renovação e revogação; conferir que origem/preview não contornam autenticação. Webhook tem autenticação própria e não abre as tools.
- Configurar a conexão do cliente pelo recurso disponível naquela conta. Login e consentimento humano continuam necessários. Falta de permissão organizacional deve aparecer como bloqueio concreto.
- Instalar/adaptar o pacote de Skills no mecanismo suportado pelo cliente e comprovar que está selecionável. Apenas baixar os arquivos não conclui a instalação.
- Exibir diagnóstico seguro por etapa com versão, conexão, última recepção e erro seguro, sem mensagens, nomes completos, telefones, tokens ou URLs privadas.

## Quando pode chamar de concluído

Autenticação e leitura/escrita sintéticas podem ser verificadas sem Z-API. A instalação completa só termina depois de autenticação, recebimento real autorizado, consulta por ID interno, envio aprovado a destino controlado e consulta do estado. Enquanto a Z-API não existir, registrar essa dependência sem simular eventos reais. Os testes com cliente, celular e pessoa leiga são aceites próprios, não consequências de testes do servidor.

## Custos e privacidade

Antes de habilitar recurso pago, a instalação deve mostrar a cobrança e pedir a autorização que faltar. Plano da IA, Cloudflare/Workers/D1/Access, inferência e Z-API são custos separados; US$5 não é teto da solução. O uso do DeepSeek exige Paid/créditos conforme o caminho de inferência escolhido, com elegibilidade confirmada na conta. O [perfil de consumo observado](perfil-de-uso.md) separa medidas e projeções; não representa o custo completo da conta nem dispensa mostrar a cobrança antes de ativar recursos.

Texto de conversa pode identificar pessoas. O Elo restringe identificadores estruturados de entrega ao backend, mas não promete anonimização universal. O histórico bruto ativo dura até 30 dias; memória concisa e pendências têm vida distinta. Exclusão de uma camada não apaga automaticamente backups, Z-API ou histórico do chat de IA.
