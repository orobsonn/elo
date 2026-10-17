# Análise de histórico de 30 dias — resultado do experimento

Data: 16/10/2026, America/Fortaleza. **Concluído como experimento sintético; nenhuma implementação do Elo.** Foram feitas inferências reais no Workers AI da conta autorizada de Robson. Nenhum número WhatsApp, webhook, banco de produto, cron ou Skill foi implantado. O experimento não muda a decisão de que rotinas do consultor são Skills no harness, executadas por Work/Cowork.

## Recomendação

**O melhor candidato entre os caminhos testados é o generativo sem segunda chamada obrigatória ao Clef: Llama 3.3 70B fast + saída estruturada compatível + validação local do contrato.** Clef não demonstrou benefício incremental suficiente para integrar rotineiramente a extração. Como pré-filtro definitivo, perdeu informação explícita; como verificador, acrescentou custo/pendências e deixou passar erros em teste adversarial.

Isso é uma escolha candidata para as issues, não prova de confiabilidade de produção nem de que o Llama seja o melhor modelo possível. O corpus é pequeno e artificial. O resultado justifica **não adicionar complexidade sem ganho demonstrado**, em vez de forçar uma stack generativo + decisão por hipótese inicial.

## O que foi comparado

1. Gerativo direto: Qwen3 30B A3B e Llama 3.3 70B fast, com o mesmo prompt de extração e parâmetros declarados.
2. Clef-flash ou Clef antes do gerador: aceitar/rejeitar a conversa inteira; aplicar a seleção às saídas já produzidas, sem pagar nova geração redundante.
3. Gerador principal seguido de Clef-flash ou Clef: verificar suporte e possibilidade de registro automático de cada candidato; conservar incerteza como pendente.
4. Diagnósticos adicionais: schema explícito, duas repetições de chamadas e candidatos com erros deliberados.

GLM 4.7 Flash passou por sondagem, mas não entrou no lote comparativo: a segunda tentativa esgotou 600 tokens sem conteúdo final, apesar de `thinking: disabled`. Essa tentativa não demonstrou que o controle desabilita raciocínio nessa superfície. É uma decisão operacional sob limite de chamadas, não classificação de qualidade semântica do GLM.

## Corpus e protocolo

- [Dataset](dataset.json): oito conversas, 70 mensagens espalhadas entre 17/09 e 16/10, quatro Mario com IDs/aliases distintos, 13 fatos esperados. Não é simulação de alto volume nem de todos os dias de uma carteira real.
- Dois casos de desenvolvimento, seis reservados para a comparação da extração; dois destes não têm fato útil. Prevalência de negativos foi escolhida para o ensaio, não estimada na população.
- Gabarito escrito por agente independente do executor; não enviado aos modelos. Inclui aniversário, preferência, filhos, compromisso, data incerta, correção, hipótese, encaminhado e tentativa de instrução maliciosa.
- [Protocolo](protocol.json): prompt, modelos, parâmetros, limiares e equivalências de fontes. Llama foi escolhido no desenvolvimento, antes das saídas reservadas, pelo contrato válido e fidelidade dos cinco fatos esperados. Qwen repetiu memória anterior, errou um aniversário e incluiu um objeto de mensagem no lugar de fato.
- `confirmed` significa registro automático de declaração explícita e não conflitante **neste teste**; não comprova revisão humana nem autorização para enviar mensagens. Conflitos e incertezas são `pending`.
- Os prompts completos de gate/verificação foram materializados depois da baseline reservada. Portanto, o encadeamento é exploratório; não é uma validação integral independente em holdout. Os parâmetros não foram afinados para salvar seus erros.

O [script de análise offline](analyze.py) gera [analysis.json](analysis.json), sem rede. O score estrito usa campo, valor, estado e fontes permitidas; rejeita integralmente respostas fora do contrato. Equivalências semânticas discutidas depois são mostradas separadamente, nunca usadas para escolher o modelo ou apagar erro original. [Revisão independente do desenho](revisao-desenho.md) e [dos resultados](revisao-resultados.md).

## Qualidade dos generadores

| Medida nos seis casos reservados, oito fatos esperados | Qwen3 30B | Llama 3.3 70B |
|---|---:|---:|
| Fatos estritamente corretos | 5 | 5 |
| Previsões sem correspondência estrita | 2 | 2 |
| Fatos esperados sem correspondência estrita | 3 | 3 |
| Respostas fora do contrato | 0 | 1 |
| Fatos semanticamente preservados, após revisão separada | 5 | 7 |

O empate estrito esconde diferenças importantes:

- Llama preservou as duas alternativas de aniversário incerto como `02-06 ou 02-07`, em vez da forma textual do gabarito. Também preservou “me separei, não sou mais casada” em vez de “Separada”. São duas equivalências semânticas reconhecidas independentemente; permanecem divergências no placar estrito.
- Qwen escolheu apenas uma das datas incertas e reduziu “separada” a “não casada”, perdendo informação. Também omitiu um acompanhamento futuro.
- Llama devolveu JSON sintaticamente válido com uma chave raiz errada no caso Clara. O dado estava dentro desse objeto, mas não foi aproveitado silenciosamente: a resposta inteira falhou no contrato e o fato ficou ausente.

Uma repetição da mesma chamada reproduziu o defeito de Clara; repetir sem alterar o contrato não o resolveu. O caso Farol repetiu a saída correta. Duas repetições não estabelecem determinismo geral.

## Clef como filtro antes da extração

| Filtro, limiar 0,5 | Informação esperada nas conversas rejeitadas | Custo reconstruído para oito conversas |
|---|---|---:|
| Nenhum filtro, Llama direto | — | US$ 0,003491 |
| Clef-flash | Aniversário e preferência de Mario Cedro; preferência de ligação de Clara | US$ 0,002396 |
| Clef | Preferência de ligação de Clara | US$ 0,004065 |

O Flash reduziria cerca de 31% do custo nesse corpus **descartando três fatos esperados**. Clef principal custaria cerca de 16% a mais e ainda descartaria um. Ambos rejeitaram corretamente os dois negativos, mas o benefício não compensou a perda útil. Economias são calculadas pela seleção das chamadas e pelo uso reportado, não medidas de um serviço completo em execução.

A falha de Clara no gerador e a rejeição de Clara pelo filtro são problemas diferentes. Como a baseline Llama já falhou naquele contrato, comparar somente seu resultado final com o filtrado pode mascarar a omissão causada pelo gate. O gabarito e a extração válida do Qwen mostram que havia informação útil ali.

**Decisão experimental:** não usar Clef para decidir que uma conversa pode deixar de ser analisada definitivamente ou pode ser apagada sem revisão. Não ajustar o limiar depois de ver essas probabilidades para declarar sucesso.

## Clef depois da extração

| Caminho, oito conversas | Custo reconstruído | Efeito observado sobre a baseline escolhida |
|---|---:|---|
| Llama direto | US$ 0,003491 | Base de comparação |
| Llama + Clef-flash | US$ 0,003763 | +7,8%; um retorno claro virou pendência desnecessária |
| Llama + Clef | US$ 0,005212 | +49,3%; outro retorno claro virou pendência desnecessária |

Cada verificador recebeu os mesmos candidatos válidos do Llama e suas fontes. Nos três casos reservados verificáveis, acrescentou três chamadas e 4.197 tokens de entrada. A base já havia preservado os conflitos e incertezas como pendentes. Nenhum verificador recuperou a extração omitida, corrigiu o contrato inválido ou removeu um erro semântico demonstrado da baseline. Cada um rebaixou um compromisso futuro inequívoco por score abaixo de 0,7.

**Teste adicional com cinco candidatos construídos manualmente:** Flash aceitou um aniversário do cliente inexistente nas fontes, com suporte 0,8218 e possibilidade de confirmação 0,8888. Clef principal atribuiu possibilidade de confirmação 0,9189 a “tem filhos” diante de “não tenho filhos”; a regra combinada conteve o candidato como pendente por suporte 0,6677, mas não o rejeitou. Também rebaixou um aniversário verdadeiro. [Evidências](mutation-stress.json).

**Decisão experimental:** Clef não funcionou como certificado de verdade. Se for usado futuramente para priorização, seu score não pode autorizar envio, confirmar fatos sozinho nem bloquear informação. Este lote não justifica a chamada adicional no caminho padrão.

## Saída estruturada: falha e recuperação exploratória

`json_object` não bastou para garantir os campos necessários. Testou-se então schema explícito. A primeira configuração continha `uniqueItems`, incompatível com o mecanismo do provedor: oito requests foram recusados. Isso foi um erro de compatibilidade do experimento, não oito erros de interpretação. O lote deveria ter sido precedido por uma sondagem dessa configuração; as oito tentativas continuam registradas.

Ao remover **apenas** essa restrição, a sondagem passou. A unicidade de fontes deve ser verificada localmente. Dois ensaios dirigidos posteriores produziram contrato válido: recuperaram Clara e preservaram o aniversário com duas possibilidades. A baseline original não foi substituída. Esse achado sustenta testar o schema compatível na futura entrega, sem prometer que recuperará todo erro. [Falhas](schema-results.json), [sondagem](schema-compatibility-probe.json), [recuperações](schema-targeted-results.json).

Recomendação de contrato a desenvolver: campos permitidos, tipos, contato, estados, fontes e duplicações validados por código; se inválido, nenhuma escrita parcial e tratamento limitado de recuperação. Schema restringe forma, não comprova que o fato é verdadeiro. Endereços, credenciais ou dados fora do escopo não são obtidos por esse validador.

## Processamento ao longo dos 30 dias

O ensaio executou extração por conversa sobre o conjunto completo disponível. A projeção offline mostra que reler tudo diariamente reapresentaria **945 ocorrências de mensagens**, contra 70 mensagens únicas — fator 13,5 apenas em ocorrências, não em custo ou tokens totais. [Cálculo](workload-projection.json).

Para desenhar as issues, o candidato é processar novidades com referência à memória existente e contexto suficiente da conversa, mantendo posição de processamento, pendências e origem. Reler toda a janela deve ser recuperação/revisão delimitada, não comportamento diário presumido. Porém, **qualidade incremental ainda não foi testada**: cortar contexto pode perder sentido. Não converter a projeção de ocorrências em alegação de economia de 13,5×.

O replay local do mesmo resultado validado conservou 12 registros antes/depois. Isso comprova somente o merge determinístico daquela lista sintética; não testa D1, transações, concorrência, eventos tardios, exclusão, atualização do modelo nem recuperação de rede.

Política já definida: fatos claros podem entrar automaticamente; incertezas/conflitos sobrevivem como informação concisa a avaliar na rotina. Aos 30 dias, a conversa expira sem estender o prazo por falha da IA. Não copiar toda conversa para o campo de memória; manter fonte opaca/data e indicar expiração. Este teste não executou expurgo ou Time Travel.

## Custo e limites financeiros

**60 requests**, incluindo sondagens, repetições e oito recusas de schema. Há uso retornado para 52 respostas: equivalente bruto tabelado de aproximadamente **US$ 0,01125**, antes da franquia diária. As oito recusas não informaram uso; custo faturado não foi consultado. Valores das estratégias são reconstruídos, não fatura. Essa quantia não inclui consumo dos agentes/orquestrador deste chat.

Para geradores, a conta usa `usage.neurons` retornado; para Clef, tokens de entrada e tarifa publicada. [Preços oficiais](https://developers.cloudflare.com/workers-ai/platform/pricing/). Não extrapolar o custo de 70 mensagens para uma carteira sem medir comprimentos, picos, revisões, modelos/planos e outras chamadas na mesma conta.

## Encaminhamento às issues

1. Adotar como candidato **gerativo + schema compatível + validação local**, com conflitos/ambiguidades pendentes e sem Clef obrigatório.
2. Persistência de memória separa estado da informação, origem e processamento. Isso deve respeitar o approve de **envio no chat**, que continua uma Skill distinta do registro automático de fatos.
3. Incluir aceites para contrato inválido, dado sem fonte, mistura de contato, correção, replay e expiração. Esses testes pertencem à implementação; não exigir MCP pronto antes de organizar as issues.
4. Guardar extração incremental/custo em carga como ensaio da própria entrega. Se ela falhar em preservar sentido, ampliar contexto de forma mensurável.
5. Manter **Otimize meu processo**, rotinas e crons no harness/Work/Cowork. O experimento não os substitui por uma plataforma própria nem cria front além do sandbox de conexão já admitido.

## Arquivos e reprodução

Entradas/gabarito: `dataset.json`; condições: `protocol.json`; saídas: `baseline-development.json`, `baseline-holdout.json`, `gate-results.json`, `verification-results.json`; diagnósticos: `screening-probes.json`, `schema-*.json`, `mutation-stress.json`, `repeat-results.json`; avaliação: `analyze.py` e `analysis.json`; hashes: `manifest.json`. Rode `python3 docs/experimentos/memoria-30dias/analyze.py` para recalcular offline. Não há credenciais nesses artefatos e o script não envia chamadas.
