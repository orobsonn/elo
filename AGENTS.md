# Elo

Leia `docs/prd/elo-v1.md` e `docs/entregas/elo-v0.md` antes de alterar produto.
O PRD é a base de escopo; documentos de pesquisa antigos preservam hipóteses substituídas.

## Harness

O harness solicitado para este projeto é o Pi, vendorizado em `.pi/`.
Não instalar outro harness ou substituir esse diretório como parte da aplicação.
Leia os contratos de entrega e governança em `.pi/harness/skills/`.

Robson autorizou implementar por goal em outra sessão **sem a cerimônia do harness**.
Preservar plano curto, testes de comportamento, revisão adversarial de pontos críticos,
verificação no código final e evidências, sem criar selos, estados ou recibos fictícios.
Isso não desativa autenticação, proteção de segredos ou limites operacionais.

## Escopo e privacidade

- Instalação individual Cloudflare; MCP para Claude e ChatGPT; sem SaaS central.
- Envios V0: texto individual, com approve pela Skill no chat. Sem grupos/anexos.
- Telefone/JID/LID e identificadores de entrega ficam restritos ao backend.
- Texto de conversas pode conter dados pessoais; não anunciar anonimização universal.
- Fatos claros podem entrar automaticamente; conflitos e dúvidas ficam pendentes.
- Histórico bruto ativo até 30 dias; memória concisa e pendências têm vida distinta.
- Rotinas do consultor são Skills; seus agendamentos são do Work/Cowork.
- Única tela própria prevista: configuração simples de Z-API/webhook.
- Nunca versionar `fontes/privadas/`, credenciais, mensagens reais ou estado de sessões.

## Entrega

Leia cada issue viva, confira dependências e inspecione o estado real do código.
Reutilize utilitários somente após conferir licença/permissão e comportamento.
Não declarar compatibilidade, cron ou envio real testados com base apenas em mocks.
Não iniciar produção ou mandar WhatsApp a terceiros sem autorização específica.
Release é por marco significativo, não por micro-PR. Não publicar baseline de release
ou tag só para inicializar a documentação.
