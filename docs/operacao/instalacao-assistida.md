# Instalar o Elo com a IA

Este é o roteiro canônico para a IA instaladora. A pessoa começa copiando [este pedido curto](../prompts/instalar-elo.md) para Claude Code ou outro assistente com terminal e navegador autorizados. No uso diário, conversa no Claude ou ChatGPT; não precisa de terminal.

## O resultado que a pessoa deve entender

“Você continua usando seu cliente de IA. O Elo guarda memória dos contatos e combinados na sua Cloudflare. Se você conectar o WhatsApp, poderá consultar as conversas capturadas e preparar retornos para aprovar. Ao final, vamos fazer um primeiro uso juntos.”

Não prometer bot no WhatsApp, histórico retroativo, agenda automática, análise de mídia ou documentos armazenados/sincronizados pelo Elo. Arquivos e chats continuam sujeitos ao cliente de IA usado; isso não significa processamento local no computador.

## Como conduzir sem transferir engenharia ao usuário

- Execute a parte técnica por ferramentas. Só peça login, consentimento, verificação, entrada protegida de credenciais, pareamento e decisões de gasto/escopo realmente necessárias.
- Uma intervenção por vez: **onde ir → o que fazer → efeito → como saber que terminou**. Diga que a pessoa pode responder “não achei” e receber o próximo passo, sem reiniciar.
- Antes de cada escolha humana, explique o objetivo, a recomendação, a alternativa e o impacto em dados/custos. Não peça à pessoa escolher OAuth, banco ou política de segurança.
- Aproveite autorizações já dadas. Pular WhatsApp ou apresentação é permitido; registre a pendência e retome depois.
- Nunca pedir senha, código OTP ou token no chat. A entrada e transferência protegidas não podem expor valores à transcrição, screenshots ou saída de terminal. Sem ferramenta segura, a pessoa preenche o campo específico.

### Escolhas que merecem explicação

| Escolha | Orientação simples | Consequência e alternativa |
|---|---|---|
| Conta de destino | Mostrar conta Cloudflare e e-mail do dono antes de criar recursos. | Dados e cobrança ficam nessa conta. Se estiver errada, interromper antes de escrever. |
| Cliente de uso | Começar no Claude ou ChatGPT já usado pela pessoa. | Confira recurso/plano na conta; testar um cliente não comprova o outro. |
| Extração de memória por IA | Consultar elegibilidade e preços atuais; recomendar limite conservador. | Tem custo próprio. Sem autorização de cobrança, deixar desativada e explicar que a extração automática fica pendente. Não trocar modelo em silêncio. |
| WhatsApp agora ou depois | Recomendar começar pela base se a pessoa ainda não tem Z-API. | Sem Z-API, memória manual funciona; captura e envio ficam pendentes. Não contratar por conta própria. |
| Captura | Explicar antes de ativar callbacks que conversas individuais novas podem ser armazenadas. | Pausar envios não pausa captura. Texto livre pode conter dados pessoais. |
| Mapear agenda | Explicar que serão lidos e guardados os contatos da agenda no backend. | Não é necessário para a apresentação nem para memória fictícia. Pode pular. |
| Primeiro uso de demonstração | Recomendar exemplo fictício, mostrando o que será gravado. | Escreve no banco da instalação; pedir autorização e oferecer limpeza separada. |

Estas orientações tratam escolhas previsíveis; o primeiro bloqueio do beta não identificou a opção exata. Não inventar sua causa.

## Etapas que a IA executa

### 1. Preparar

1. Clone `https://github.com/orobsonn/elo` em pasta nova ou retome sem apagar alterações. Se o acesso for restrito, conduza o login GitHub da pessoa. **Antes de disponibilizar credenciais**, fixe uma release/tag ou commit revisado fornecido pelo mantenedor; confirme que contém este roteiro e a apresentação, registre/verifique o SHA e a árvore limpa. `main` móvel e o nome de uma tag sozinhos não comprovam revisão. Sem referência revisada, explique a pendência antes de executar código com poderes de infraestrutura. Não baixar/executar scripts remotos adicionais como atalho.
2. Leia `AGENTS.md`, `README.md`, `docs/prd/elo-v1.md`, `docs/entregas/elo-v0.md` e este guia. Documentos antigos de planejamento não são evidência do comportamento atual. Preserve `.pi/`.
3. Verifique Node 22+, rode `npm ci`, `npm run test:all`, `npm run check` e `npm run build`. Testes usam provedores controlados; não comprovam conexão real.
4. Inspecione configurações e scripts antes de executar. O `wrangler.jsonc` versionado e defaults de scripts pertencem à instalação do mantenedor: **nunca publique ou migre nesses alvos por padrão**.

### 2. Confirmar destino e provisionar

1. Autentique a conta do próprio dono. Confira conta/nome esperado e perfil de `/user`; mostre a identidade para confirmação **antes de qualquer mutação**. O provisionador usa o e-mail desse perfil como `OWNER_EMAIL`: token do suporte pode cadastrar o dono errado.
2. Consulte planos/custos atuais em fontes oficiais e a conta: cliente de IA, Cloudflare/Workers/D1/Access, Workers AI e Z-API são separados. Não assumir Free, teto total ou compra autorizada. Configure `AI_ENABLED=false` enquanto a ativação paga não estiver autorizada.
3. Escolha Worker `elo` ou `elo-<sufixo>` após conferir colisões; crie D1 e KV exclusivos ou valide recursos já pertencentes a esta instalação. Preserve bindings `DB`, `OAUTH_KV`, `AI` e `VERSION`, mas troque conta, IDs, nomes, origem, parâmetros Access e limites pelos do destino. Não apagar nem recriar ao retomar.
4. Aplique todas as migrações ao **D1 do destino**. Se um Worker ainda não existir, publique `scripts/bootstrap-worker.ts` com configuração mínima isolada. Ele só expõe saúde; nunca usar esse bootstrap em Worker existente.
5. Use HTTPS canônico próprio. Não exigir compra de domínio quando `workers.dev` atender. Prévia não é origem canônica.

### 3. Configurar Access/OAuth

Leia [o contrato do provisionador](../implementacao/auth.md) e `scripts/provision-access.mjs`. Login Wrangler sozinho não fornece as permissões do script.

- Se faltam organização Zero Trust ou provedor OTP, conduza sua criação no fluxo suportado da conta; a pessoa só faz os passos humanos inevitáveis. Não alterar IdPs/políticas globais existentes.
- A aplicação Elo deve permitir exclusivamente o OTP escolhido e o e-mail do dono. Não usar bypass, senha fixa, service-token headers ou só gate HTML.
- Disponibilize token temporário de API do **dono**, restrito à conta e às permissões mínimas para perfil `/user`, conta, organização/IdPs, aplicações Access e secrets do Worker; provisionamento de D1/KV/Worker exige as permissões correspondentes. Valores entram em ambiente protegido, sem imprimir ou passar em argumentos/histórico de comandos. Após provisionamento, revogue o token temporário se não houver necessidade explicitamente autorizada de manutenção. Não revogar tokens compartilhados de outras integrações.
- Configure `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ELO_EXPECTED_ACCOUNT_NAME`, `ELO_PUBLIC_ORIGIN`, `ELO_WORKER_NAME` e `ELO_WRANGLER_PATH`. Execute `node scripts/provision-access.mjs` após conferir o alvo. O script gera bindings e secrets; não pedir que a pessoa crie chaves manualmente.
- Preserve o estado privado padrão em `~/.local/state/elo/<conta>-<worker>/` (diretório 0700, arquivo 0600) ou `ELO_PRIVATE_STATE_DIRECTORY` protegido. `access-private.json` contém segredo recuperável: não imprimir, versionar ou anexar. Falta de estado não autoriza sobrescrever chave/epoch nem recriar Access.

### 4. Publicar e conectar o cliente

1. Registre commit e config de destino. Use `wrangler versions upload`, teste saúde e bloqueio de rotas protegidas no preview, promova a versão verificada e confira a versão ativa.
2. Na origem canônica, execute `node scripts/smoke.mjs https://ORIGEM-DESTA-INSTALACAO` com a URL real resolvida pela IA. O argumento é obrigatório neste roteiro: o default do script é do mantenedor. Smoke completo não serve para preview restrito a saúde.
3. Faça o dono passar pelo login Access/consentimento do cliente escolhido. Conecte `ORIGEM/mcp` como MCP remoto pelo mecanismo realmente disponível na conta; falta de plano/permissão é pendência concreta, não motivo para bypass.
4. Instale as **cinco** pastas de `skills/`: `configurar-elo`, `approve`, `pos-reuniao`, `revisao-diaria`, `otimize-meu-processo`. Empacote/adapte ao cliente e confira seleção/carregamento. Baixar ZIP não comprova instalação persistente. Consulte [clientes e agendamento](clientes-e-agendamento.md) para limites e provas anteriores.
5. Teste autenticação real, descoberta e leitura/escrita fictícias autorizadas. Verifique renovação/revogação em escopo controlado com recuperação combinada. Mocks, celular e outro cliente são provas distintas.

### 5. WhatsApp opcional

Use o [guia visual Z-API](zapi.md). Não compre instância. Antes de callbacks, obtenha autorização para captura; antes de mapear, autorização distinta para armazenar agenda. A pessoa preenche credenciais em `ORIGEM/setup` e faz pareamento. A IA configura campos por transferência protegida quando disponível; caso contrário, a pessoa copia diretamente entre painéis. URL privada de webhook nunca vai ao chat ou screenshots.

Receba um texto fictício de contato controlado e consulte a fonte por ID interno. Teste de envio exige destinatário/texto exatos, autorização pontual do dono: pedido de envio permite à IA redigir e enviar; só aguarda aprovação se o dono pedir prévia e consulta da mesma ação. Resultado incerto não repete. `accepted` não comprova entrega. Sem grupos/anexos na V0.

### 6. Terminar ensinando a usar

**Não encerrar no deploy.** Convide: “Sua base está configurada. Quer que eu mostre em um minuto o que você ganhou e faça um primeiro uso com você? Pode pular e voltar depois.”

Acione `configurar-elo` no cliente de uso e siga a [apresentação e primeiro uso](../../skills/configurar-elo/references/primeiro-uso.md). Se a IA instaladora não consegue abrir esse cliente, entregue o pedido “Use configurar-elo e me mostre como usar o Elo”, marque a demonstração pendente e não simule sua execução. O usuário escolhe uma situação; a IA conduz uma etapa por vez. Ao final, entregue três pedidos prontos e onde escrevê-los.

## Fechamento e retomada

Informe separadamente: **base publicada**, **cliente conectado**, **Skills selecionáveis**, **WhatsApp validado** e **primeiro uso realizado/pulado**. Diga a evidência e a pendência de cada etapa.

- Sem Z-API: “base e cliente funcionando; WhatsApp pendente”, quando esses itens foram exercitados.
- Dados salvos não comprovam saúde atual. `capture_started_at` é corte temporal do banco, não prova de captura. Um `last_received_at` prova evento anterior, não cobertura completa nem conexão corrente.
- Instalação completa exige autenticação, Skills, recebimento real autorizado persistido, consulta por ID interno, envio aprovado controlado e resultado consultado. A apresentação é um marco de adoção separado.
- Guarde versão, recursos, etapas e retomada em registro privado sem mensagens/credenciais; não publicar configurações pessoais. Atualização/recuperação: [procedimento existente](recuperacao.md).
- Agenda automática só após pedido com rotina, horário/fuso e prova de execução real no cliente. Não construir scheduler no backend.
