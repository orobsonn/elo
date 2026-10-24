# Envio por pedido — v0.4.0

Decisão vigente do dono: pediu para enviar, a IA redige e envia direto no assunto e destinatário solicitados. Só aguarda aprovação quando o dono pede prévia. Rascunho sem pedido de envio, mensagens recebidas e execução agendada não autorizam envio. Não há permissão permanente ou agente proativo.

## Plano e implementação

1. Reproduzir em D1 a política antiga e a ausência de intent explícito, mantendo os testes de identidade, expiração, pausa e resultado incerto.
2. Persistir a escolha por ação e aplicar consumo atômico: `intent=send_now` prepara `prepared`; `intent=preview` prepara `awaiting_approval`. Intent é obrigatório na API, sem pergunta humana adicional. Omissão falha fechada para clientes com catálogo antigo.
3. Prévia exige `review_confirmed:true` na mesma ação/hash após a revisão solicitada. O campo é declaração do cliente, não prova humana. Repetição de preparo não pode rebaixar prévia. Promover uma ação pronta para prévia troca o hash e invalida a referência direta anterior.
4. Deduplicação exclui a escolha de revisão da chave canônica, inclui `prepared` no índice e compartilha uma única ação entre preparos concorrentes. Ações em execução/incertas bloqueiam novo preparo para o contato, inclusive texto reescrito; o retorno manda consultar a tentativa anterior.
5. Alinhar backend, inicialização e catálogo MCP, Skills, PRD, guias e plugin. Testar ferramentas MCP reais com provedor sintético; publicar release minor, sem alegar validação do WhatsApp real.

## Migração e compatibilidade

A migration 0010 adiciona `review_required` com padrão restritivo para registros legados, cancela pendências antigas com evento de auditoria, preserva `executing/uncertain` e amplia o índice de deduplicação. Não reaproveitar autorização antiga após restauração, expiração ou troca de conexão/identidade. Migration 0009 da release também é necessária para instalações anteriores ao PR #33.

Atualizar apenas o código ou apenas a Skill não conclui a atualização. O cliente deve redescobrir `action_prepare` com o campo `intent`, `action_execute` com `review_confirmed` opcional e ler `next_step`. MCP anuncia a versão do package. Preservar destinatário e texto canônicos: se a IA recebeu texto exato do dono, não editar.

## Revisão adversarial e testes

Revisão de desenho independente exigiu intent explícito, deduplicação sem o modo na chave e política monotônica de prévia. Os testes vermelhos reproduziram a regra anterior, ausência de persistência de prévia, versão MCP incorreta e cópia incerta com texto reescrito. Regressões cobrem envio direto, prévia, aprovação única, downgrade, corrida entre envio/prévia, alteração de hash, replay, migração e fronteira SDK MCP.

Não se promete prova criptográfica de autoria humana ou imunidade a injection. A Skill interpreta o pedido do dono; o servidor valida estado, política declarada, vínculo, validade e consumo. Cliente autenticado malicioso pode declarar uma intenção falsa: a nova flag não é uma segunda autenticação.

## Distribuição e ativação

- Elo: release minor **v0.4.0**, incluindo correções de identidade do PR #33 e esta política de envio.
- Plugin pessoal inspecionado: overlay **1.1.0**, preservando App, apresentação, conexão e demais Skills. A versão local 1.0.5 anterior nunca foi publicada. O overlay é específico dessa identidade e não deve ser instalado como configuração do Alan.
- Publicar Skills genéricas com a release para atualização em outras instalações. Cada instalação preserva sua conta, bindings, secrets e conexão.
- Antes do upgrade: conferir destino/backup e pausar envios. Aplicar migrations 0009/0010 conforme pendências, publicar versão validada e atualizar Skills/catálogo. Conferir saúde/autenticação, buscar contato por nome e verificar histórico antes de envio controlado expressamente autorizado.
- O Elo pessoal do mantenedor está sem Z-API por decisão do dono; isso não invalida os testes sintéticos, mas não permite alegar envio real, reprodução no Alan ou atualização do ambiente dele.

## Reversão

Rollback de Worker não reverte D1. A atualização invalida pendências antigas e mantém tentativas incertas bloqueadas. A volta ao código anterior exige analisar a semântica de estados e política persistida; não reativar ações canceladas. Recuperação de dados usa backup/bookmark e o procedimento de manutenção/epoch do projeto.

## Evidência antes da publicação

- 229 testes da aplicação (15 arquivos) e 24 testes do instalador/recuperação passaram; TypeScript e build seco passaram.
- Ensaio independente da Skill com 13 situações sintéticas: envio solicitado, prévia, rascunho, homônimos, conteúdo recebido hostil, mudança material, expiração e resultado incerto. Não equivale a teste no cliente real.
- Revisão independente do código final confirmou consumo único, prévia monotônica, invalidação de vínculos e bloqueio de cópias incertas. Exigiu corrigir o documento técnico ativo e concluir o bump da versão na PR dedicada de release antes de tag/deploy.
