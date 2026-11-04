# Identificação nos briefings — v0.4.3

## Evidência e limite de atribuição

O retorno de campo após v0.4.2 informou sincronização completa e histórico unido à ficha encontrada pelo nome, mas o briefing de uma automação própria continuava descrevendo contatos como “sem nome”. Não acessamos a instalação nem a configuração dessa automação. Mensagens, áudios, screenshot e nomes reais não fazem parte deste repositório.

A hipótese de uso do recado do perfil **não foi comprovada** no Elo. O parser de `/contacts` aceita `phone/name/short/vname/isGroup`, não aceita nem consulta `about`/`notify`; campos extras são descartados. A documentação do provedor distingue [agenda](https://developer.z-api.io/contacts/get-contacts) e [recado do perfil](https://developer.z-api.io/contacts/get-metadata-contact). Isso não certifica quais fontes uma automação externa usa.

Causa reproduzida no nosso código: `memory_get` e `tasks_get` omitiam toda identificação de apresentação, inclusive quando havia um alias canônico legível. A rotina de pauta instalada consulta exatamente essas duas tools. `review_page`, `messages_list` e `attention_get` já retornavam alias; não havia desaparecimento uniforme de nome no backend. Outra limitação era rejeitar um `short` seguro apenas por espaços externos.

## Correção e contrato

- `memory_get` e `tasks_get` retornam `contact: {id, alias}`, mesmo com listas vazias e em cada página. A projeção é explícita; reaproveita a consulta de contato ativo, sem consulta global nem consulta extra por item.
- Alias manual e homônimos ficam vinculados aos mesmos IDs; nenhuma relação de identidade, destino ou autorização muda.
- Normalização de espaços externos precede a validação já existente de `short`. Não se divide nome completo, não se usa vname/notify/about como alias.
- Um alias canônico genérico permanece genérico. A política do PRD evita derivar primeiro nome cegamente de rótulos completos. Isso é limitação de apresentação, não prova de ausência da identidade; não obriga recadastro a cada briefing.
- Revisão diária e pauta preservam alias/ID das tools, tratam alias como dado não confiável e não inventam nomes por assunto/bio. Snapshots antigos sem identificação têm cobertura explícita; não se amplia escopo da pauta para outros contatos.
- O pacote de atualização passa a incluir as duas Skills. A cópia de pauta no plugin foi conferida contra o exemplo antes do ajuste; a publicação efetiva e a recarga no host são verificações separadas.

## Plano e validação

Regressão MCP/D1 ficou vermelha porque `contact` era ausente. Correção mínima e testes de listas vazias/preenchidas, alias manual atualizado, homônimos, genérico, contato excluído, ausência de campos privados, `short` com espaços e descarte de campos de perfil. Testes existentes conservam rejeição de rótulos compostos/injeção e proteção de identidade.

Uma fixture antiga comparava reunião de uma fonte criada “agora” com interação relevante também “agora”; podia dar igualdade de milissegundos. Fixamos a origem da reunião no dia anterior, conforme o cenário, sem alterar runtime de interações.

Ensaio das Skills com dados sintéticos: contato Mario trilhas + itens de memória/tarefas produzem cabeçalho Mario trilhas; outro ID Mario praia permanece distinto; alias genérico é declarado como tal, sem inventar nome ou usar o assunto; snapshot antigo sem alias mantém limitação explícita. Isso é inspeção/ensaio da instrução, não prova de execução na automação externa.

## Ativação e limites

Sem migration nova. Atualizar backend v0.4.3, pacote de Skills e plugin, recarregar Skills/catálogo no cliente e executar uma nova rodada do briefing; saídas históricas não são reescritas. Se o Radar externo usa alias incorreto ou ignora o campo fornecido, conferir nele o `contact_id`, alias devolvido pelo Elo e o texto final, sem compartilhar telefones, LIDs ou nomes completos.

A alteração é aditiva ao MCP. Um cliente com parser próprio estrito deve aceitar o novo campo `contact` ou atualizar seu adaptador. Não introduzimos Telegram, scheduler ou proatividade, nem alteramos as regras de envio. Rollback de backend perde a projeção adicional; instruções novas já contemplam ausência de `contact` em snapshots/versões anteriores. Não anunciar validação de nomes na instalação de outra pessoa sem nova evidência.

## Verificação final local

270 testes da aplicação em 17 arquivos e 26 testes do instalador/recuperação passaram. TypeScript, build seco e diff-check passaram; audit de dependências de produção sem vulnerabilidades. O ZIP 1.1.2 foi aberto e comparado byte a byte com as fontes pelo empacotador; inclui revisão e pauta, preservando App binding e demais Skills por overlay.
