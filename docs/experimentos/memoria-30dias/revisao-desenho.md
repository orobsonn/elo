# Revisão adversarial do experimento de memória de 30 dias

Data: 2026-10-16. Papel: advogado do diabo do desenho experimental. Escopo: dados sintéticos, inferência autorizada na conta Workers AI de Robson; nenhum backend, deploy, coleta real ou mudança de produto. Esta revisão não executou inferência nem validou disponibilidade ou preços atuais dos modelos.

Base: [pesquisa anterior](../../pesquisa/clef-memoria-30dias.md) e proposta recebida: dois geradores candidatos, dois classificadores (Clef-flash e Clef), baseline, pré-filtro por conversa e verificação de candidatos. Atualização incorporada: **oito conversas, duas de desenvolvimento e seis holdout**, incluindo duas holdout negativas com gold vazio. Cada conversa contém 8–12 mensagens ao longo de 30 dias. A amostra foi desenhada manualmente; não representa a distribuição de clientes.

Atualização do executor antes do holdout: geradores do lote passam a ser **Qwen3-30b e Llama3.3-70b-instruct-fp8-fast**. GLM4.7flash saiu da comparação inicial por overhead/controle de geração nas sondagens, incluindo resposta sem conteúdo ao atingir limite, mesmo com parâmetro aceito para desativar raciocínio. Isso justifica sua exclusão operacional sob orçamento restrito; não demonstra inferioridade semântica. As sondagens, sua saída vazia e os tokens consumidos continuam no registro e no teto total de chamadas. O relato das sondagens foi recebido do executor; esta revisão não auditou seus payloads.

## Parecer

Executar como **ensaio de eliminação de alternativas e descoberta de falhas**. O desenho não sustenta declarar um modelo confiável, confirmar fatos automaticamente em produção ou projetar economia para toda a base. O resultado anterior já mostrou omissão de fatos úteis pelos dois Clef; repetir um agregado de acerto esconderia a falha que importa.

As três estratégias merecem comparação, mas a hipótese de pré-filtro destrutivo começa enfraquecida. Seu resultado deve mostrar exatamente quais fatos uma economia descartaria. Para verificação, o benefício precisa superar as novas omissões e o custo adicional. Se o baseline apresentar erros graves, a primeira resposta é limitar a conclusão; adicionar um verificador não demonstra que o problema foi resolvido.

## Ataques e correções necessárias antes das chamadas

1. **O pesquisador pode escrever a resposta dentro do teste.** Perguntas, exemplos e casos sintéticos produzidos pela mesma pessoa tendem a favorecer uma formulação. Congelar corpus, gold, prompts, esquema, modelos completos, parâmetros, limiares e normalização antes do holdout. Guardar hashes e separar fisicamente gold do payload. O executor não deve usar gold para escolher exemplos ou reparar respostas. Revisão independente do gold ocorre antes de abrir saídas holdout.
2. **Seis conversas holdout não são centenas de observações independentes.** Vários fatos, perguntas e aliases de uma conversa compartilham contexto. Mostrar contagens por conversa e categoria; não fabricar tamanho amostral usando cada booleano. Zero erros nessa amostra significa apenas zero erros observados. Não atribuir intervalo estreito ou generalização comercial.
3. **Dois negativos criam uma chance de economia, mas também fixam artificialmente sua prevalência.** Mostrar economia no corpus e uma tabela calculada por proporção hipotética de conversas negativas. Não chamar os 2/6 de taxa esperada da base. Um negativo deve conter saudação/comentário sem memória útil; o outro pode conter fatos apenas hipotéticos, de terceiros ou encaminhados, claramente fora da política. Não usar ambos como negativos trivialmente vazios.
4. **“Sem PII” contradiz aniversário e filhos.** Definir dados pessoais permitidos na memória e identificadores proibidos. Para este teste, proibir telefone, e-mail, documento e endereço completo na saída estruturada; permitir somente as categorias pessoais explicitamente avaliadas. Identificadores sintéticos ajudam a testar vazamento, mas isso não comprova proteção de dados reais. Não colocar os identificadores proibidos no gold como valores aceitáveis.
5. **“Confirmed” pode esconder uma aprovação inexistente.** Definir `confirmed` como evidência explícita e não conflitante na fonte, somente para o experimento. Não equivale a validação humana nem autoriza ação externa. Conflito não resolvido e data incerta ficam `pending`. Correção explícita da própria fonte pode substituir informação anterior se esta regra estiver no gold; duas afirmações incompatíveis sem resolução não podem virar certeza.
6. **Aliases não resolvem identidade.** Especificar se os quatro “Mário” são variações do mesmo contato ou pessoas diferentes. O teste deve incluir ao menos dois contatos distintos com o mesmo nome, IDs estáveis e um terceiro mencionado na conversa. Não pedir ao modelo para unir pessoas por nome. O átomo precisa carregar `contact_id`/sujeito; match de campo e valor sem sujeito deixa passar contaminação entre contatos. Isolar as entradas por conversa e preservar tenant/contact IDs determinísticos não demonstra isolamento de produção.
7. **O gold de memória é uma decisão editorial, não uma verdade automática.** Especificar quais preferências são duráveis, se intenção provisória é lembrança e o que conta como contexto familiar útil. Registrar itens discutíveis antes da execução. Métrica principal usa o conjunto inequívoco; análise separada mostra os ambíguos e suas interpretações, sem remover erros após ver as saídas.
8. **Verificador pode endossar uma alucinação bem escrita.** Ele recebe candidatos e as fontes completas relevantes, não somente a explicação do gerador. Deve verificar sujeito, valor, status e IDs. Um segundo modelo não implica independência: ambos podem falhar na mesma negação, encaminhamento ou ambiguidade. Comparar erros corrigidos, erros mantidos e fatos corretos removidos.
9. **Probabilidade não é calibração.** Um limiar de 0,5 ou 0,8 não significa confiança operacional de 50% ou 80%. Dois casos dev não calibram nada. Fixar um limiar exploratório e uma regra conservadora de encaminhamento, sem varrer dezenas de cortes no holdout. Nunca interpretar score alto como autorização de envio ou escrita definitiva.
10. **O classificador também lê os 30 dias.** Computar os tokens de todo o gate, suas instruções e perguntas. A cascata paga gate em todas as conversas e gerador nas aceitas. Não comparar apenas preço por milhão de tokens. Falha, timeout, resposta inválida ou excesso de contexto do gate encaminha ao baseline; jamais equivale a “sem memória”.
11. **Datas sem relógio fixo tornam o gold móvel.** Fixar `as_of`, timezone America/Fortaleza e timestamps por mensagem. Resolver “sexta”, “amanhã” e “dia 12” a partir da mensagem correta, não do dia de execução. Aniversário sem ano é mês/dia; não inventar ano. “Meu filho faz aniversário” tem sujeito diferente de “faço aniversário”. Definir previamente o limite inclusivo/exclusivo dos 30 dias.
12. **Truncamento pode fabricar uma vitória barata.** Nenhuma estratégia pode receber uma conversa truncada silenciosamente. Registrar tamanho de entrada e limite efetivo conhecido. Sem espaço, marcar `overflow` e parar aquela comparação; não cortar correções antigas ou recentes para fazer caber. O estudo com 8–12 mensagens não testa conversas volumosas de clientes.

## Execução mínima: até 48 chamadas base, teto de 60

Usar IDs exatos de modelo e preços oficialmente verificados pelo executor; os nomes abreviados acima são candidatos, não contratos de disponibilidade. Registrar cada tentativa e custo, inclusive sondagens e falhas.

| Etapa | Chamadas máximas | Propósito |
|---|---:|---|
| Dev: dois geradores × duas conversas | 4 | Validar contrato e escolher um gerador principal para a cascata de verificação |
| Dev: dois Clef × duas conversas como gate | 4 | Conferir formato, perguntas e encaminhamento |
| Dev: dois Clef × candidatos do gerador principal × duas conversas | 4 | Conferir contrato do verificador com fontes |
| Holdout: dois geradores × seis conversas | 12 | Baselines comparáveis, mantendo a escolha principal feita no dev |
| Holdout: dois Clef × seis conversas como gate | 12 | Medir perda de fatos, proporção aceita e custo do gate |
| Holdout: dois Clef × candidatos do gerador principal × seis conversas | 12 | Medir utilidade incremental da verificação |
| **Total base máximo** | **48** | Sem repetir o gerador nas cascatas |

Verificação de conversa sem candidatos não exige chamada: contar custo zero e ausência de efeito, preservando eventuais FNs do baseline. As sobras não devem ser gastas automaticamente. Reservar até oito chamadas para repetições exatas escolhidas antes das saídas (um caso de correção/conflito e um com identidade/data), e até quatro para falhas transitórias/sondagem de compatibilidade. O teto de 60 inclui tudo, descontando as sondagens já executadas; se elas superarem essa reserva, reduzir repetições ou outra etapa antes de iniciar o holdout. Cada necessidade adicional exige reduzir outra etapa ou concluir com a limitação registrada; não expandir a pesquisa silenciosamente.

Seleção no dev: contrato válido e nenhuma falha grave; depois menor perda de fatos inequívocos; depois custo observado. Não escolher pelo holdout. Se ambos forem inadequados no dev, interromper o estudo de cascatas e documentar a falha. Fixar o mesmo prompt de extração para ambos, admitindo apenas envelope técnico exigido pela API e registrando diferenças. Temperatura mínima suportada e parâmetros explícitos; não prometer determinismo ou equivalência por um parâmetro ignorado.

**Pré-filtro por replay:** usar exatamente a saída baseline já capturada nas conversas que o gate aceitou; nas rejeitadas, saída vazia. Isso mede o efeito causal da seleção sem ruído de uma nova geração e sem duplicar chamadas. Não é medição ponta a ponta de uma implantação real. Custos de cascata são recompostos; latência sequencial é uma estimativa pela soma de tempos correspondentes. O experimento paga pelas baselines inclusive onde uma cascata teria economizado.

**Verificação:** usar candidatos congelados do gerador principal, com IDs, mais a conversa de origem. Decisão por candidato pode ser agrupada em uma chamada por conversa. Saídas devem distinguir `supported`, `unsupported` e `uncertain`; regra de aceitação fixada no dev. Verificador só filtra ou sinaliza; não inventa candidatos, corrige valores ou recupera fatos que o extrator omitiu. Se a API exigir dividir em chamadas adicionais, recalcular o orçamento antes do holdout e reduzir escopo, sem fingir o custo de uma chamada única.

Não executar de início o fatorial completo de dois geradores × dois verificadores. Ele aumenta custo e comparações sem resolver a fraqueza de uma amostra pequena. Comparar os dois baselines e verificar apenas o principal escolhido previamente é suficiente para decidir se há motivo para ampliar o estudo.

## Métricas e critérios de parada

Átomo: `contact_id/sujeito + field + valor normalizado + status + source_ids`. O avaliador é determinístico, separado da inferência. IDs devem existir, pertencer à conversa e sustentar o fato. Normalizar somente equivalências previstas (por exemplo, formato de data); não usar outro LLM para transformar divergências em acertos.

Contar TP, FP e FN estritos, além de decompor erro de sujeito, valor, status e fonte. Valor errado gera um FP e a falta do valor correto gera um FN, ligados no relatório para não parecerem dois incidentes independentes. Fontes adicionais não relacionadas invalidam proveniência. Quando diferentes fontes forem aceitáveis, registrar no gold os conjuntos de suporte permitidos antes das chamadas; não exigir igualdade arbitrária com uma única escolha editorial.

Reportar:

- Contagens por conversa, campo e status; precisão/recall somente quando o denominador existir. Gold vazio permite medir FP, não recall. Mostrar números absolutos ao lado de taxas.
- Respostas inválidas, vazamento de identificadores proibidos, troca de contato, conflitos convertidos em certeza e fatos inventados. Saída inválida não desaparece do denominador; sua conversa permanece como falha, com gold não recuperado.
- No gate: conversas aceitas/rejeitadas, fatos que seriam perdidos, correções/confirmações perdidas, tokens poupados e tokens adicionais. Distinguir rejeição de conversa vazia de rejeição de fato útil.
- No verificador: FP removidos, FP mantidos, TP removidos e candidatos incertos. Mostrar o delta contra a mesma baseline; uma taxa de “aprovação correta” esconde as omissões prévias.
- Tokens de entrada/saída, tentativas, status da API, duração por chamada e custo bruto tabelado antes de franquias. Exibir mediana/faixa observadas; não apresentar p95 estável de meia dúzia de chamadas.

Não usar score ponderado como ranking principal: pesos arbitrários podem compensar troca de pessoa com dezenas de campos banais corretos. Usar ordem de exclusão: falha grave → perda de fatos → custo. Se houver score auxiliar, congelar pesos e mostrar as métricas sem peso ao lado.

**Paradas predefinidas:**

1. Identificador proibido, contaminação de contato ou conflito convertido em `confirmed`: reprovar a configuração para promoção automática imediatamente. Interromper sua cascata; preservar os outros comparadores e registrar resultados parciais. Uma execução experimental posterior não apaga a falha original.
2. Primeiro fato inequívoco, correção ou compromisso perdido por rejeição do gate: reprovar seu uso como veto definitivo. Pode concluir o restante do pequeno lote para diagnóstico de triagem auxiliar, mantendo essa reprovação explícita; não ajustar limiar no holdout.
3. Verificador remove um TP e não corrige nenhum FP no lote: não há benefício demonstrado. Não expandir chamadas para tentar achar uma vitória. Se houver troca entre erros corrigidos e novos, apresentar o par de contagens e não declarar vencedor só por saldo.
4. Repetição exata muda sujeito, valor, status ou rejeita um fato antes aceito: registrar instabilidade; não escolher a melhor repetição. A repetição não aumenta a amostra de casos independentes.
5. Duas falhas consecutivas de contrato na mesma configuração, indisponibilidade persistente ou teto de chamadas/custo alcançado: parar essa configuração. Retry transitório no máximo uma vez por chamada, contado no teto. Registrar latência/custo faltantes como desconhecidos, não zero.

Mesmo um gate sem FN neste holdout **não recebe autorização de descarte definitivo**: há evidência anterior em contrário e pouca amostra nova. A conclusão possível é “vale investigar como priorização”, com revisão de negativos independente do score. Não adicionar esse mecanismo ao produto nesta etapa.

## Rolling diário versus revarrer 30 dias

Esta parte é **cálculo de custo**, não comparação empírica de qualidade ou prova de retenção. Distinguir três calendários: varrer janela móvel de 30 dias todo dia; processar apenas delta diariamente; processar um lote uma vez por mês. Frequências diferentes têm atrasos e oportunidades de correção diferentes.

Para cada dia `d`, computar com os mesmos timestamps e preços:

- Revarredura: `custo(prompt + todas as mensagens ainda válidas em d + saída estimada/observada aplicável)`.
- Incremental: `custo(prompt + mensagens novas em d + memória/contexto necessário + saída estimada/observada aplicável)`.
- Bootstrap incremental: incluir a leitura inicial; dias sem mensagem podem ter custo zero somente se uma regra determinística dispensar inferência.

Somar chamadas, tokens de prompt repetido, memória carregada, verificadores e retries. Não chamar delta de custo linear constante se a memória cresce. Mostrar limites com e sem reaproveitamento de contexto, sem assumir cache ou desconto não verificado. Identificar explicitamente toda saída/token estimado; não extrapolar tokens de uma chamada mensal como se fossem medidos em 30 chamadas diárias.

Uma mensagem pode ser relida em até 30 varreduras diárias dentro da janela; isso não prova que a solução incremental é 30 vezes mais barata. Instruções, memória, volumes por dia e bootstrap mudam a razão. O calendário de 30 dias iniciado vazio tem uma fase de crescimento; apresentar separadamente essa fase e qualquer extrapolação de regime contínuo.

Qualidade incremental permanece desconhecida: “na verdade, não tenho filhos” depende do estado anterior; “sexta não dá mais” depende de compromisso prévio. Não vender a economia calculada como equivalência sem testar esses estados em outra etapa.

## Replay local de idempotência

Executar uma única simulação local ao fim, sem inferência adicional: aplicar o mesmo lote de candidatos normalizados duas vezes ao estado de memória de teste; comparar contagem, conteúdo e hash lógico após primeira e segunda aplicação. Chave determinística deve preservar contato, campo, valor, status e origem de maneira explícita, evitando colisão entre homônimos. Registrar correções e itens `pending` conforme a regra congelada.

O resultado comprova somente idempotência dessa função local para esse lote. Não comprova atomicidade, concorrência, retry de rede, isolamento multi-tenant, ordenação de webhooks, expurgo, TTL ou recuperação de backups. Não construir infraestrutura para fazer o experimento parecer teste do produto.

## Saída esperada da revisão final independente

Entregar tabela das configurações sobreviventes, incidentes com mensagem/átomo de origem, custo real das chamadas do experimento e custo calculado das estratégias separadamente. Incluir corpus/gold/prompt hashes, resultados brutos, critérios de parada acionados e diferenças entre dev e holdout. Revisão final deve conferir o gold sem privilegiar a saída escolhida, o denominador dos erros e as regras congeladas.

Uma conclusão honesta pode ser: baseline é a alternativa menos ruim na pequena amostra; Clef não demonstrou economia segura; verificação não recupera omissões; comparação incremental permanece apenas financeira. Nesse caso, encerrar o ensaio e conservar a evidência, sem implementar produto ou prolongar chamadas em busca de aprovação.
