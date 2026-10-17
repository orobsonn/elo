# Execução V0 — PRD 1.1

Base observada: 78a9b9c. Branch codex/elo-v0; nenhuma implementação prévia.
Autorização: docs/prompts/implementar-elo-v0.md, goal existente. Sem selos ou cerimônia Pi.

1. E1: Workers + D1 por instalação, Access OIDC + OAuth MCP, captura normalizada e consultas projetadas. Vermelho: capture.test.ts e auth.test.ts; verde no workerd com D1 real local. Risco: política/identidade. Não tocar outras aplicações Access. Recursos nomeados Elo. Origem canônica fecha previews para dados; preview verifica saúde/bindings.
2. E2: intenção imutável de 10 min, hash do texto, endereço/alias/versão e geração remetente; CAS D1 antes de chamada REST. Vermelho: actions.test.ts, inclusive duas execuções simultâneas. Timeout sem ID permanece incerto; nenhum retry automático nem associação por texto/horário.
3. E3: fontes versionadas, memória canônica concisa, conflitos pendentes, jobs com lease/fencing/orçamento diário, retenção por data original. Testes de memória/extração/expurgo independentes do modelo live; pequena validação DeepSeek publicada com corpus sintético.
4. E4: Skills e guia único; configuração Access pelo assistente/script, Z-API por tela protegida; operação/recuperação/exportação/exclusão. Revisão final independente, CI, PR, merge autorizado quando checks verdes, publicação versionada e smokes.

Engenharia: SDK MCP oficial stateless HTTP JSON e biblioteca OAuth oficial MIT; jose MIT; Zod MIT. Sem fork de outros projetos. Recursos da instalação não são compartilhados com alunos. Webhook usa capability forte dedicada em URL como compensação por ausência de assinatura documentada; invocation logs desligados, nunca retornar capability no MCP. Credenciais cifradas AES-GCM com chave fora do D1.

Revisão adversarial Astra/high do desenho: refresh não ultrapassa authUntil upstream, dono pré-autorizado pelo controle Cloudflare e vinculado por issuer+sub validado, CAS inclui versões/pausa/epoch, timeout sem ID não concilia por semelhança, tombstones e fencing para replay/exclusão/edição, gate externo ao backup durante restore, campos de memória canônicos e custo total diário limitado. Revisão do código final deve comprovar essas proteções.

Rollback: reverter Worker para versão validada anterior. Migração inicial aditiva; rollback Worker não reverte D1. Restore exige manutenção externa ao backup e rotação de AUTH_EPOCH antes de reabrir; sem excluir dados de produção para consertar deploy.
