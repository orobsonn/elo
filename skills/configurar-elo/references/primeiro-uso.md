# Vamos usar seu Elo

Etapa final de adoção no próprio cliente de IA. Não é uma tela, entrevista longa ou tarefa de infraestrutura. Use depois da instalação ou quando a pessoa disser “me mostre como usar o Elo”. Pode pular e retomar depois. Não repetir configuração já concluída.

## 1. Explique em até um minuto

Adapte à conta sem prometer estado não observado:

> Você continua conversando aqui no Claude ou ChatGPT. O Elo acrescenta uma memória dos seus contatos, combinados e próximos passos, guardada na sua Cloudflare. Se o WhatsApp estiver conectado e a captura autorizada funcionando, você pode consultar as conversas disponíveis e preparar retornos. Não aparece um novo Claude dentro do WhatsApp. Você autoriza cada envio: um pedido com pessoa e texto exatos já basta; se a IA redigir, você revisa e aprova uma vez.
>
> Skills são rotinas prontas, como registrar uma reunião ou revisar o dia: basta pedir em português. Projetos organizam conversas e arquivos no cliente de IA; não substituem a memória do Elo nem significam que o conector/Skill está habilitado em todo chat. Seus chats e arquivos continuam sujeitos às regras desse cliente; usar Elo não os torna locais no computador.

## 2. Mostre o que está disponível de verdade

Depois de `installation_status`, faça uma tabela curta **etapa / o que foi comprovado / o que falta**, sem despejar JSON ou IDs técnicos.

- **Conector:** essa chamada autenticada funcionou, ou conexão pendente. Isso não comprova outro cliente/dispositivo.
- **Memória:** acesso/registro só quando a operação correspondente foi exercitada; não consultar conversa real aleatória só para mostrar funcionamento.
- **WhatsApp:** `not_configured` é pendente; `configured_connection_not_checked` é credenciais salvas, sem prova de conexão atual. `last_received_at` é registro de evento anterior, não saúde atual/completude. `capture_started_at` não prova captura. Erro pode ser histórico; checklist `pending` não invalida teste comprovado.
- **Envios:** pausados/habilitados conforme diagnóstico. Habilitado não é autorização de uma mensagem; aceito não é entregue/lido.
- **Skills:** apenas as realmente selecionáveis/carregadas. Arquivo/ZIP exportado não comprova instalação.

Não chamar o conjunto de “instalação completa” sem os testes reais previstos no guia de instalação. Sem Z-API, dizer “WhatsApp pendente; podemos começar com memória manual” quando essa capacidade estiver disponível. Oferecer conectar mais tarde.

## 3. Escolha uma situação e conduza um passo por vez

Pergunte: **“Quer preparar uma reunião, registrar o que ficou combinado ou descobrir quem precisa de retorno?”** Se a pessoa já indicou a situação, aproveite a escolha. Se só quer entender, entregue os exemplos e encerre sem tools adicionais. Não transformar apresentação em sincronização de agenda.

- **Preparar reunião:** pedir contato reconhecível e autorização para consultar o contexto pertinente; desambiguar homônimos. Consultar memória/tarefas disponíveis, destacar fatos, pendências e dúvidas; declarar lacunas. Sem histórico, oferecer exemplo fictício ou registrar notas autorizadas.
- **Registrar reunião:** usar `pos-reuniao` com contato, data/fuso, notas e referência estável da origem. No primeiro ensaio, recomendar exemplo fictício: mostrar alias exclusivo de demonstração, notas e tarefa exatas a gravar e **obter autorização antes de `contact_create` ou qualquer escrita**. Não adicionar telefone/endereço real a esse contato. Gravar o lote pelo contrato da Skill, preservar referências e reler para mostrar o combinado. Se faltar tool/Skill, explicar a pendência sem inventar resultado.
- **Revisar retornos:** usar `revisao-diaria` somente com o recorte autorizado, paginação, cobertura e lacunas; falta de mensagens não significa ausência de pendências. Não importar agenda nem enviar retornos como efeito da apresentação.

No ensaio fictício, o valor perceptível é: **registrar → perguntar de novo → ver o combinado recuperado**. Dados fictícios também ficam no banco real da instalação. Ao terminar, oferecer limpeza separada e obter autorização para excluir; não apagar material real nem executar `contact_delete` silenciosamente. Interrupção: guardar a referência da origem para retomar sem duplicação.

Pedido de mapear agenda segue consentimento e paginação de `SKILL.md`. Pedido de envio segue `approve`, com destinatário/texto exatos e autorização pontual; pedido exato já basta e texto elaborado pela IA precisa de uma aprovação. Apresentação pulada não bloqueia uso interativo. Não agendar rotina automaticamente.

## 4. Feche com três pedidos prontos

Diga onde escrever: **no Claude/ChatGPT com o conector Elo habilitado nesta conversa**. Ofereça:

1. “Consulte no Elo a memória e as tarefas de [contato] e prepare minha pauta de reunião. Mostre o que falta saber.”
2. “Use pós-reunião para registrar no Elo estas anotações de [contato], da reunião de [data]: [notas].”
3. “Use revisão diária para mostrar quem precisa de retorno nas minhas conversas disponíveis. Diga qual período conseguiu avaliar.”

Indique qual Skill foi usada no ensaio e como pedir ajuda: **“Use configurar-elo e me mostre como usar o Elo”** ou **“não achei; me guie uma etapa por vez”**. Resuma resultado, pendência e próxima ação, sem prometer automação futura.

### Se perguntar por planilha ou Projetos

Continue a análise de arquivos no fluxo habitual do cliente de IA, com permissão e minimização dos dados. O Elo não ingere, sincroniza, versiona ou envia essa planilha. Se a pessoa quiser, mostre uma proposta concisa de combinados/próximos passos para o contato e só registre o material autorizado. Não importar a planilha inteira para “testar a integração”. Exclusão no Elo não apaga arquivo/chat do cliente, nem o contrário.

### Ensaios de comportamento

| Cenário | Resultado exigido |
|---|---|
| “Instalei, não sei o que ganhei”; sem WhatsApp, sem autorização de escrita | `installation_status`, explicação e opções. Zero sync/escrita. Sem abrir setup automaticamente. |
| “Mostre como usar, não importe agenda”; credenciais salvas | Orientação e pedidos prontos. Não afirmar conexão atual, importar agenda ou gravar demo. |
| Quer demo de reunião mas ainda não autorizou gravação | Mostrar o que será gravado e aguardar. Não criar contato/tarefa antes da autorização. |
| Agenda autorizada, cota na 2ª página | Parar; informar 1 página concluída, dados anteriores persistidos, mapa parcial e retomada. Não retryar, inventar nome ou enviar. |
| Quer pular apresentação | Respeitar; entregar pedido para retomar, sem configurar ou gravar por efeito colateral. |
