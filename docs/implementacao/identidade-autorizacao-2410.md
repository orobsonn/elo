# Identidade e autorização — correções de 24/10/2026

Registro do PR #33 (integrado). A regra de autorização aqui descrita foi substituída pela [política v0.4.0](envio-por-pedido-v040.md); evidências deste PR permanecem históricas. Base `5055fd7` / v0.3.0. Não acessamos a instalação do Alan, não lemos credenciais nem dados do projeto irmão e não enviamos mensagens reais. Alan é fonte de evidência para um produto destinado a consultores em geral.

## Plano e critérios

1. Reproduzir agenda → webhook e LID → agenda, nomes e paginação em D1 local. Corrigir somente relações comprovadas, preservando homônimos e projeção privada. Reversão de código é possível; migração e reconciliação de dados exigem backup/recuperação, não apenas rollback do Worker.
2. Reproduzir preparação repetida e tentativa incerta. Manter ação imutável e consumo atômico; alinhar backend, MCP, Skills e documentação ao pedido exato que já autoriza. Nenhum modo permanente de autonomia.
3. Inspecionar plugin realmente instalado e catálogo exposto ao cliente; preparar pacote verificável e revisão independente. Rodar suíte completa, instalador, TypeScript e build sem deploy. Publicação só após apresentação ao dono.

## Causas comprovadas no repositório

- `capture.ts` escolhia `chatLid`, descartando a relação explícita com `phone`; `directory.ts` só encontrava `contacts.address` igual ao telefone. Fixtures reproduziram duas fichas e histórico fora da ficha encontrada pelo nome.
- A busca por nome completo já existia, mas a apresentação só substituía “Contato provisório”. Rótulos automáticos não acompanhavam mudanças na agenda.
- Uma sincronização nova parcial mantinha `completed_at` antigo. O cursor não estava vinculado a uma execução ativa nem à próxima página esperada.
- A Skill approve fonte e a efetivamente instalada v1.0.4 exigiam outra mensagem humana mesmo após pedido inicial exato. O backend devolvia orientação equivalente.
- A execução já tinha consumo único por ação, mas `action_prepare` criava novas ações idênticas, inclusive após tentativa incerta. O hash era só do texto, podendo coincidir entre propostas de destinatários distintos.

Esses resultados são sintéticos; não comprovam qual deles ocorreu no ambiente do Alan.

## Correções e decisões de engenharia

- Tabela privada de pares telefone/LID, delimitada por geração da conexão, com reserva de identidade por prova para impedir aprendizado contraditório em callbacks concorrentes. Só aprende par explícito recebido no callback aceito pela conexão ou na resposta documentada da Z-API. Não converte LID nem usa nome como identidade. Endereço técnico original é preservado quando já existe; o provedor documenta envio a LID.
- Agenda pode reparar histórico legado LID-only consultando `phone-exists-batch` para os telefones da página, somente quando existem LIDs ainda sem par. Respostas exigem número consultado/exato, LID válido e ausência de contradição. Uma reconciliação por chamada; se houver mais, o cursor retoma a mesma página. Sem prova, não funde.
- Reconciliação privada preserva a ficha com histórico/associações, move fontes e vínculos em transação, registra a associação, invalida ações pendentes e marca memória movida para revisão. Uma ficha de cliente já classificada é preservada ao receber uma duplicata técnica provisória com prova exata. Duas fichas classificadas, conflitos de alias/cadência/datas ou envios em execução/incertos impedem a fusão. A associação manual pública mantém seu contrato anterior.
- Exclusão esquece os dois endereços comprovados e remove pares; exportação autenticada inclui a tabela privada. MCP continua sem telefone/LID/nome completo estruturado.
- Nomes automáticos passam a ter origem explícita; alias manual é preservado. Aliases antigos sem origem verificável são tratados como manuais por segurança; o índice de busca continua sendo atualizado pelo nome atual.
- Sincronização usa operações SQL em lote e payload JSON para respeitar limites de parâmetros/consultas por chamada, sem leituras por contato. Tem execução e página esperada; novo percurso zera conclusão anterior e invalida cursores antigos. Conclusão descreve a lista observada, não snapshot imutável do provedor nem garantia de agenda do celular inteira.
- Proposta idêntica pendente é reutilizada. Reutilização confere também alias; a inserção verifica novamente propostas aceitas dentro da transação para fechar a corrida entre preparo e aceite. Tentativa em execução/incerta continua na mesma referência. Índice único evita duas propostas abertas simultâneas equivalentes. A migração cancela propostas pendentes com hash antigo, preservando tentativas executando/incertas. Integridade nova inclui ação, contato, versão de endereço, conexão, epoch e texto; o hash não é prova de autoria humana.
- Pedido exato do dono autoriza aquela mensagem; texto escrito pela IA precisa de uma apresentação e um approve. Mudanças materiais precisam de autorização atual. Dados recebidos nunca autorizam. Pausa operacional e confirmação do host continuam camadas próprias.

## Revisão adversarial

Revisor independente antes da implementação atacou identidade, replay, exclusão, concorrência, prova de autorização e custo. Incorporados: vínculo explícito e versionado, merger privado, bloqueio de conflitos/envio em voo, preservação de histórico, esquecimento dos dois endereços, cursor por execução e proteção contra preparar cópia incerta.

Limites: a autenticação do callback é posse do segredo da rota, não assinatura criptográfica da Z-API. Pares são versionados; fichas/endereço legados continuam globais dentro da instalação individual, como antes. Não há isolamento multiusuário a anunciar. Eventos contraditórios são rejeitados com erro seguro, sem fusão; exigem diagnóstico e não têm replay garantido. Não expandir silenciosamente o escopo para um sistema de quarentena ou migração de número.

## Plugin e catálogo efetivo

Inspeção read-only confirmou plugin pessoal Elo `plugin_asdk_app_6ad36d6a59f881919b3de4f512858abf`, versão **1.0.4**, release `pluginrel_6ad4dbd3d7988191b2414e187ec6ee7b`. A Skill approve instalada continha a regra redundante; configurar-elo estava atrás do repositório. O catálogo da sessão expõe as descrições antigas de `action_prepare`/`action_execute`.

`plugin/plugin.json` e `scripts/package-plugin-update.py` preparam overlay **1.0.5**, com manifest portable e compatibilidade legada, approve/configurar-elo e referências locais. Preservam identidade do App, conexão, escopo, apresentação e demais Skills (inclusive elo-preparar-pauta, que não pertence à fonte deste repositório). Metadados de origem em `plugin/elo-source.json`. O pacote é overlay do plugin pessoal inspecionado, não um instalador universal: outra instalação exige conferir sua própria identidade/release e conexão. Não publica nem altera o cache do cliente. Backend MCP inclui instruções de inicialização e descrições novas; ferramentas mantêm seus schemas de envio.

## Ativação proposta após aprovação

1. Confirmar backup/bookmark de D1 e versão ativa; pausar envios durante a migração. Aplicar migration 0009 e upload versionado com validação isolada. Um rollback de Worker não desfaz reconciliações nem migrações D1.
2. Validar autenticação e contratos em preview e promover a versão somente após os smokes. Não usar clientes reais como teste.
3. Reler a release atual do plugin; comparar com a esperada e reconciliar qualquer alteração. Publicar o overlay 1.0.5 pela identidade existente, mantendo os outros arquivos, e reler os arquivos salvos.
4. Atualizar/recarregar plugin e reconectar/atualizar catálogo MCP no cliente; abrir nova conversa e conferir as instruções efetivamente carregadas. Claude recebe as mesmas Skills atualizadas por seu mecanismo de instalação. ZIP pronto não comprova atualização em nenhum cliente.
5. Em instalação do Alan, com autorização de acesso e minimização de dados: confirmar versão/agenda/cobertura, comparar vínculos no backend sem expor endereços à IA, atualizar agenda e validar busca pelo nome + histórico. Eventual teste de envio somente a destino controlado expressamente autorizado; nenhum envio real foi feito nesta entrega.

A eliminação de perguntas repetidas não cria autonomia permanente. Modos restrito/conservador/YOLO são hipótese futura; esta entrega conserva autorização pontual e evita impor outra pergunta ao pedido que já a contém.

## Fontes do contrato externo

- [Z-API: LID e exemplo com telefone/LID](https://developer.z-api.io/tips/lid).
- [Z-API: agenda e paginação](https://developer.z-api.io/contacts/get-contacts).
- [Z-API: consulta de vínculos em lote](https://developer.z-api.io/contacts/get-iswhatsapp-batch).
- [Cloudflare: atomicidade de D1 batch](https://developers.cloudflare.com/d1/worker-api/d1-database/).

## Evidências da validação local

- Regressões vermelhas observadas antes dos respectivos fixes: separação LID/telefone, histórico legado, nome automático, conclusão antiga da agenda, proposta duplicada, alias manual, vínculo contraditório simultâneo, corrida com callback phone-only, re-criação de ficha aposentada, preparo após mudança de alias/aceite e limite de parâmetros D1. Esses casos agora integram a suíte.
- `npm run test:all`: 216 testes Vitest em 14 arquivos + 23 testes do instalador/recuperação, sem falhas. `npm run check`: exit 0. Build é `wrangler deploy --dry-run`, sem publicar.
- Página sintética com cem respostas testada sob limites impostos de até cem parâmetros por consulta e cinquenta comandos preparados por chamada. Não é medição de latência/custo em produção nem certificação de plano Free.
- Ensaio independente da Skill em oito cenários: pedido exato executa sem nova pergunta; approve claro executa ação apresentada; acréscimo da IA pede autorização nova; instrução recebida não autoriza; timeout só consulta; homônimo pede escolha; escolha completa pedido com texto já definido; permissão permanente não ativa envios. Simulação, sem conector ou gesto humano real no host.
- Validadores das duas Skills passaram; pacote de plugin aberto e conteúdo conferido contra as fontes. A revisão adversarial final revalidou os fixes no código e nos testes. Não houve deploy, promoção, release do produto, atualização do plugin instalado ou envio real.

Avisos das ferramentas locais: sourcemaps ausentes no SDK MCP, depreciação punycode, SQLite experimental e aviso de binding AI remoto. As regressões de provedor usam fetch/adaptador controlados; não foi usada inferência remota para simular resultado.
