# Revisão adversarial dos resultados

Revisão independente, 2026-10-16. Leitura de `dataset.json`, `protocol.json`, baselines dev/holdout, `gate-results.json` e `verification-results.json`; nenhuma inferência ou alteração nesses arquivos. Não havia resultados adicionais de stress/repetição disponíveis nesta leitura.

**Parecer: o lote favorece continuar investigando Llama com validação determinística de contrato; não demonstrou benefício de acrescentar Clef.** São seis conversas holdout sintéticas, oito fatos esperados e dois negativos. Não há evidência suficiente para confirmação automática em produção.

## Evidência que muda a decisão

- **Seleção do gerador é defensável, com limite.** O dev sustenta a escolha prévia do Llama: Qwen copiou uma mensagem inteira para dentro de `facts`, repetiu memória conhecida e produziu `12-01` para aniversário em `12-12`. Contudo, o Llama falhou no contrato de Clara no holdout: JSON analisável, mas chave raiz `facts':[{` em vez de `facts` contendo array. HTTP 200, `success=true` e JSON válido não equivalem a resposta utilizável. Clara precisa permanecer como falha integral no baseline; extrair o objeto escondido seria reparo posterior, não acerto original.
- **O pré-filtro está reprovado como veto.** Ambos descartaram a preferência explícita por ligação de Clara: Flash 0,0456 e Clef 0,4339, abaixo de 0,5. Flash também descartou Mario Cedro no dev, com aniversário e preferência reais. O gate rejeitou corretamente os dois negativos holdout, mas essa economia vem junto de perda útil. Comparar apenas o delta contra Llama mascararia Clara, porque seu baseline já falhou no contrato; a falha do gate existe independentemente disso e o Qwen extraiu esse fato corretamente.
- **Pós-verificação acrescentou pendências, sem correção demonstrada.** Os dois verificadores conservaram todos os sete candidatos holdout recebidos. Cada um rebaixou um acompanhamento inequívoco: Clef, `c-m09` (20/10), com `can_confirm=0,6713`; Flash, `f-m09` (19/10), com 0,6682. Ambos ficaram abaixo de 0,7. Incerteza de aniversário e conflito conjugal já estavam `pending` no Llama; mantê-los assim não é ganho incremental. Clara nem chegou à verificação. Cada variante acrescentou 4.197 tokens de entrada e três chamadas no holdout; não recuperou omissão nem corrigiu contrato. Não há justificativa observada para pagar esse passo rotineiramente.

## O score estrito precisa de interpretação, não de edição

Com as equivalências de fontes já permitidas no protocolo, ambos os geradores têm **5 TP, 2 FP e 3 FN estritos no holdout**, mas por motivos diferentes. Isso não os torna semanticamente iguais:

| Item | Revisão semântica separada do score congelado |
|---|---|
| g10, Llama: `02-06 ou 02-07` | Equivale a “6 ou 7 de fevereiro”, preservando as duas alternativas e `pending`. A diferença é de representação, não de informação. |
| g12, Llama: “Me separei. Não sou mais casada.” | Preserva “Separada” e o estado `pending`; é semanticamente equivalente no contexto avaliado. |
| g10, Qwen: `02-06` | Mesmo `pending`, elimina a alternativa de 7 de fevereiro. É perda de informação, não mera formatação. |
| g12, Qwen: “Não casada.” | É compatível com parte da mensagem, mas perde o evento de separação; também descreve situações diferentes. Não é equivalência integral de “Separada”. |

Llama perde ainda Clara por contrato; Qwen omite o acompanhamento de Bia. Manter os números estritos originais e publicar essa adjudicação qualitativa em coluna separada. Corrigir o normalizador depois de ver essas respostas exigiria outro protocolo/conjunto para uma nova avaliação, não um novo placar apresentado como previamente definido.

## Limites e menor arranjo defendível

Segundo o executor, modelo e limiares estavam congelados, mas os prompts completos de gate/verificador foram materializados **depois** da baseline holdout. Não receberam gold no payload, porém isso não elimina adaptação do pesquisador às respostas vistas. Portanto, a seleção da baseline foi feita em dev; a comparação da **cadeia inteira continua exploratória**, não integralmente holdout. A revisão não auditou timestamps independentes que comprovem a cronologia declarada.

Para a próxima etapa, manter **um gerador → validação determinística de esquema, campos, tipos, contato e fontes → candidatos revisáveis**. Rejeitar contrato inválido e, se couber no orçamento autorizado, fazer no máximo uma reexecução corretiva registrada como recuperação separada, incluindo seu custo e eventual falha. Nenhum reparo entra retroativamente no baseline. Preservar conflitos e incertezas como propostas; o lote não autoriza escrita definitiva automática. Clef pode permanecer objeto de pesquisa, mas não deve bloquear conversas ou integrar obrigatoriamente o fluxo apenas porque se desejava uma combinação de modelos.

Não ajustar 0,7 para salvar os followups, nem selecionar a melhor repetição. Uma eventual recuperação de Clara demonstraria apenas recuperação daquele caso. Economia incremental diária, replay local e ausência de vazamento observado não validam, respectivamente, qualidade equivalente, concorrência/idempotência de produção ou segurança de dados reais.

## Adendo final: schema, repetição e mutações

Lidas as evidências adicionais em `schema-results.json`, `schema-compatibility-probe.json`, `schema-targeted-results.json`, `mutation-stress.json` e `repeat-results.json`. Segundo o executor, o ensaio encerrou em **60 requests**, incluindo falhas, sem novas chamadas.

- **Schema:** oito requests foram recusados pela API por recurso de schema incompatível. Remover apenas `uniqueItems` permitiu a sondagem dev; os dois testes posteriores recuperaram o contrato de Clara e preservaram as duas datas incertas de Mario Vale. São recuperações exploratórias após observar o baseline, não correção comprovada do produto. As oito recusas permanecem no histórico de tentativas; não são oito erros semânticos do modelo. A unicidade retirada do schema remoto deve ser validada localmente.
- **Repetição:** Farol repetiu a saída correta; Clara reproduziu exatamente a chave raiz incorreta. Repetir sem mudar o contrato não recuperou essa falha. Duas repetições não demonstram determinismo geral.
- **Mutações:** cinco candidatos construídos manualmente, incluindo corretos e falsos, foram avaliados em duas chamadas. Flash aceitou um aniversário do cliente ausente das fontes (`11-08`), com suporte 0,8218 e confirmação 0,8888: passaria como `confirmed` pela política testada. Clef principal atribuiu confirmação 0,9189 a `has_children=true` diante de “não tenho filhos”; suporte 0,6677 conteve a saída em `pending`, mas não a rejeitou. Também rebaixou o aniversário verdadeiro da esposa por suporte 0,658. Esses achados reforçam que score alto não valida a verdade do candidato.

**Recomendação reforçada:** continuar com generativo, schema compatível e validadores locais de contrato, identidade, fontes e unicidade, mantendo revisão das propostas. A segunda chamada Clef acrescentou custo e introduziu erros neste ensaio; não há benefício demonstrado que justifique incluí-la rotineiramente. Schema garante estrutura dentro de seu contrato, não veracidade, e dois casos recuperados não autorizam alegar confiabilidade em produção. Nenhuma implementação é recomendada como concluída por este adendo.
