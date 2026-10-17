# Elo V0 — entregas e rastreabilidade

PRD de referência: [v1.0](../prd/elo-v1.md). Produto fechado para planejamento; implementação ainda não iniciada. As issues seguem o padrão `harness-issues` do Pi, com escopo, critérios observáveis, não-objetivos, caminhos sensíveis e evidência de verificação.

## Issues publicadas

| Entrega | Resultado | Depende de | Requisitos sob responsabilidade |
|---|---|---|---|
| [E1 / #1](https://github.com/orobsonn/elo/issues/1) | Instalar a base individual e consultar conversas WhatsApp por IDs internos | — | R01, R02, R03, R04, R05, R07, R08, R11, R12, R13, R14, R15, R16, R17, R18, R19, R20, R41, R44, R47 |
| [E2 / #2](https://github.com/orobsonn/elo/issues/2) | Preparar e enviar texto WhatsApp após approve pela Skill no chat | #1 | R31, R32, R33, R34, R35, R36, R38, R40 |
| [E3 / #3](https://github.com/orobsonn/elo/issues/3) | Consolidar memória e pendências a partir do histórico de até 30 dias | #1 | R21, R22, R23, R24, R25, R26, R27, R28, R29, R30, R45, R49 |
| [E4 / #4](https://github.com/orobsonn/elo/issues/4) | Entregar Skills e concluir instalação guiada em Claude e ChatGPT | #1, #2, #3 | R06, R09, R10, R42, R43, R46, R48, R50, R51 |

**49 requisitos da V0 cobertos.** R37 (anexos) e R39 (approve em conjunto) ficam posteriores, sem issues de implementação nesta versão.

Dependências são declaradas em blocos `harness-deps` e nas relações nativas de bloqueio do GitHub, conforme o parser vendorizado do Pi. Issues sem dependência declaram `Nenhuma.`. A criação não habilita fila automática.

## Ordem e limites

1. E1 entrega base individual, segurança e captura/consulta. É intermediária: não declara instalação completa nem expurgo ativo finalizados. A consulta já aplica o corte temporal.
2. E2 entrega envio individual aprovado no chat. E3 entrega extração, memória e retenção ativa; ambas dependem de E1 e podem ter partes independentes planejadas em paralelo.
3. E4 fecha Skills, agendamento dos clientes, atualização/recuperação e instalação integrada. O teste com pessoa leiga é aceite humano, não algo a simular.

Referências cruzadas não criam ciclos: capacidades base são verificadas com fixtures/contratos delimitados; a prova ponta a ponta fica em E4. Critério material pendente continua visível na issue correspondente. Não fechar como pronto só porque código ou mocks passam.

## Execução na próxima sessão

Use [o prompt de início do goal](../prompts/implementar-elo-v0.md). Ele aplica os princípios de qualidade do harness sem iniciar sua cerimônia, por instrução explícita de Robson. Não foram criados selos, estado de pipeline, fila automática ou goal de implementação nesta etapa.

As [cópias locais dos corpos das issues](issues/) preservam o handoff inicial; consultar a issue viva antes de implementar. O [manifesto](manifesto.json) guarda IDs, links e mapeamento mecânico. Repositório: https://github.com/orobsonn/elo.

## Revisão de fechamento

Revisão adversarial independente Sol/medium não encontrou decisão de produto bloqueante, omissão de requisito V0 ou ciclo. Foram incorporados limites de approve no chat, remoção ativa do histórico de 30 dias, extração backend sem duplicar Skills, DeepSeek com exigência Paid/créditos e configuração inicial orientada no computador. Qualidade do DeepSeek, autenticação, concorrência, carga e integrações reais permanecem aceites de implementação; não são garantias dadas pelo PRD.
