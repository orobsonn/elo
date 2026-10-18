# Revisão diária: carga sintética e índices

Ensaio de 17/10/2026, concluído após 00h UTC de 18/10. Base do código: main e65985a. D1 temporária na conta pessoal, sem Worker, IA, WhatsApp, credenciais ou dados reais. Recurso removido após GET conferir nome/UUID e DELETE retornar sucesso.

## Medição real

100 contatos, 30.002 fontes e 30.001 mensagens. Trinta dias com mil fontes principais/dia e texto de 500 caracteres. Inclui edição antiga pendente, chegada tardia, uma fonte expirada e uma mídia sem texto. O dia selecionado teve 1.003 fontes elegíveis, 1.001 legíveis e duas indisponíveis.

Executamos as consultas extraídas de `reviewPage`, incluindo snapshot, cobertura, progresso, persistência dos itens e proteção de avanço, em 21 páginas. Não é medição de latência MCP/Worker: o executor percorreu SQL via API D1.

| Paginação completa | Sem novos índices | Dois índices + PRAGMA optimize |
|---|---:|---:|
| Linhas lidas | 1.988.424 | 190.808 |
| Linhas escritas | 2.025 | 2.025 |
| Tempo SQL somado | 987,949 ms | 155,670 ms |
| Fontes legíveis mostradas | 1.001 | 1.001 |

`EXCEPT` nos IDs/versões persistidos, nas duas direções: zero diferenças. Mesmas contagens de indisponibilidade. A conclusão com indisponíveis não alterou o estado. Em outro ensaio na mesma QA, excluímos somente as duas fixtures indisponíveis e percorremos de novo as 21 páginas: conclusão persistida `complete`, 1.001 versões mostradas, zero edições pendentes. Isso não recupera fontes reais nem estende retenção. As três consultas reais de conclusão leram 12.016 linhas, escreveram 1.002 e somaram 4,455 ms SQL.

## Correção mínima

Migração 0006 acrescenta índice por recebimento e índice parcial de edições pendentes. Não modifica consultas, filtros, retenção, OAuth, estados ou proteções de concorrência. Mantém os índices anteriores. O teste de regressão executa `reviewPage` real no D1 local com 30 mil fontes, verifica ordem/ausência de duplicação, edição dentro e fora do dia e orçamento de leituras: falhou com 2.018.171 leituras antes; passou abaixo de 500 mil depois, **sem optimize ou ANALYZE**.

150 testes Worker/D1 e 22 testes dos scripts passaram; TypeScript, build e revisão adversarial passaram. Permanecem avisos conhecidos das dependências/AI binding, sem uso de IA neste ensaio.

Após os dois checks CI passarem no commit cb71bf9, a migração 0006 foi aplicada à D1 pessoal por Wrangler: sucesso, três comandos em 0,78 ms. Releitura confirmou as duas definições de índices e o registro da migração. Não foi executado optimize na instalação pessoal. Os seis smokes publicados passaram; Worker permanece na versão fa8c0a95-b3e7-4529-8e6e-521946abe863, código 4a3945b. Não há mudança de código do Worker nesta entrega.

## Limites

O percentual remoto pertence à combinação índices + atualização de estatísticas; não atribuí-lo exclusivamente à migração. A primeira página ainda percorreu aproximadamente 29 mil linhas. Os índices aumentam armazenamento e manutenção de escrita. Não comprovamos throughput concorrente, um ano de carga, grandes acúmulos de edições pendentes ou latência do cliente com essa carga. A fixture local simplifica contatos e não inclui mensagens; não substitui a QA remota.

As issues #1–#4 permanecem abertas. Esta prova SQL não substitui revisão por Skill no cliente nem agendamento Work/Cowork integral. Nenhum envio novo ocorreu.

[Resultados estruturados](revisao-carga-1710.json). Orientação oficial: [índices D1 e métricas de leituras](https://developers.cloudflare.com/d1/best-practices/use-indexes/).
