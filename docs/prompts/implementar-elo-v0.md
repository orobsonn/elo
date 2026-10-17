# Prompt para iniciar a implementação do Elo em outra sessão

Copie o bloco abaixo para uma nova sessão aberta na pasta do projeto. Ele autoriza
iniciar um goal; não cria um goal nem inicia implementação nesta sessão documental.

```text
Trabalhe em /Users/robson/Desktop/dev/elo, repositório https://github.com/orobsonn/elo.

Inicie um goal para implementar as quatro entregas da V0 do Elo, com testes,
revisão independente e documentação, até concluir todo o trabalho que possa ser
feito autonomamente e deixar identificados os aceites que exijam minha ação real.
Não atribua orçamento de tokens que eu não defini. Use create_goal se disponível;
se houver goal ativo, confira o objetivo antes de tentar criar outro.

Leia AGENTS.md, docs/prd/elo-v1.md, docs/entregas/elo-v0.md e as quatro issues vivas
referenciadas em docs/entregas/manifesto.json. Inspecione o código e o Git atuais:
a documentação pode ter sido escrita antes da implementação. Preserve mudanças
existentes e não repita uma entrega já comprovada.

Execute a ideia de qualidade do Pi Harness, mas SEM sua cerimônia. Essa é uma
exceção explícita do operador para este goal: não iniciar harness_delivery,
classify/mark/seals, gates de entrevista ou máquina de estados/recibos do harness.
Não instalar .Codex ou outro harness, não modificar o .pi para desativar proteções,
não fabricar aprovação ou evidência. Leia os contratos em
.pi/harness/skills/harness-delivery/references/delivery-contract.md e
.pi/harness/skills/harness-rules/references/governance-contract.md para preservar
os princípios de escopo, segurança, TDD, revisão adversarial e verificação.

O PRD está fechado como base de produto. Monte um plano de execução curto a partir
das issues e avance sem nova entrevista de descoberta ou pedidos de confirmação
de detalhes técnicos rotineiros. Decida engenharia e registre a razão; não me
peça para validar arquitetura, segurança ou banco. Se uma limitação real mudar
o produto, apresente o impacto concreto e continue as partes independentes.

Ordem: E1 base/captura; E2 envio aprovado; E3 memória/retenção; E4 Skills e
instalação completa. E2/E3 dependem de E1; E4 integra as três. Paralelize apenas
tarefas independentes com arquivos/contratos delimitados. Cada issue é uma entrega
coesa; não crie dezenas de microissues nem abstrações sem necessidade.

Se o host permitir escolher modelos, orquestre com GPT-6.1 Sol/high. Use Sol/medium
para tarefas delimitadas. Reserve Astra/high para decisões de alta alavancagem e
ataques adversariais dos caminhos críticos de autenticação, envio e dados. Evite
contexto completo em cada agente, coleta redundante e revisão repetida sem mudança
material. Modelo indisponível deve ter substituição explícita, não alegada.

Preserve este produto:
- Infraestrutura individual Cloudflare, Workers + D1, sem SaaS central; MCP
  funcional em Claude e ChatGPT. Não presumir que protocolo comum prova paridade.
- Z-API: captura normalizada, contatos com ID/alias e destinatário resolvido
  exclusivamente no backend. Sem telefone/JID/LID/CPF/e-mail/sobrenome em campos
  estruturados das tools. Texto da conversa pode conter dados pessoais;
  anonimização universal não faz parte do escopo.
- V0: WhatsApp individual somente texto. Approve pela Skill no chat, com
  destinatário/conteúdo exatos. Nada de tela de approve, grupos, anexos ou lote.
  Backend valida vínculo e consumo; não fingir prova independente de gesto humano.
- Histórico bruto ativo até 30 dias. Memória concisa e informação a avaliar podem
  permanecer. Fatos claros sem conflito entram automaticamente; dúvidas/conflitos
  ficam pendentes com fonte/data e revisão, sem copiar a conversa inteira.
- Extração auxiliar backend com DeepSeek V4 Flash na Cloudflare, schema compatível
  e validação local, sem Clef obrigatório. Modelo configurável; Scout é alternativa
  explícita, sem roteador/failover automático por padrão. DeepSeek ainda precisa
  passar os aceites do Elo; o experimento Llama 3.3 não prova sua qualidade.
- Processamento limitado, retries limitados e contexto incremental testado; webhook
  não espera inferência e expurgo não depende de sucesso da IA.
- Rotinas/brief/GPS/approve são Skills; cron no Work/Cowork. Mecanismos técnicos
  de processamento/retentativa/limpeza são permitidos, sem agendador de agentes.
- Otimize meu processo entrevista, entende as capacidades reais da plataforma,
  cria/adapta uma Skill e testa com a pessoa; GPS é só um exemplo.
- Instalação fácil para leigos, preferindo botão/roteiro guiado. Única tela própria:
  configurar Z-API e fornecer webhook. Não criar CRM/dashboard. DeepSeek exige
  Paid/créditos; mostrar custo, sem prometer que US$5 cobrem todos os serviços.

Para comportamento de produto, escreva testes que observem a fronteira correta,
mostrem a falha relevante e passem após a implementação. Priorize isolamento,
autenticação, projeção, webhook repetido/fora de ordem, quatro Marios, conflitos,
paginação/retomada, expiração, concorrência de envio, timeout incerto e restauração.
Não tratar mock de provedor como prova de integração live ou teste sequencial
como prova de atomicidade. Rode checagens proporcionais no código final; não
repetir toda a suíte sem mudança ou incerteza nova. Revise de forma independente
as decisões técnicas não triviais e o diff crítico; corrija achados materiais.

Pode criar código, dependências, migrations, testes, Skills, configuração e docs;
commitar e enviar branches deste projeto ao GitHub e abrir PRs para revisão. Não
publicar release, fazer merge, ativar fila automática ou implantar em produção
sem autorização específica. Se abrir PR, anexe-o à sessão com a ferramenta do app.
Não ler/exibir segredos em prompts, logs ou commits, nem subir fontes/privadas.

Use dados sintéticos. Minha conta paga Cloudflare pode ser usada para ensaios
delimitados de inferência e recursos NOVOS de teste isolados do Elo, com nomes
inequívocos e custo/uso registrado; não alterar recursos de outros projetos,
comprar planos ou criar custos recorrentes novos sem me apresentar a necessidade.
Não conectar meu WhatsApp, acessar conversa real ou enviar mensagem real sem
autorização específica para número/controlador. Antes de uma etapa humana
inevitável, conclua o que puder e deixe o fluxo pronto para eu executar.

Mantenha issues atualizadas com evidências. Não fechar issue com aceite material
pendente nem marcar goal como atingido por esgotamento de tempo/contexto. O goal
de implementação autônoma pode encerrar quando todo o trabalho autorizável sem
minha intervenção estiver entregue, testado e revisado, e o que depende de mim
estiver explicitamente listado, sem afirmar que o piloto/produção já passaram.

No final, entregue links dos PRs/commits, issues concluídas ou ainda abertas,
testes/resultados, custos medidos e uma lista numerada curta das ações humanas
restantes, com instrução concreta. Explique o estado real: local, sandbox ou
produção. Não pare só no planejamento ou em um esqueleto de projeto.
```
