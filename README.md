# Elo

Memória de relacionamento e WhatsApp assistido no Claude/ChatGPT, com infraestrutura individual Cloudflare.

[Comece pelo guia de primeiro uso](docs/operacao/primeiro-uso.md). Login padrão Cloudflare Access integrado ao OAuth MCP. A configuração Z-API é a única tela própria; uso diário e approve individual acontecem no chat.

**Instalação pessoal:** [abrir Elo](https://elo.robsonlins.workers.dev) · MCP: `https://elo.robsonlins.workers.dev/mcp`. [Evidências da publicação](docs/implementacao/validacao-publicada.md).

**Já conectado?** [Use no dia a dia](docs/operacao/primeiro-uso.md#no-dia-a-dia): registrar reunião, consultar memória/tarefas, preparar pauta, revisar o dia e preparar mensagem para aprovação. As pendências de homologação não exigem refazer a instalação.

## V0

Na **v0.2.0**, a extração agrupa mensagens por contato e usa cota padrão de 200 chamadas por dia. [Funcionamento e testes](docs/implementacao/blocos-extracao-1810.md).

- MCP tipado com contatos por ID/alias, histórico paginado, memória rastreável, conflitos pendentes, tarefas, datas e revisão diária com cobertura de versões.
- Z-API: captura individual normalizada, callbacks com autenticação própria e texto aprovado com consumo atômico. Sem instância, indica `whatsapp_nao_configurado`; não simula envio.
- Histórico bruto até 30 dias da data original; expurgo técnico independente da IA. Memória concisa pode permanecer. Texto livre pode conter dados pessoais.
- Extração DeepSeek V4 Flash configurável na Workers AI, com limites de entrada/saída, três tentativas e orçamento diário. Plano Paid/créditos e demais custos são separados.
- [Skills](skills/): approve, revisão diária, pós-reunião e Otimize meu processo. Agendamento pertence a Work/Cowork. [Matriz de clientes e aceites humanos](docs/operacao/clientes-e-agendamento.md).

## Desenvolvimento

Node 22+; `npm ci`, `npm run test:all`, `npm run check`, `npm run build`. Os testes workerd usam D1 local, identidades sintéticas e respostas de provedores controladas. Não dependem de Z-API nem chamam inferência paga.

`npm run cf-typegen` atualiza tipos após alterações em Wrangler. Configuração pública em `wrangler.jsonc`; secrets em superfícies protegidas, nunca no chat/Git. [Autenticação](docs/implementacao/auth.md), [memória](docs/implementacao/memoria.md), [plano](docs/implementacao/plano.md) e [revisões](docs/implementacao/revisoes.md).

[Como recebemos mensagens e construímos memória](docs/implementacao/recebimento-e-memoria.md): fluxo do webhook à consulta, duplicatas, edições, extração, retenção e limites.

Publicação usa `wrangler versions upload`, smoke da saúde/binding no preview, promoção explícita e smoke publicado. Previews só permitem saúde: tools/configuração exigem origem canônica e autenticação. Recursos desta instalação pessoal não são compartilhados com outras instalações.

Primeira minor: **v0.1.0**, aceita pelo dono para uso diário. `CHANGELOG.md` registra a entrega. As issues #1–#4 foram encerradas por aceite operacional; limitações e recortes dos testes permanecem documentados, inclusive agendamento aceito sem prova isolada da execução automática. [PRD v1.1](docs/prd/elo-v1.md) é a base de produto; pesquisas antigas não alteram escopo.

Harness Pi preservado em `.pi/`. A autorização deste goal dispensa sua cerimônia e mantém testes, revisão e evidências. `fontes/privadas/`, credenciais, mensagens reais e sessões nunca são versionadas.

[Homologação no ChatGPT: testes, evidências e limites](docs/implementacao/homologacao-chatgpt.md).
