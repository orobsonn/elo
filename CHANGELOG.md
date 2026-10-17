# Changelog

Mudanças relevantes no formato Keep a Changelog. Sem release/tag publicada; versão 0.0.0 identifica desenvolvimento pré-release.

## [Unreleased]

### Added
- Backend individual Workers/D1, MCP OAuth com login Cloudflare Access, instalação protegida e adaptador Z-API sem dependência de instância no provisionamento.
- Envios de texto individuais vinculados à aprovação no chat, consumo atômico, cancelamento e resultado incerto sem retry cego.
- Memória com fontes/conflitos, tarefas/datas, revisão paginada de versões e retenção de histórico até 30 dias.
- Extração generativa limitada com DeepSeek configurável, Skills, procedimentos de instalação/recuperação e testes sintéticos.

### Security
- Projeções explícitas, destinatários restritos, callback autenticado separadamente, isolamento por instalação, fencing de fontes e revogação por epoch externo ao banco.
