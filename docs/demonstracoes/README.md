# Demonstrações do Elo

Vídeos curtos para apresentar a solução ao Ronald, ao Lucas e a quem vai usá-la. Cada vídeo mostra uma execução real no ChatGPT ou Claude conectado ao Elo, com voz em português e legendas. O primeiro vídeo está pronto; a série completa ainda está em produção.

As capacidades atuais vêm do [primeiro uso](../operacao/primeiro-uso.md), das [Skills](../../skills/) e da [pauta](../exemplos/elo-preparar-pauta/SKILL.md). A busca de contatos sem histórico foi [publicada e validada](../implementacao/agenda-whatsapp-prova-1810.json): 935 contatos mapeados, busca pelo nome, preparo e cancelamento sem envio.

## Estado da gravação em 18/10/2026

**Entregue:** [memória e pós-reunião — MP4](03-memoria-e-pos-reuniao.mp4), [legendas](03-memoria-e-pos-reuniao.srt) e [proveniência](03-memoria-e-pos-reuniao.json). Duração de 57 segundos, 720p, narração Luciana em português brasileiro, áudio AAC e legenda selecionável. Execução real: criação de contato fictício e reunião pela Skill, seguida de consulta de fato confirmado, dúvida pendente e tarefa do consultor. Espera encurtada e quadro final prolongado estão indicados. Quadros e faixa de áudio foram conferidos; nenhuma mensagem real ou segredo entrou no vídeo.

Também foram capturados diagnóstico e início da alteração de prazo/data especial; início de chamada não é prova de conclusão da alteração posterior. Os demais itens da série abaixo são roteiro, não vídeos entregues.

O navegador reiniciou e o controle de tela passou a recusar gravações. O diagnóstico do Computer Use confirmou o Mac bloqueado e a falha de desbloqueio automático; foi solicitado desbloqueio manual ao dono. Isso bloqueia novas capturas, não o Elo publicado. A issue [#23](https://github.com/orobsonn/elo/issues/23) permanece aberta enquanto a série e o vídeo geral estiverem pendentes.

Ao terminar este trecho, o contato fictício da gravação foi excluído pelo MCP para retirar a tarefa e o aniversário de demonstração do uso diário. Os contatos reais mapeados na agenda foram preservados. As próximas capturas deverão criar uma nova ficha fictícia.

## Preparação comum

- Gravar apenas a janela do cliente, sem barras com outros chats, notificações, e-mails, números, segredos ou autorizações. Fazer login antes de gravar. Não gravar QR, formulário de credenciais nem consentimento com dados pessoais.
- Usar a personagem **DEMO Lia**, com anotações, compromissos e mensagens fictícias. Não misturar a demonstração com a ficha de uma pessoa real.
- Datas dos exemplos devem ser ajustadas à data da gravação, usando `America/Fortaleza`. Mostrar os nomes reais das ferramentas acionadas e suas respostas, sem fingir execução escrevendo texto.
- O vídeo de contatos do WhatsApp exige um contato de demonstração controlado na agenda conectada, sem conversa capturada no Elo. Não mostrar lista com nomes reais. Se essa condição não existir, registrar a dependência; uma ficha criada manualmente não demonstra importação da agenda.
- A revisão diária atual é por período e pode trazer contatos reais. Gravá-la somente em instalação/período comprovadamente sintético; não abrir uma lista global de mensagens reais para depois tentar esconder no vídeo.
- Nos vídeos de mensagem, preparar e cancelar. Nenhum envio novo a uma pessoa real está autorizado por estes roteiros. Prova de envio real exige destinatário, texto e aprovação específicos, separados da autorização para filmar.
- Gravar em 1280×720 ou resolução superior, interface ampliada e texto legível. Cortar esperas é permitido, desde que o corte seja indicado e não altere a ordem da ação ou o resultado.

## Série proposta

| Arquivo | Duração pretendida | Jornada e prova na tela |
|---|---:|---|
| `01-conexao-e-diagnostico.mp4` | 45–60 s | Elo selecionado no cliente; diagnóstico autenticado; conexão e versão observadas. Página de configuração já conectada, sem campos secretos. Não simular instalação do zero. |
| `02-contato-sem-historico.mp4` | 60–90 s | Procurar o contato controlado que ainda não tinha mensagens no Elo; consultar a agenda pelo fluxo entregue; obter referência interna e preparar uma mensagem sem pedir telefone. Cancelar a ação. Homônimos exigem escolha. |
| `03-memoria-e-pos-reuniao.mp4` | 60–90 s | Registrar notas fictícias com origem estável; reler fato, dúvida e fonte; repetir a mesma origem e comprovar ausência de duplicação. Adicionar versão conflitante e mostrar pendência. Distinguir importação pela Skill de extração automática do backend. |
| `04-tarefas-datas-e-atencao.mp4` | 45–75 s | Consultar compromisso do consultor, prazo e uma data especial fictícia; mostrar atenção do período; reagendar/concluir uma tarefa e reler o estado. Não converter aspiração em compromisso. |
| `05-revisao-diaria.mp4` | 60–90 s | Revisar o período sintético, mostrar prioridades e cobertura; marcar só o que foi avaliado. Exibir a fronteira entre conjunto capturado e todo o WhatsApp. Não anunciar execução automática de Work/Cowork com base nessa execução manual. |
| `06-preparar-aprovar-cancelar.mp4` | 45–75 s | Pedido, ferramenta de preparo, destinatário e texto exatos, espera por outro turno humano, cancelamento e releitura do estado. Sem chamar a ferramenta de envio. O título na tela deve dizer “preparo e cancelamento”, pois o vídeo não prova entrega. |
| `07-pauta-e-rotina.mp4` | 60–90 s | Preparar pauta com memórias/tarefas de DEMO Lia; separar fatos, autoria e dúvidas. Mostrar a Skill de rotina disponível no cliente, a adaptação de um processo hipotético e sua execução sintética. Não alegar entrevista ou ganho de tempo medido. |
| `08-visao-geral.mp4` | 120–180 s | Uma jornada contínua: encontrar a pessoa, registrar reunião, consultar memória e próximos passos, preparar pauta e rascunhar retorno com revisão humana. Usar capturas reais dos vídeos anteriores, com transições de capítulo. |

Histórico e fontes aparecem nos vídeos 03/05; recebimento e memória por blocos podem ser demonstrados com conversa exclusivamente sintética e releitura após o processamento, sem afirmar que um resumo de reunião foi produzido pelo cron. Exportação, exclusão, recuperação e retenção são operações do dono: se entrarem na apresentação, filmar apenas um ensaio isolado sintético, sem transformar o vídeo de uso diário em um tutorial administrativo. Limites da V0 — texto individual, sem grupos/anexos e com aprovação no chat — devem aparecer no vídeo geral.

## Pedidos para a gravação

**Conexão.** “Use o Elo para mostrar o diagnóstico desta instalação: versão, conexão e limites. Não mostre nomes de contatos, números nem conteúdo de mensagens.”

**Encontrar sem conversa.** “Procure DEMO Lia na agenda do WhatsApp, mesmo sem conversa no Elo. Se houver mais de uma pessoa, peça para eu escolher. Prepare o texto ‘Podemos conversar sobre a reunião de amanhã?’, mostre a proposta e aguarde. Não envie.” Depois: “Cancele esse rascunho.” Adaptar a formulação ao fluxo de sincronização realmente entregue; não inventar nomes de ferramentas.

**Pós-reunião.** “Use a Skill pós-reunião com DEMO Lia, reunião em [data], America/Fortaleza, origem demo-video-reuniao-v1. Notas fictícias: Lia prefere reuniões à tarde. Eu, consultor, vou enviar duas opções até [data]. Ela talvez mude de cidade, mas ainda não decidiu. Registre e consulte o que ficou salvo.” Repetir a mesma origem. Uma segunda origem fictícia informa preferência de manhã e deve ficar pendente quando conflitar com a anterior.

**Tarefas e datas.** “Consulte as tarefas de DEMO Lia, mostre quem deve fazer cada uma e os prazos. Registre a data fictícia combinada de revisão em [data] pelo campo apropriado, sem tratá-la como aniversário. Reagende a tarefa das opções para [data] e confira.” Em outro turno, concluir a tarefa e consultar novamente.

**Revisão.** “Use a Skill revisão diária para [período exclusivamente sintético], America/Fortaleza. Mostre prazos, pendências, cobertura e limites. Marque só as fontes realmente avaliadas. Não prepare nem envie WhatsApp.”

**Preparo e cancelamento.** “Use approve para preparar para DEMO Lia o texto exato ‘Teste de demonstração do Elo. Este rascunho será cancelado.’ Mostre destinatário e texto e aguarde. Não envie.” Em outro turno: “Cancele esse rascunho.” Consultar o estado cancelado.

**Pauta.** “Use a Skill de pauta do Elo para DEMO Lia, com referência em [data], America/Fortaleza. Consulte memória e tarefas; organize até cinco tópicos com dúvidas, compromissos e fontes. Não altere os dados nem envie mensagem.” Para Otimize meu processo, declarar que o consultor e a rotina são hipotéticos; seguir a entrevista curta da Skill e mostrar um exemplo executado, sem dizer que houve validação por um consultor real.

## Narração sugerida

As falas abaixo só devem acompanhar passos efetivamente visíveis. Dividi-las em frases de até quinze segundos e alinhar cada fala ao momento correspondente da gravação.

1. “O Elo funciona dentro da IA que a pessoa já utiliza. Aqui eu consulto a instalação conectada e confiro se o WhatsApp está disponível.”
2. “Eu peço pelo nome. Quando a pessoa ainda não tem conversa no Elo, a integração consulta os contatos do WhatsApp. A referência de envio fica no backend. Se houver nomes repetidos, eu escolho antes de preparar a mensagem.”
3. “Depois de uma reunião, registro as notas. O Elo guarda fatos claros, separa dúvidas e cria os próximos passos com a fonte original. Repetir a mesma origem não duplica o registro. Uma informação conflitante fica para revisão.”
4. “Os compromissos têm responsável e prazo. Eu vejo o que exige atenção, ajusto uma tarefa e confirmo que a alteração ficou salva.”
5. “Na revisão diária, a IA consulta o período, organiza as prioridades e informa o que conseguiu avaliar. A cobertura é das conversas capturadas pelo Elo.”
6. “Pedir uma mensagem começa pelo rascunho. Eu vejo a pessoa e o texto exatos; a IA aguarda minha confirmação. Neste exemplo, cancelo o rascunho e confiro que nada foi enviado.”
7. “Antes da próxima reunião, a pauta reúne compromissos, dúvidas e fontes. As Skills também permitem adaptar uma rotina à forma de trabalho do consultor.”
8. “O Elo conecta conversa, memória e ação dentro do chat. A pessoa encontra um contato, preserva o contexto e organiza o acompanhamento. Um retorno pelo WhatsApp continua passando pela revisão humana.”

## Montar os arquivos

Ferramentas conferidas em 18/10/2026: `say` com voz Luciana em português brasileiro, `ffmpeg` e `ffprobe`. O compositor [narrate-demos.mjs](../../scripts/narrate-demos.mjs) usa essas ferramentas, sem novos pacotes. Ele não grava a tela nem cria interfaces fictícias; recebe o arquivo capturado de uma execução real. Remove o áudio original, acrescenta narração, faixa de legendas e SRT separado, preserva a proporção com barras quando necessário e só estende o último quadro se a fala terminar depois da imagem.

Criar um manifesto fora do repositório com a gravação e falas alinhadas aos segundos reais:

```json
{
  "title": "Elo — preparo e cancelamento",
  "input": "/caminho/privado/captura-real.mov",
  "output": "/caminho/do/repo/docs/demonstracoes/06-preparar-aprovar-cancelar.mp4",
  "voice": "Luciana",
  "rate": 165,
  "segments": [
    { "at": 0, "text": "Pedir uma mensagem começa pelo rascunho." },
    { "at": 8, "text": "Aqui eu confiro a pessoa e o texto, enquanto a IA aguarda." },
    { "at": 18, "text": "Neste exemplo, cancelo e confirmo que nada foi enviado." }
  ]
}
```

```sh
node scripts/narrate-demos.mjs /caminho/privado/manifesto.json --check
node scripts/narrate-demos.mjs /caminho/privado/manifesto.json
```

O script recusa sobreposição de falas e saídas já existentes. Gerará MP4, SRT e JSON com hashes de origem/resultado, duração, voz e edição realizada. Legendas são uma faixa selecionável no MP4 e também um arquivo separado; alguns reprodutores exigem ativá-las. O tempo das legendas é aproximado por trecho narrado. Não altera os resultados exibidos na tela. Cada arquivo fica abaixo de 95 MiB para publicação pelo GitHub; vídeos individuais devem ter de 45 a 90 segundos e o geral até três minutos. Falas e cortes devem ser ajustados à gravação, nunca o contrário.

Guardar os MP4 finais, SRT e proveniência nesta pasta. Capturas brutas, manifestos com caminhos locais e sessões ficam fora do Git. Antes de versionar: assistir à imagem e à voz integralmente, conferir legibilidade/legendas, confirmar ausência de informação pessoal, comparar cada afirmação ao resultado visível e atualizar a tabela abaixo com os nomes existentes. Não publicar um vídeo com pessoas reais na lista de contatos, mesmo que o número esteja oculto.

## Entregas

| Vídeos | Estado |
|---|---|
| Série por jornada e apresentação geral | Roteiros preparados; gravações e revisão dos arquivos finais pendentes |

O vídeo geral deve terminar com os limites comprovados da versão filmada. Recebimento, aceitação pelo provedor, entrega e leitura são estados distintos. Uma gravação de preparo/cancelamento não comprova envio; um vídeo de revisão manual não comprova agendamento. A apresentação é material para avaliação do Ronald e do Lucas, sem envio automático ao grupo.
