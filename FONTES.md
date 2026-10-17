# Fontes do Elo

## Precedência

1. Decisões de Robson consolidadas no [PRD v1.1](docs/prd/elo-v1.md).
2. Evidência técnica e experimental, com os limites de cada relatório.
3. [BRIEF.md](BRIEF.md) e [CONTEXT.md](CONTEXT.md), preservados como histórico; suas perguntas antigas não reabrem decisões já respondidas no PRD.

## Pesquisa de necessidade

Entrevistas e materiais de formação foram lidos localmente e motivaram os fluxos de memória, pós-reunião, acompanhamento e uso no celular. Na documentação pública, participantes aparecem por códigos S01–S05. Identidade divergente em uma fonte não foi resolvida por suposição. Relatos individuais não comprovam ganho universal ou economia garantida de tempo.

Transcrições, apresentações, links de acesso aos materiais e o índice original ficam em `fontes/privadas/`, ignorado pelo Git. Esse acervo não é necessário para implementar os critérios do PRD. A versão pública não contém os arquivos privados nem seus caminhos individuais de origem.

## Referências técnicas auditadas

- Segundo Cérebro: [repositório](https://github.com/orobsonn/segundo-cerebro). Inspiração de memória; não foi incorporado seu código ao produto.
- Oráculo, Victor MCP e template Expert Governança: inspeção estática documentada em [referências de código](docs/pesquisa/referencias.md). Reaproveitamento deve ser seletivo, com verificação de licença/permissão antes de copiar código.
- [WhatsApp e clientes de IA](docs/pesquisa/whatsapp-clientes.md): separa REST, webhook, MCP e dependências dos clientes.
- [Instalação Cloudflare](docs/pesquisa/instalacao-cloudflare.md): alternativas e fontes consultadas; propostas antigas de front e estimativas de retenção não prevalecem sobre o PRD.
- [Revisão adversarial original](docs/pesquisa/revisao-adversarial.md) e [método/roteamento](docs/pesquisa/metodo.md).

## Inferência sintética

- Primeiro ensaio Clef: [relatório](docs/pesquisa/clef-memoria-30dias.md), [evidências](docs/pesquisa/clef-avaliacao-sintetica.json).
- Comparação de 30 dias: [relatório](docs/experimentos/memoria-30dias/RELATORIO.md), [corpus](docs/experimentos/memoria-30dias/dataset.json), [análise offline](docs/experimentos/memoria-30dias/analysis.json) e [revisão independente](docs/experimentos/memoria-30dias/revisao-resultados.md).
- O experimento usou Llama 3.3/Qwen e Clef, não DeepSeek ou Llama 4 Scout. Seus dados são fictícios; endereços de exemplo usam domínio reservado. Não modificar os resultados antigos para refletir escolha posterior de modelo.

## Escolha posterior do modelo e fechamento

Robson relatou bons testes próprios com Llama 4 Scout e aceitou usar DeepSeek na Cloudflare. A escolha inicial de engenharia é [DeepSeek V4 Flash](https://developers.cloudflare.com/workers-ai/models/deepseek-v4-flash-0731/), disponível sob Workers Paid ou créditos AI Gateway; [Scout](https://developers.cloudflare.com/workers-ai/models/llama-4-scout-17b-16e-instruct/) é alternativa configurável a validar. Documentação conferida em 16/10/2026. Disponibilidade não prova qualidade no Elo.

Robson autorizou fechar o PRD, publicar este repositório de forma pública e criar as issues no padrão `harness-issues` vendorizado em `.pi/`. A implementação será iniciada em outra sessão, por goal, preservando a qualidade do harness sem executar sua cerimônia. [Entregas](docs/entregas/elo-v0.md) e [prompt de início](docs/prompts/implementar-elo-v0.md).
