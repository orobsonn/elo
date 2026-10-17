# Elo

Memória de relacionamento e WhatsApp na IA que o consultor já usa, por MCP e Skills, com infraestrutura individual Cloudflare.

**Estado:** PRD v1.0 fechado, quatro issues organizadas; aplicação ainda não implementada. O uso diário acontece em Claude/ChatGPT. A única tela própria prevista configura Z-API e fornece o webhook.

## Comece aqui

- [PRD v1.0](docs/prd/elo-v1.md): requisitos, decisões, limites e aceites da V0.
- [Quatro entregas e dependências](docs/entregas/elo-v0.md): rastreabilidade dos 49 requisitos da V0.
- [Prompt para iniciar o goal de implementação](docs/prompts/implementar-elo-v0.md): nova sessão, qualidade do Pi Harness sem sua cerimônia.
- [Issues no GitHub](https://github.com/orobsonn/elo/issues): escopo, aceites, riscos e verificação por entrega.

## Recorte da V0

- WhatsApp individual: captura/consulta de mensagens e envio de texto após approve pela Skill no chat.
- IDs e aliases para contatos; endereço de envio restrito ao backend. Texto da conversa pode conter dados pessoais; não há promessa de anonimização universal.
- Histórico bruto ativo até 30 dias, memória concisa, datas e informação pendente para avaliar.
- Extração auxiliar generativa no backend; DeepSeek V4 Flash como escolha inicial, schema/validação local e sem Clef obrigatório. Modelo exige Paid/créditos e ainda será validado no Elo.
- Rotinas em Skills no harness da pessoa, cron no Work/Cowork. **Otimize meu processo** entrevista, avalia recursos reais, cria/adapta uma Skill e testa junto com o consultor.
- Instalação guiada fácil, atualização, recuperação e diagnóstico. Sem grupos, anexos, CRM/dashboard ou agendador próprio de agentes.

## Evidência e contexto

[Experimento generativo × Clef](docs/experimentos/memoria-30dias/RELATORIO.md), [referências de código](docs/pesquisa/referencias.md), [WhatsApp e clientes](docs/pesquisa/whatsapp-clientes.md), [Cloudflare](docs/pesquisa/instalacao-cloudflare.md), [método](docs/pesquisa/metodo.md) e [fontes públicas](FONTES.md).

O experimento sintético usou Llama 3.3/Qwen e Clef; não testou DeepSeek ou Scout. Relatórios históricos e [rascunhos de telas arquivados](docs/pesquisa/adiados/README.md) não prevalecem sobre o PRD. Nenhum mock foi aprovado. [BRIEF.md](BRIEF.md) e [CONTEXT.md](CONTEXT.md) preservam contexto histórico.

## Desenvolvimento

Harness Pi vendorizado em `.pi/`, solicitado para este projeto. Leia [AGENTS.md](AGENTS.md). Ainda não há comandos de build/teste da aplicação; serão adicionados durante a implementação.

Transcrições, apresentações, credenciais e estado local não são publicados. O corpus de experimento é sintético. `fontes/privadas/` permanece local e ignorado pelo Git. Este repositório público não inclui dados reais de clientes.
