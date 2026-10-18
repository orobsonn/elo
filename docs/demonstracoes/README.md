# Demonstrações do Elo

Histórias de uso para apresentar o Elo ao Ronald, ao Lucas e a quem vai usá-lo. Cada vídeo começa com um problema da pessoa, mostra o pedido no chat, a execução real e o resultado. A apresentação geral reúne essa jornada em um vídeo curto.

A voz aprovada por Robson é **Antonio Neural**, em português brasileiro, com ritmo `-3%` e tom `-1Hz`. Os filmes têm imagem em 720p, áudio e legendas selecionáveis; cada MP4 acompanha um SRT e um JSON com origem, cortes e hashes. As telas foram capturadas no ChatGPT conectado ao Elo publicado, sem desenhar respostas ou simular ferramentas.

## Pegar os vídeos para enviar

A pasta **[para-compartilhar](para-compartilhar/)** contém só os dois vídeos para o grupo:

- **08-visao-geral.mp4** — apresentação da solução, 2min22.
- **09-mensagem-enviada.mp4** — envio real de WhatsApp, 54s.

Basta pegar os dois MP4; a narração e as legendas selecionáveis já estão dentro deles.

## Organização

| Pasta | Conteúdo |
|---|---|
| `para-compartilhar/` | Vídeo geral e envio de WhatsApp |
| `funcionalidades/` | Sete demonstrações individuais restantes |
| `legendas/` | Legendas SRT separadas |
| `roteiros/` | Histórias e falas de cada vídeo |
| `evidencias/` | Proveniência, hashes e verificações |

## Assistir

Comece pela **[visão geral](para-compartilhar/08-visao-geral.mp4)**. Os vídeos individuais permitem avaliar cada situação com mais calma.

| Vídeo | Duração | Problema da pessoa e resultado mostrado |
|---|---:|---|
| [01 — Começar sem cadastrar a agenda](funcionalidades/01-conexao-e-diagnostico.mp4) | 0:52 | “Preciso cadastrar todo mundo de novo?” A Skill `configurar-elo` percorre a agenda conectada e confirma 935 contatos mapeados. |
| [02 — Encontrar alguém sem histórico](funcionalidades/02-contato-sem-historico.mp4) | 0:48 | “Quero escrever para alguém que ainda não conversou comigo no Elo.” A busca encontra a pessoa da agenda e prepara o texto para revisão. |
| [03 — Guardar os combinados da reunião](funcionalidades/03-memoria-e-pos-reuniao.mp4) | 1:05 | “Vou esquecer o que ficou combinado.” As notas viram preferência confirmada, dúvida pendente e tarefa do consultor com prazo. |
| [04 — Ajustar prazos e lembrar datas](funcionalidades/04-tarefas-datas-e-atencao.mp4) | 1:00 | “O prazo mudou; preciso saber o que ainda devo fazer.” A tarefa passa para 22/10 e o aniversário fictício fica registrado em 23/10, sem ano. |
| [05 — Saber o que ficou pendente no dia](funcionalidades/05-revisao-diaria.mp4) | 0:58 | “Não consigo reler todas as conversas.” A revisão avalia três mensagens fictícias, separa próximos passos e dúvidas e informa a cobertura. |
| [06 — Revisar e poder cancelar](funcionalidades/06-preparar-aprovar-cancelar.mp4) | 0:50 | “Quero ajuda para escrever, mantendo a decisão comigo.” A proposta fica aguardando; outro turno cancela o rascunho e confirma que não foi enviado. |
| [07 — Chegar preparado à próxima reunião](funcionalidades/07-pauta-e-rotina.mp4) | 1:26 | “Não lembro todos os combinados e dúvidas.” A pauta consulta memória e tarefas; uma rotina manual reaproveita a Skill para repetir a preparação. |
| [08 — Elo no dia a dia](para-compartilhar/08-visao-geral.mp4) | 2:21 | Conversas, notas e compromissos ganham continuidade: encontrar, lembrar, organizar, preparar a reunião e retornar pelo WhatsApp. |
| [09 — Enviar WhatsApp pela IA](para-compartilhar/09-mensagem-enviada.mp4) | 0:54 | “Quero mandar uma mensagem sem sair do chat.” Texto e destinatária são revisados, o dono aprova, a ação é executada uma vez e o Elo confirma o estado entregue. |

A [verificação final](evidencias/verificacao-1810.json) registra faixas de mídia, hashes e checagens do ensaio. Os [roteiros](roteiros/) registram a história e o que cada filme comprova. O nome legado do arquivo 06 inclui “aprovar”, mas seu conteúdo demonstra preparo/cancelamento; o envio aprovado está no 09.

## O que foi usado nas gravações

- **01/02:** agenda real autorizada, sem publicar a lista, telefones ou nomes completos. O contato sem fontes em Elo recebeu temporariamente o alias de privacidade “Marina demonstração”; isso não representa uma pessoa fictícia cadastrada no WhatsApp. O alias original foi restaurado e relido pelo MCP após a gravação.
- **03/04/07:** contatos e notas inteiramente fictícios. Não representam reunião com um consultor real nem validam ganho de produtividade. A criação pela Skill pós-reunião não é apresentada como extração automática do webhook.
- **05:** período isolado de 15/10/2026, `America/Fortaleza`, carregado com três mensagens fictícias. Antes da consulta, o banco confirmou três fontes, todas do ensaio, e zero edições pendentes globais. A carga do cenário não representa recebimento real pelo WhatsApp naquela data. Revisão de mensagem não confirma automaticamente uma dúvida de memória.
- **06:** o mesmo contato de privacidade do 02, com texto de ensaio e cancelamento, sem envio.
- **09:** envio real para Lainny, autorizado pelo dono em outra mensagem após revisão do destinatário e texto integrais. O estado `delivered` foi relido pelo MCP. O print do WhatsApp destinatário será acrescentado pelo próprio Robson; ele não está incluído no vídeo entregue.

As duas fichas fictícias criadas para estas filmagens foram excluídas pelo MCP após as capturas; consulta posterior confirmou zero fichas ativas desse ensaio. Os contatos da agenda e a evidência do envio real são preservados. Não se publicam credenciais, sessões, capturas brutas ou identificadores de entrega do provedor.

## Limites da apresentação

A configuração da agenda começa com WhatsApp e MCP já conectados: não é prova de instalação de infraestrutura com um clique. A conversa antiga do ChatGPT ainda tinha o catálogo anterior; atualizar as ferramentas da conexão e abrir uma conversa nova permitiu executar a nova Skill. [Prova publicada e detalhes](../implementacao/agenda-whatsapp.md).

O histórico consultável cobre o que o Elo capturou, por até 30 dias; não é uma importação de todas as conversas antigas do WhatsApp. A memória concisa e as tarefas têm duração própria. A revisão filmada é manual; os filmes não comprovam uma execução agendada do Work/Cowork. A rotina do 07 reaproveita uma Skill existente, sem afirmar que instalou outra ou que houve entrevista/validação humana de produtividade.

O envio da V0 é texto individual, após aprovação de destinatário e conteúdo no chat. Grupo, anexo e lote ficam fora desta demonstração. Aceite pelo provedor, entrega e leitura são estados distintos; o filme 09 relata o estado efetivamente consultado, sem afirmar leitura pela destinatária.

Esperas podem ser encurtadas, e quadros reais podem ficar mantidos para leitura; isso aparece nas legendas editoriais e nos JSONs. Há cartões de abertura e encerramento para explicar o problema e o benefício; eles não se passam por telas do produto. Alguns trechos do pedido são recortes de sua exibição na mesma conversa concluída para permitir leitura, com essa edição registrada. As interfaces e respostas não são reconstruídas.

## Reproduzir a montagem

Ferramentas: `ffmpeg`, `ffprobe`, Python com Pillow, Node e [edge-tts 7.3.1](https://github.com/rany2/edge-tts), biblioteca pública sob [LGPLv3](https://github.com/rany2/edge-tts/blob/master/LICENSE) (o compositor SRT tem licença MIT). A voz utiliza o serviço online Microsoft Edge TTS; somente as falas sintéticas de narração são enviadas a ele, nunca chats reais, agenda, credenciais ou capturas. Não é um motor de voz local.

[assemble-story-demos.mjs](../../scripts/assemble-story-demos.mjs) recebe sequências reais de screenshots, com `frames.json` e timestamps, recorta/amplia, aplica máscaras declaradas e acrescenta cartões editoriais. [narrate-demos.mjs](../../scripts/narrate-demos.mjs) também aceita um vídeo já capturado, acrescenta voz e legendas e registra proveniência. Nenhum dos scripts controla o navegador ou fabrica telas. O filme 03 usa o screencast real anterior; os demais casos individuais usam sequências reais capturadas pelo Cua. O geral reaproveita trechos desses filmes, com os hashes de origem registrados.

```sh
node scripts/assemble-story-demos.mjs /caminho/privado/plano.json --check
node scripts/assemble-story-demos.mjs /caminho/privado/plano.json
node scripts/narrate-demos.mjs /caminho/privado/manifesto.json --check
```

Os comandos `--help` descrevem os manifestos. Arquivos brutos e planos com caminhos locais ficam fora do Git; as saídas finais não são sobrescritas. A verificação inclui decodificação integral, faixas de mídia, duração, legendas, hashes e inspeção dos quadros para legibilidade e privacidade. A voz foi escolhida por Robson a partir de uma amostra.

Os nove MP4 somam cerca de 9,5 MiB. A revisão independente conferiu os nove arquivos e 40 quadros, sem bloqueadores. Decodificação integral, faixas, hashes e presença/nível de áudio foram conferidos também pelo agente responsável pela entrega.

A série e a funcionalidade de agenda são acompanhadas na [issue #23](https://github.com/orobsonn/elo/issues/23). Os arquivos são material para Robson compartilhar; nada é enviado automaticamente ao grupo do Ronald e do Lucas.
