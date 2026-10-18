# Depois da reunião: recuperar o que ficou combinado

**História de uso:** como consultor, quero registrar as notas de uma reunião e recuperar preferências, dúvidas e próximos passos no contato seguinte, sem reconstruir o contexto a partir de anotações espalhadas.

O vídeo começa pelo problema, mostra o pedido no ChatGPT e termina com o resultado consultado no Elo. A personagem Lia e as notas são fictícias. A interface mostrada vem da execução real; o cartão de abertura é apenas uma introdução editorial.

[Assistir ao vídeo](../03-memoria-e-pos-reuniao.mp4) · [Legendas](../03-memoria-e-pos-reuniao.srt) · [Origem e edição](../03-memoria-e-pos-reuniao.json)

## Problema → pedido → resultado

| Tempo | O que aparece | Papel na história |
|---|---|---|
| 00–06 s | Cartão “Depois da reunião, o que ficou combinado?” | Situar o problema antes de apresentar ferramentas. |
| 06–20 s | Digitação real do pedido, acelerada e indicada | O consultor informa as notas e pede fatos, dúvidas e próximos passos. |
| 20–30 s | Pedido enviado e processamento no ChatGPT; espera encurtada indicada | O Elo é usado dentro do chat, sem cadastro manual dos combinados em outra tela. |
| 30–65 s | Resposta real ampliada, mantida para leitura | Preferência confirmada, mudança de cidade pendente e tarefa do consultor com prazo. |

Pedido filmado: criar a personagem DEMO Lia Vídeo e registrar as notas da reunião de 18/10/2026, com a origem `demo-video-reuniao-1810`: Lia prefere reuniões à tarde; o consultor vai enviar duas opções de curso até 21/10; ela talvez mude de cidade, mas ainda não decidiu. Depois, consultar memória e tarefas.

O resultado visível confirma os três itens e os vincula à origem da reunião. O vídeo não demonstra repetição idempotente, resolução de conflito, reagendamento nem envio de WhatsApp. Esses comportamentos não são acrescentados à narração.

## Narração

| Início | Fala |
|---|---|
| 00 s | Você sai de uma reunião e os combinados se perdem nas anotações. Na próxima conversa, precisa reconstruir tudo. |
| 12 s | No Elo, você pede: registre as notas da reunião com a Lia, separe os fatos, as dúvidas e os próximos passos. |
| 23 s | Em vez de procurar os combinados espalhados no texto, você consulta uma memória organizada do relacionamento. Aqui, acompanhamos esse pedido no ChatGPT. |
| 35 s | A preferência por reuniões à tarde ficou confirmada. A mudança de cidade continua pendente, sem virar uma decisão. E enviar as opções virou uma tarefa do consultor, com o prazo combinado. |
| 53 s | Assim, as preferências, dúvidas e próximos passos ficam recuperáveis para o próximo contato. Você retoma o relacionamento com o contexto à mão. |

Voz neural **pt-BR-AntonioNeural**, ritmo `-3%`, tom `-1Hz`. O usuário ouviu a amostra e aprovou essa voz antes da montagem final. Sem música de fundo.

## Produção e reprodução

Narração gerada com **edge-tts 7.3.1**, instalado em ambiente Python isolado fora do repositório. A [documentação do projeto](https://github.com/rany2/edge-tts/blob/master/README.md) descreve o acesso ao serviço online de voz do Microsoft Edge. Apenas os textos fictícios desta narração foram enviados; capturas, notas reais, contatos e credenciais não foram enviados ao serviço de voz.

A [licença publicada](https://github.com/rany2/edge-tts/blob/master/LICENSE) é LGPLv3 para o módulo, com MIT para `srt_composer.py`. O módulo não foi incorporado nem redistribuído no código do Elo; o compositor chama seu executável externo. Nenhuma chave paga foi usada e nenhum plano foi contratado para esta produção. A licença do módulo não substitui os termos do serviço Microsoft nem constitui garantia de disponibilidade futura.

O [compositor](../../../scripts/narrate-demos.mjs) aceita voz neural diretamente ou áudio externo por trecho. Voz local `say` permanece disponível somente quando selecionada explicitamente; não é o padrão dos vídeos finais. Para preparar o ambiente:

```sh
python3 -m venv /tmp/elo-demo-voice
/tmp/elo-demo-voice/bin/python -m pip install edge-tts==7.3.1
```

Exemplo de configuração para novos vídeos:

```json
{
  "title": "Elo — uma história de uso",
  "input": "captura-editada-real.mp4",
  "output": "video-final.mp4",
  "tts": {
    "engine": "edge",
    "executable": "/tmp/elo-demo-voice/bin/edge-tts",
    "voice": "pt-BR-AntonioNeural",
    "rate": "-3%",
    "pitch": "-1Hz"
  },
  "segments": [
    { "at": 0, "text": "Um problema concreto inicia a história." },
    { "at": 8, "text": "O pedido e o resultado aparecem em uma execução real." }
  ]
}
```

Para reutilizar uma fala já gerada, adicionar `"audio": "fala.mp3"` ao segmento correspondente. Nesse caso, o compositor não chama o serviço de voz para aquele trecho. `--check` valida entradas sem gerar fala nem consultar vozes online. O programa recusa saídas existentes e falas sobrepostas; cada chamada de voz tem limite de 45 segundos. Não substitui silenciosamente uma voz neural indisponível por Luciana.

O MP4 usa H264/AAC em 1280×720 e contém legendas selecionáveis; o SRT também é fornecido separadamente. Os tempos das legendas são aproximados por trecho narrado. A proveniência registra hashes das capturas e do arquivo final, recortes, aceleração, corte de espera, cartão introdutório e quadro mantido para leitura. Não há reconstrução de tela ou resposta.
