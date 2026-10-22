# Comece a usar seu Elo

**Você continua no Claude ou ChatGPT.** O Elo acrescenta memória dos contatos, combinados e próximos passos. O backend fica na sua conta Cloudflare. Se conectar o WhatsApp e autorizar a captura, você também poderá consultar as conversas disponíveis e preparar retornos para revisar. Não aparece um novo Claude dentro do WhatsApp.

Ainda não instalou? Copie [o pedido curto para a IA instaladora](../prompts/instalar-elo.md). Ela segue o [roteiro de instalação assistida](instalacao-assistida.md), executa a parte técnica e chama você nas intervenções inevitáveis. Já instalou? Não precisa refazer a configuração.

## Seu primeiro pedido

No cliente de IA com o **conector Elo habilitado nesta conversa**, escreva:

> Use configurar-elo e me mostre como usar o Elo. Confira o que está funcionando, explique o que eu instalei e me conduza em um primeiro uso, uma etapa por vez. Não importe minha agenda nem grave uma demonstração sem combinar comigo.

A IA explica em um minuto, mostra o estado real e oferece preparar uma reunião, registrar uma reunião ou revisar retornos. Você pode pular e retomar depois com o mesmo pedido. Se não achar um campo, diga “não achei; me guie uma etapa por vez”.

Sem Z-API, comece registrando anotações autorizadas ou um exemplo fictício. A IA mostra o que pretende gravar e aguarda sua autorização antes da primeira escrita de demonstração. Depois consulta a memória para você perceber o resultado. Dados fictícios também ficam salvos; limpeza é uma escolha separada.

## Três pedidos para amanhã

| Situação | Escreva no cliente de IA |
|---|---|
| Antes de uma reunião | “Consulte no Elo a memória e as tarefas de [contato] e prepare minha pauta. Mostre o que falta saber.” |
| Depois da reunião | “Use pós-reunião para registrar no Elo estas anotações de [contato], da reunião de [data]: [notas].” |
| Organizar os retornos | “Use revisão diária para mostrar quem precisa de retorno nas minhas conversas disponíveis. Diga qual período conseguiu avaliar.” |

**Skills** são instruções reutilizáveis para essas rotinas. As cinco do pacote são `configurar-elo`, `pos-reuniao`, `revisao-diaria`, `approve` e `otimize-meu-processo`. Peça pelo nome; a IA deve conferir que estão instaladas/carregadas. **Projetos** organizam chats e arquivos no seu cliente de IA; não são o banco do Elo, nem garantem que o conector esteja habilitado em qualquer conversa. Arquivos exportados não provam que uma Skill está instalada.

Para adaptar uma rotina sua, peça “Use Otimize meu processo para melhorar minha rotina de [atividade]”. [Compatibilidade, instalação das Skills e limites por cliente](clientes-e-agendamento.md).

## E minha planilha?

Você pode continuar analisando arquivos no seu cliente de IA pelo fluxo habitual, respeitando permissões e evitando dados desnecessários. O Elo não importa, sincroniza ou envia a planilha. Ele pode ajudar a consultar o contexto de um contato e registrar os combinados autorizados que saírem da análise.

Exemplo: “Analise esta planilha para [objetivo]. Depois me mostre quais conclusões e próximos passos vale registrar no Elo para [contato]”. Arquivo/chat e memória do Elo são separados; apagar de um lado não apaga do outro.

## Quando quiser conectar o WhatsApp

Peça à IA para seguir o [guia visual Z-API](zapi.md). Entre na tela `/setup` da **sua instalação**, faça login Access e preencha as credenciais nos campos protegidos. Client-Token fica em Segurança da conta Z-API, fora da página da instância. A IA deve explicar e conduzir os campos de recebimento antes de ativá-los. Não cole credenciais ou o endereço privado de webhook no chat.

Captura e agenda são escolhas separadas. Ativar callbacks pode iniciar o armazenamento de conversas novas. Mapear a agenda guarda contatos no backend e só acontece quando você autorizar essa finalidade. Não importa conversas antigas nem transforma todos os contatos em clientes. Se houver homônimos, identifique a pessoa certa; a IA não deve escolher o primeiro.

Para enviar, peça “Prepare pelo Elo uma mensagem para [contato] com este texto: [...] e me mostre antes”. **Confira destinatário e texto e aprove em outra mensagem.** Habilitar envios não aprova uma mensagem; pausar envios não pausa captura. Envio V0 é só texto individual, sem grupos/anexos. Aceito pelo provedor não comprova entrega.

## Como saber o que terminou

A IA deve separar **base publicada**, **cliente conectado**, **Skills disponíveis**, **WhatsApp validado** e **primeiro uso feito ou pulado**. Credenciais salvas ou um evento antigo não garantem conexão atual/cobertura completa. Sem WhatsApp, a entrega pode ser “base e cliente funcionando; WhatsApp pendente”, desde que os primeiros itens tenham sido exercitados.

Instalação completa exige autenticação, Skills, recebimento real autorizado persistido, consulta, envio aprovado a contato controlado e consulta do resultado. [Ensaios de aceite](ensaios.md). Uso no celular e rotina automática pedem suas próprias provas; não contam como validados pelo computador. Não espere brief agendado sem uma execução real confirmada.

## Custos, privacidade e ajuda

Cloudflare, cliente de IA, inferência e Z-API têm cobranças próprias. Confira condições atuais antes de autorizar compras/ativações; não há teto total garantido. [Perfil de uso observado](perfil-de-uso.md).

Texto livre pode identificar pessoas. Histórico bruto ativo fica até 30 dias; memória concisa e pendências têm vida distinta. Backups, Z-API e chats/arquivos da IA têm regras próprias. [Recuperação e revogação](recuperacao.md).

## Referência da instalação pessoal do mantenedor

Somente para essa instalação: [abrir Elo](https://elo.robsonlins.workers.dev), MCP `https://elo.robsonlins.workers.dev/mcp`, [configuração WhatsApp](https://elo.robsonlins.workers.dev/setup) e [plugin pessoal ChatGPT](https://chatgpt.com/plugins/plugin_asdk_app_6ad36d6a59f881919b3de4f512858abf). Outra pessoa precisa dos próprios endereços e autorização; não usar estes como alvo de instalação.

Evidências anteriores, com seus recortes: [ChatGPT](../implementacao/homologacao-chatgpt.md), [Skills Claude](../implementacao/homologacao-skills-claude.md), [celular](../implementacao/mobile-chatgpt-1710.md). Não provam que outra conta já está configurada.
