# Método e limites do levantamento

Data de referência: 16/10/2026, America/Fortaleza, conforme contexto do operador. Artefatos de pesquisa, sem implementação ou criação de issues.

## Autorização e método

Robson autorizou iniciar o goal e usar um comitê para evoluir requisitos sem entrevista contínua. A skill `harness-grill` foi lida em `.pi/harness/skills/harness-grill/SKILL.md`. A execução é uma adaptação expressamente solicitada do método, não uma entrevista interativa concluída. Respostas não fornecidas pelo operador não foram fabricadas. O PRD permanece em rascunho e não sela aprovação de arquitetura, plano ou entrega.

Três rodadas com finalidade concreta, sem prolongar um loop sem ganho:

1. Inventário do briefing/fontes e pesquisa paralela de código, provedor/clientes e instalação.
2. Síntese pelo orquestrador em requisitos observáveis, decisões explícitas, suposições e perguntas de produto; revisão independente adversarial.
3. Conciliação de achados, correções no rascunho e conferência documental. Provas que exigem implementar, credenciais ou contas reais ficam enumeradas para uma etapa futura autorizada.

## Roteamento e eficiência

| Papel | Modelo/effort solicitado | Motivo |
|---|---|---|
| Auditoria de referências | GPT-6.1 Sol / medium | Escopo delimitado, evidência estática de quatro bases |
| WhatsApp e plataformas | GPT-6.1 Sol / high | Contratos de API, diferenças entre superfícies e integração recorrente |
| Instalação Cloudflare | GPT-6.1 Sol / high | Jornada leiga, custos, autenticação e recuperação |
| Advogado do diabo consolidado | GPT-6 Astra / high | Atacar decisões de maior impacto com os relatórios prontos, sem repetir coleta ampla |
| Orquestração | Recomendação ao operador: GPT-6.1 Sol / high | Conciliar produto, fontes e limitações; não foi alegada alteração automática do modelo da sessão |

Os pesquisadores receberam instruções delimitadas e sem herdar toda a conversa. O Astra recebeu documentos consolidados e os pontos de decisão. Pesquisa redundante só se justifica para verificar um achado material. Nenhum preço de API ou economia percentual foi inferido; não há medição financeira individual das chamadas nesta entrega. O modelo mais forte não foi usado em toda leitura ou formatação.

Skills lidas/aplicadas no trabalho: Grill adaptada, trabalho paralelo, OpenAI Docs, Cloudflare e verificação antes de conclusão. A exigência de adversário também vem das instruções de Robson, não apenas das skills.

## Evidência e privacidade

- Referências locais auditadas estaticamente, com commit/arquivo/linha; não foram executadas contra produção.
- Páginas oficiais consultadas para fatos externos atuais; documentação e cálculo hipotético não são benchmark.
- Nenhum segredo lido; nenhuma mensagem enviada; nenhuma conta, número, rotina do usuário ou infraestrutura provisionada.
- Nenhum dado de cliente foi usado em integração ou enviado a pesquisa web. Fontes privadas são insumos de leitura local e permanecem na pasta ignorada.
- Exemplos escritos nos documentos são fictícios; não copiar dados das apresentações para fixtures reais.
- Instalação, compatibilidade, quotas e segurança exigem as provas futuras descritas no PRD. Uma afirmação do README de uma base não foi aceita automaticamente como garantia.

## Escopo desta entrega

O goal se encerra com PRD v0.1, relatórios de evidência/revisão e decisões abertas entregues ao operador. Não depende de resolver escolhas que só Robson pode fazer, nem autoriza iniciar implementação para “fechar” uma lacuna documental. Não criar novo goal ou agendamento para continuar depois sem pedido.

## Trabalho posterior ao encerramento do goal

Robson respondeu às decisões de produto, exigiu Skills no harness e crons Work/Cowork, autorizou mocks no Lavish e teste de qualidade Clef com dados sintéticos na sua conta paga. O PRD foi atualizado para v0.2, sem implementação de produto. Houve uma revisão adversarial Sol/medium restrita ao delta retenção/triagem, sem nova coleta ampla. Foram realizadas 25 inferências sintéticas (sondagem + lote comparativo), documentadas em `clef-memoria-30dias.md`; portanto a afirmação anterior de pesquisa exclusivamente documental descreve apenas o goal original. Não houve deploy, D1 de produto, webhook ou WhatsApp conectado.

Depois Robson retirou front e telas do escopo. Lavish foi encerrado e nenhum mock foi aprovado. O PRD v0.3 preserva a correção e os rascunhos foram arquivados em `adiados/`; não há revisão visual ativa ou autorização para implementar telas.

## Goal experimental posterior: memória de 30 dias

Robson autorizou um novo goal para comparar generativo direto com generativo + Clef, com dados sintéticos na sua conta Cloudflare. O corpus foi preparado por Sol/medium; Astra/high revisou o desenho e atacou os resultados, incluindo schema, repetições e candidatos falsos. O orquestrador executou e conciliou as evidências. Não foram delegadas leituras redundantes de todo o projeto.

O teto local de 60 requests foi respeitado, contando oito recusas da API por schema incompatível. Há uso retornado em 52 respostas, equivalente bruto tabelado de US$ 0,01125 antes de franquia; não é fatura nem custo total do trabalho de agentes. Modelo principal escolhido nos dois casos de desenvolvimento; seis conversas reservadas para a extração. Gate e verificador são comparações exploratórias, pois seus prompts completos foram materializados depois dessa baseline. Recuperações com schema e stress não substituem os resultados originais.

O [relatório e evidências](../experimentos/memoria-30dias/RELATORIO.md) favorecem generativo com schema compatível e validação local, sem Clef obrigatório. Incluem custo, omissões, conflitos, pendências, falha do contrato, falso aceite do verificador e limites do corpus. O script de análise foi reexecutado offline. Não houve implementação do Elo, criação de Skill/cron, deploy, banco, conexão WhatsApp ou criação de issues. Extração incremental permanece aceite experimental da futura entrega, sem exigir um MCP inexistente antes das issues.

## Fechamento e publicação autorizados

Robson pediu encerrar o PRD, organizar as issues no padrão Pi e fornecer prompt para outro goal implementar sem cerimônia. Autorizou criar `orobsonn/elo` público e publicar o projeto. O PRD v1.0 e as quatro entregas passaram por revisão adversarial curta Sol/medium, sem nova rodada de inferência. As 49 exigências V0 foram mapeadas; R37/R39 ficaram posteriores. As issues foram criadas e seus corpos/links conferidos via GitHub. Não foram aplicados labels de fila nem iniciado goal de implementação. Fontes privadas continuam ignoradas; o índice público omite identidades dos entrevistados e acessos aos materiais originais.

## Correção do padrão de issues e prompt de deploy

Após Robson apontar a ausência de tags, foi aplicada a skill Pi `creating-issues`: títulos `[harness]`, IDs de journeys/aceites, escopo por área, decisões/suposições separadas, sensibilidade, P1/L e formulário canônico. Cada issue passou em `validate-ready.mjs` antes de receber `harness:ready` e `enhancement`. Dependências nativas e `harness-deps` foram preservadas; não aplicar manualmente estados do motor.

Robson também autorizou deploy na conta pessoal Cloudflare ao fim da implementação e informou que ainda não comprou Z-API. O prompt agora exige deploy/validação publicados e progresso sem essa instância, com provedores fake apenas em testes e a limitação live explícita. Não houve compra, novo goal de implementação ou deploy nesta sessão.

## Login padrão Access — atualização de retomada

Robson definiu Cloudflare Access como login padrão e informou que a run de implementação foi pausada antes de começar. O PRD foi atualizado para v1.1, mantendo 49 requisitos V0. E1/E4 receberam aceites específicos; as demais issues preservam a referência e restrição comum. A revisão adversarial Sol/medium exigiu vínculo de identidade com o dono, separação Access/OAuth MCP, revogação efetiva de tokens derivados e proteção de origem/preview sem bloquear webhook com login humano. Essas condições foram incorporadas. As issues foram revalidadas com a ferramenta Pi e labels preservadas. Nenhum Access app, provedor ou infraestrutura foi criado nesta sessão documental.
