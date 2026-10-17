# Clef, memória de relacionamento e retenção

Data: 16/10/2026, America/Fortaleza. Revisão das decisões posteriores ao PRD v0.1. Teste autorizado por Robson em sua conta Cloudflare, somente com dados sintéticos, sem deploy ou dados de clientes.

Esclarecimento posterior: front e telas foram retirados do escopo. Nada neste teste depende de interface própria; Skills e crons permanecem no harness/Work/Cowork da pessoa.

## Papéis separados

- Backend/MCP: captura, histórico, memória persistente, identidades restritas, datas e execução de ações autorizadas.
- Skills no harness da pessoa: GPS, pós-reunião, revisão de conversas, atualização da memória e preparação do acompanhamento.
- Work/Cowork: agendamentos que executam essas Skills. Não construir outro agendador de trabalho intelectual no Elo.
- Clef no backend: candidato a triagem/classificação; não substitui os procedimentos das Skills. Automação determinística de retenção continua sendo responsabilidade do armazenamento.

## Capacidade documental

Clef recebe estado e perguntas tipadas e devolve probabilidades para opções permitidas. Não há contrato de geração de fatos novos em texto livre nessa interface. Portanto, sinalizar “há aniversário” não extrai o dia, mês e vínculo familiar. Referência: [Clef](https://developers.cloudflare.com/workers-ai/models/clef/). O [Clef-flash](https://developers.cloudflare.com/workers-ai/models/clef-flash/) é outra variante da família. Nenhuma foi tratada como extrator completo de memória.

## Teste executado

Foram feitas **25 chamadas de inferência**: uma sondagem de interface e 24 chamadas do conjunto comparativo. Cada modelo recebeu os mesmos 12 casos sintéticos em português, com cinco perguntas: informação útil, aniversário real, urgência, necessidade de revisão e existência de autorização externa. Limiar exploratório fixado em 0,5 antes do lote; não ajustado para melhorar o resultado. Sem cache ou recurso de produto configurado nesta pesquisa.

Casos cobrem saudação, aniversário explícito, retorno futuro, pedido de atenção no dia, exemplo hipotético, data incerta, correção de informação, mensagem encaminhada, tentativa de alterar regras, ausência de pressa, preferência de canal e negação de informação anterior. O [JSON de evidências](clef-avaliacao-sintetica.json) preserva entradas, gabaritos do pesquisador, perguntas e respostas de API. `run_started_utc` nesse JSON foi preenchido ao concluir o lote, apesar do nome; não representa o início exato.

| Medida | Clef-flash | Clef |
|---|---:|---:|
| Chamadas comparativas bem-sucedidas | 12/12 | 12/12 |
| Tokens de entrada no lote | 9.202 | 9.202 |
| Decisões binárias concordantes com gabarito exploratório | 56/60 | 57/60 |
| Casos úteis para memória detectados | 4/7 | 4/7 |
| Falsos positivos de aniversário | 1 | 0 |
| Conflito/incerteza/instrução maliciosa sinalizados | 4/4 | 4/4 |
| Mediana de duração observada de chamada | 602 ms | 554 ms |

Esses números não são acurácia de produção. Há um único positivo de aniversário e um de urgência; múltiplas perguntas do mesmo caso não são amostras independentes. Todos os casos de autorização têm resposta esperada falsa: isso não avalia autorização válida nem comprova segurança. A categoria “útil para memória” mistura fato durável e pedido de acompanhamento; C04 e C10 possuem fronteira de rotulagem discutível. Não esconder essa ambiguidade nem promover o agregado de 60 decisões como uma garantia. Mesmo nos casos inequívocos, houve omissões relevantes.

Falhas materiais: Clef não selecionou um combinado explícito de reunião futura (C03); Flash não selecionou uma correção negando que o cliente tenha filhos (C12). Flash marcou aniversário no texto de tentativa de manipulação (C09), embora também tenha sinalizado revisão. Não usar um booleano isolado como escrita automática, filtro de autorização ou veto definitivo de extração.

A sondagem anterior ao lote usou perguntas em inglês e um texto que juntava aniversário e retorno futuro. Flash respondeu probabilidade de aniversário 0,3278, abaixo de 0,5, apesar da data explícita. No lote, com perguntas em português e mensagem simplificada, respondeu 0,9552 no C02. Como tanto texto quanto perguntas mudaram, não é comparação controlada de idioma; é evidência adicional de sensibilidade à formulação. A sondagem consumiu 523 tokens e durou 761 ms, conforme retorno da API. Não ocultá-la ao avaliar a confiabilidade.

O teste observa só execução remota de inferência no Workers AI. Não exercita webhook, D1, Skills, cron, instalação, retenção ou compatibilidade com Claude/ChatGPT. Nenhuma configuração de produção foi alterada. Não repetir chamadas indefinidamente para obter um resultado favorável.

## Custo observado e limite

Total reportado: **18.927 tokens de entrada**, incluindo a sondagem de 523; zero tokens de saída reportados. A tabela consultada informa US$0,24/M para Clef e US$0,038/M para Flash, equivalentes a aproximadamente **US$0,00258** para este teste antes de franquias. Isso não é valor faturado confirmado. Workers AI possui franquia diária própria e cobra excedentes no plano pago; a assinatura Workers de US$5 não constitui teto total de inferência. [Preços oficiais](https://developers.cloudflare.com/workers-ai/platform/pricing/).

## Recomendação após teste e revisão adversarial curta

1. Começar com triagem auxiliar, sem permitir que Clef aprove envios ou substitua fatos confirmados. A persistência recebe candidatos/propostas com estado explícito.
2. Manter revisão pela Skill no harness, agendada no Work/Cowork. Resultado negativo do classificador não pode tornar uma conversa invisível à revisão: o teste encontrou falsos negativos.
3. Se a intenção for extrair fatos novos inteiramente no backend, independentemente da Skill rodar, avaliar um extrator apropriado separadamente. Não assumir que Clef oferece essa função, nem adicionar silenciosamente outra IA e seu custo.
4. Histórico consultável tem máximo de 30 dias. Atraso da revisão gera aviso, não extensão silenciosa da janela. Memória duradoura deve ser concisa, útil e corrigível, sem copiar conversas completas para contornar a retenção.
5. Cópias controladas pela aplicação, filas e logs não devem manter o corpo original indefinidamente. Backups e Time Travel da plataforma têm janela própria: definir e documentar expurgo/restauração sem prometer apagamento físico universal aos 30 dias. Fonte expirada é indicada como indisponível; origem opaca e datas podem continuar na memória.
6. Escritas por extração são idempotentes e não sobrescrevem fatos confirmados em conflito. O limite de autonomia para confirmar novos fatos ainda precisa de decisão de produto.

O adversário Sol/medium revisou somente este delta, sem repetir a auditoria completa: destacou retenção mesmo com backlog, memória sem cópia disfarçada, separação entre proposta e confirmação, custo/falha explícitos e aceites independentes para os dois clientes. A decisão de grupos fora e as Skills no harness reduzem o escopo de backend; não justificam recriar um CRM ou executor de agentes no Elo.
