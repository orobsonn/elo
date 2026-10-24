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

## Publicação e ativação observadas em 24/10/2026

- PRs #34 e #35 integradas com CI verde; tag/release latest v0.4.0 aponta para `80c57780ccc6ed14498867086cd0768d8ab77582`. A release inclui ZIP de Skills genéricas, sem bindings pessoais.
- Na instalação pessoal autorizada, backup/bookmark de D1 foi conferido e migrations 0009/0010 aplicadas. Nenhuma migration ficou pendente. Envios já estavam pausados (`sends_paused=1`) e permaneceram pausados; Z-API não foi reconectada.
- Worker `223af324-2d01-4465-b216-ffc6c29cbf16` passou quatro verificações de preview (saúde/D1, commit e versão exatos, MCP negado fora da origem oficial), foi promovido a 100% e passou seis smokes de produção: home, saúde/D1, MCP sem autenticação, bearer inválido, webhook protegido e descoberta OAuth/PKCE. Nenhum envio real pelo Elo integrou esses testes.
- Plugin pessoal **1.1.0**, release `pluginrel_6adcbda83c748191881cc115cfec0912`, publicado por atualização guardada. Releitura confirmou Skills e referência idênticas ao repositório; App binding e quatro Skills retidas permaneceram byte a byte iguais. Apresentação e conexão foram preservadas.
- O catálogo carregado nesta conversa ainda era antigo. Uma chamada de diagnóstico autenticada devolveu `UNAUTHORIZED`, solicitando reautenticação da conexão. Publicação do plugin e do backend não prova recarga do cliente: é necessário reconectar Elo e redescobrir ferramentas numa sessão nova. O schema novo rejeita omissão de intent.
- A instalação do Alan não foi acessada ou atualizada por esta entrega. Busca pelo nome com histórico correto, prova privada LID/telefone, agenda completa e teste controlado de envio ainda precisam ser observados lá. O teste sintético não estabelece a causa do incidente dele.
