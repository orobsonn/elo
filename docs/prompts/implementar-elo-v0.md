# Prompt para iniciar a implementação do Elo em outra sessão

Copie o bloco abaixo para uma nova sessão aberta na pasta do projeto. Ele autoriza
iniciar um goal; não cria um goal nem inicia implementação nesta sessão documental.

```text
Trabalhe em /Users/robson/Desktop/dev/elo, repositório https://github.com/orobsonn/elo.

Inicie um goal para implementar as quatro entregas da V0 do Elo, revisar, testar
e fazer deploy funcional na minha conta pessoal Cloudflare, validando o que
puder no ambiente publicado. Conclua todo o trabalho que possa ser feito
autonomamente e identifique os aceites que realmente exijam minha ação.
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
commitar e enviar branches deste projeto ao GitHub e abrir PRs para revisão.
Após testes e revisão independente, pode integrar suas entregas à main, desde que
os checks aplicáveis estejam verdes e não existam achados materiais pendentes.
Não burlar proteções/revisões exigidas pelo repositório nem sobrescrever trabalho
alheio; se uma regra externa impedir merge, mantenha o PR pronto e registre isso.
Se abrir PR, anexe-o à sessão com a ferramenta do app. Não publicar GitHub Release
ou tags automaticamente, nem configurar scheduler/fila do harness. As labels
harness:ready das issues foram autorizadas; seus bloqueios continuam valendo.
Não ler/exibir segredos em prompts, logs ou commits, nem subir fontes/privadas.

AUTORIZAÇÃO DE DEPLOY: depois de implementar e revisar, publique o Elo na minha
conta PESSOAL Cloudflare (Robson Lins), não apenas em localhost ou preview. Não
solicite novamente autorização de deploy já dada neste prompt. Confira a conta
por metadados/CLI/conector e fixe o alvo correto; não adivinhe pela primeira conta
listada. Pode criar os recursos necessários do próprio Elo, bindings, migrations
e configuração de execução nessa conta paga. Não alterar serviços, bancos, DNS
ou credenciais de outros projetos, comprar domínios/planos ou serviços externos.
Use nomes inequívocos do Elo; dados e testes devem ser sintéticos. Registre uso e
custos, sem tomar US$5 como teto de todos os serviços.

MODO DE DEPLOY para este goal: use publicação versionada com validação antes de
promover tráfego, quando suportada pelo caminho escolhido: upload, smoke preview,
promover a versão validada e smoke no endereço publicado. Essa escolha faz parte
do prompt, sem nova pergunta de modo. No primeiro provisionamento, execute somente
o bootstrap necessário; uma limitação real do provedor deve ser registrada e ter
validação equivalente no caminho possível. Não confundir upload com versão ativa.
Migrations de banco não são revertidas só por rollback do Worker: planeje aplicação
compatível/recuperação e não destrua dados para tentar corrigir um deploy.

Valide o que conseguir no ambiente PUBLICADO: saúde e bindings reais, autenticação,
rejeição de acesso indevido, MCP, projeção de identificadores, paginação, escrita/
consulta de memória sintética, extração DeepSeek, retenção e diagnóstico seguro.
Teste também concorrência/replay/timeout nas fronteiras controláveis. Confira o
commit/versão efetivamente ativo e sua saúde depois da promoção; se houver falha,
diagnostique/corrija e repita a checagem afetada. Reverter Worker quando aplicável,
sem apresentar rollback de código como rollback automático de dados. Não criar
bypass ou endpoint público de teste no deploy para facilitar os smokes.

Z-API: ainda NÃO comprei a instância. Não compre, não espere suas credenciais e
não pare a implementação ou deploy por essa ausência. Conclua adaptador, captura,
validação de callback, tools, tela/configuração e testes locais/controlados do
provedor. Sem configuração válida, as operações dependentes devem informar
WhatsApp não configurado, sem simular sucesso e sem aceitar callback desprotegido.
Provedor fake é recurso de teste isolado, nunca rota alternativa pública de envio.
Não alegar recebimento, entrega ou conexão real testados sem a instância.

Não conectar meu WhatsApp, acessar conversa real ou enviar mensagem real sem
autorização específica para número/controlador. Deixe para mim apenas contratar
a instância Z-API, inserir credenciais em superfície protegida, parear o número/
configurar webhook e as aprovações humanas inevitáveis dos clientes. Antes dessa
etapa, conclua tudo que independe dela; mantenha instrução curta e diagnóstico
por etapa, sem me pedir para programar ou depurar. Execução real no Claude/ChatGPT,
celular e crons só pode ser declarada testada se exercitada de fato.

Mantenha issues atualizadas com evidências. Não fechar issue com aceite material
pendente nem marcar goal como atingido por esgotamento de tempo/contexto. O goal
de implementação/deploy autônomos pode encerrar quando o código estiver entregue,
testado, revisado e publicado na minha conta com smokes aprovados, e os aceites
que dependem de mim/Z-API estiverem explicitamente listados. Não encerrar só com
PR draft, build local ou upload sem confirmar tráfego/saúde. Issue com aceite live
pendente continua aberta e anotada; não alegar que o WhatsApp ou o piloto já passaram.

No final, entregue URL publicada, conta e nome do Worker, commit/versão ativa,
resultado dos smokes/testes, rollback quando aplicável, links dos PRs/commits,
issues concluídas ou ainda abertas, custos medidos e lista numerada curta das
ações humanas restantes. Separe claramente o que rodou publicado, em sandbox,
com provedor fake e o que espera Z-API/cliente real. Não pare no planejamento,
esqueleto, localhost ou PR. Quero encontrar o máximo funcionando ao retomar.
```
