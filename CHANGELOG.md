# Changelog

Mudanças relevantes no formato Keep a Changelog.

## [Unreleased]

## [0.4.1] - 2026-10-30

### Fixed
- Sincronização da agenda usa consultas por endereço indexado e materialização limitada à página, evitando milhões de leituras por chamada em agendas com pares telefone/LID.
- Resultado e cursor do último avanço são persistidos na mesma transação; resposta perdida e repetição do cursor recuperam o resultado confirmado sem repetir página, cota ou reconciliação.
- Reconciliação de identidades verifica a execução ativa; índices limitam leituras de LIDs pendentes, ações e tarefas ao contexto relevante.

### Security
- Atualizadas dependências transitivas de produção body-parser para 2.4.0 e fast-uri para 3.1.9, sem mudar a versão do SDK MCP.

## [0.4.0] - 2026-10-24

### Added
- Pedido de envio autoriza a IA a redigir e enviar direto; prévia/revisão passa a ser uma escolha explícita do dono por ação.
- MCP exige intent de envio ou prévia, anuncia a versão do produto e informa o próximo passo canônico da ação.

### Fixed
- Correlação privada LID/telefone com prova explícita, recuperação do histórico legado, nomes da agenda, paginação por execução e preservação de homônimos/aliases manuais (#33).
- Deduplicação do preparo e do envio, inclusive corridas de aceite, prova de identidade, exclusão e resultados incertos (#33).
- Prévia persistida não pode ser rebaixada por repetição; aprovação de uma ação não vale para outra; ações legadas pendentes são revogadas sem repetir tentativas incertas.


## [0.3.0] - 2026-10-22

### Added
- Instalação assistida com pedido curto, escolhas explicadas e guia visual da Z-API capturado no painel autenticado, sem valores privados.
- Apresentação opcional “Vamos usar seu Elo” e primeiro uso guiado em `configurar-elo`, com consentimento separado para agenda/demonstração e instruções de retomada.
- Ajuda contextual nos campos Z-API e distinção entre credenciais salvas, recebimento observado e permissão para enviar na tela de configuração.
- Agenda WhatsApp paginada via Z-API e busca de contatos sem mensagens anteriores, com nome restrito ao backend e IDs/aliases no MCP.
- Skill `configurar-elo` e atualização de `approve` para mapear contatos antes de preparar mensagens.
- Bloqueio privado de recadastro após exclusão, validação do aparelho e proteção contra troca concorrente de conexão.
- Série de histórias de uso gravadas no ChatGPT, com narração neural em português e legendas: agenda, busca sem histórico, memória, prazos/datas, revisão diária, pauta/rotina, cancelamento e envio WhatsApp aprovado; apresentação geral e proveniência das capturas.

## [0.2.0] - 2026-10-18

### Added
- Extração por blocos do mesmo contato: até 20 mensagens/12 mil caracteres, preservando fonte e autoria; cota padrão de200 chamadas/dia configurável.
- Proveniência contextual por versão e alertas de revisão para memórias/tarefas após edição de mensagem usada no bloco.

### Fixed
- Reserva e gravação do bloco inteiras ou nenhuma; subdivisão de respostas incompletas e preservação das tentativas das mensagens vizinhas.


## [0.1.0] - 2026-10-17

### Added
- Backend individual Workers/D1, MCP OAuth com login Cloudflare Access, instalação protegida e adaptador Z-API sem dependência de instância no provisionamento.
- Envios de texto individuais vinculados à aprovação no chat, consumo atômico, cancelamento e resultado incerto sem retry cego.
- Memória com fontes/conflitos, tarefas/datas, revisão paginada de versões e retenção de histórico até 30 dias.
- Extração generativa limitada com DeepSeek configurável, Skills, procedimentos de instalação/recuperação e testes sintéticos.

### Security
- Projeções explícitas, destinatários restritos, callback autenticado separadamente, isolamento por instalação, fencing de fontes e revogação por epoch externo ao banco.

### Fixed
- Compatibilidade de extração DeepSeek com template sem raciocínio e schema explícito, verificada no serviço real.
- Leitura de configuração JSONC e conferência da versão ativa após recuperação.
- Requisições Access/Z-API usam redirect manual compatível com workerd e recusam 3xx; testes constroem Request real para evitar falso verde dos mocks.
- Login Access OTP aceita email_verified ausente no ID token, recusando valores presentes diferentes de true; instalador exige allowed_idps exclusivo do provedor OTP.
- Formulários de consentimento/configuração preservam Origin nativo via strict-origin, sem divulgar query no Referer e sem aceitar Origin null.
- CSP de consentimento permite o retorno apenas à origem validada daquele cliente, recusando wildcard/delimitadores; erros assíncronos do handler passam pela recusa segura.

- Revisão diária usa índices de período e edições pendentes, com regressão de custo e ensaio em D1 real isolada.
- Preenchimento tardio de texto, cobertura de revisão concorrente e limpeza de ações vencidas na recuperação.

### Notes
- Primeira minor aceita pelo dono para uso diário. Issues #1–#4 encerradas por aceite operacional.
- Agendamento aceito pelo dono sem exigir nova homologação; resultado automático isolado não foi comprovado. Uso manual das Skills e recepção/envio individual aprovado foram exercitados.
- Áudio, anexos e envio em lote continuam fora da V0.
