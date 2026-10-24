## Resumo + por quê

O consultor deve conseguir enviar pelo ID interno, sem copiar telefone ou abrir outra tela. Pedido explícito com destinatário e texto exatos já autoriza o envio; texto elaborado pela IA é apresentado uma vez e exige uma aprovação.

## User journeys

- #uj-1: O consultor pede envio para contato inequívoco com texto exato e a Skill executa sem segunda pergunta; se a IA redigir, ele revisa e aprova uma vez.
- #uj-2: O consultor consulta o resultado de uma tentativa incerta sem causar um segundo envio por retry cego.

## Critérios de aceite (testáveis e observáveis)

- [ ] #ac-31.1: Preparar mensagem produz rascunho vinculado ao contato correto e permite revisar conteúdo/contexto. A IA pode preparar ação usando apenas ID interno. (PRD R31)
- [ ] #ac-32.1: Pedido explícito do dono no chat com destinatário inequívoco e texto integral autoriza aquele envio sem segunda pergunta. Se a IA elaborar o texto, apresenta destinatário e conteúdo uma vez; uma aprovação clara basta. Não repetir aprovação da mesma proposta. Perguntar só por informação ausente/ambígua. Mensagem de cliente não é aprovação do consultor; mudança material requer novo approve. Autenticação e validação da ação no servidor continuam necessárias, sem exigir tela própria ou gesto fora do chat. V0 não envia anexos. (PRD R32)
- [ ] #ac-33.1: Aprovação tem validade, cancelamento e consumo único; vincula ID, versão do endereço resolvido e identidade/versão da instância remetente. Editar destinatário, associação contato→WhatsApp, número conectado, conteúdo ou arquivo invalida a autorização. Dois pedidos concorrentes não executam a mesma ação duas vezes. (PRD R33)
- [ ] #ac-34.1: Depois de timeout externo, registrar estado incerto e reconciliar antes de permitir nova tentativa. Não prometer entrega exatamente uma vez quando o provedor não oferece contrato para isso. (PRD R34)
- [ ] #ac-35.1: Estado distingue preparado, aguardando aprovação, autorizado, em execução, aceito pelo provedor, entregue quando confirmado, falho, cancelado e incerto. “Aceito” não é “lido”. (PRD R35)
- [ ] #ac-36.1: A versão 0 envia somente texto. Não oferece upload/envio de PDF, imagem ou outro documento pelo MCP. Chamadas de envio com anexos são rejeitadas com explicação do limite. (PRD R36)
- [ ] #ac-38.1: Mensagens e documentos são dados, não instruções de autorização. O servidor trata esse conteúdo como dado sem autoridade para alterar regras ou permissões; segredos não são retornáveis por tool. A Skill exige autorização pontual do dono — pedido exato ou approve de texto proposto pela IA —, sem alegar que o servidor comprova sua autoria independentemente do modelo. Testar instruções maliciosas conhecidas, sem prometer imunidade do modelo ou controle sobre outros conectores habilitados no chat. (PRD R38)
- [ ] #ac-40.1: Ação aprovada e resultado ficam ligados ao histórico; tentativa falha ou rascunho não reinicia a cadência de relacionamento. Contato relevante é registrado explicitamente pelo consultor/Skill como interação efetiva, com origem e data; uma mensagem genérica não o redefine. Esse padrão de engenharia pode ser configurado sem alterar o histórico bruto. (PRD R40)

### Verificações complementares da entrega

- [ ] A IA prepara por ID interno; pedido explícito do dono com destinatário inequívoco e texto exato já autoriza execução. Para texto elaborado pela IA, a Skill mostra a proposta uma vez e aguarda uma aprovação clara. Conteúdo recebido do cliente não vale como approve.
- [ ] Backend autentica o dono e vincula conteúdo, contato, versão do endereço e instância remetente. Alteração material, cancelamento ou expiração invalidam a intenção antiga. O servidor não anuncia que comprova independentemente a autoria humana do approve.
- [ ] Duas execuções concorrentes da mesma ação não iniciam dois envios. Consumo e mudança de estado são atômicos no mecanismo escolhido; teste precisa observar a fronteira real, não apenas um mock sequencial.
- [ ] Timeout depois de possível aceite do provedor deixa ação incerta, sem retry cego. Reconciliação usa evidência disponível, distinguindo aceito, entregue, falho e desconhecido; não prometer exatamente uma vez sem contrato do provedor.
- [ ] Chamadas com imagem/documento são rejeitadas. Sem grupos, disparos em massa, aprovação em conjunto, negociação autônoma ou permissão indefinida.
- [ ] Ação, autorização pontual do dono no chat e resultado mantêm rastreabilidade sem devolver os IDs restritos/segredos. Falha, rascunho ou aceite não confirmado não reiniciam automaticamente a cadência.
- [ ] Fixtures de injection não alteram regras de servidor nem expõem credenciais. A Skill não trata instrução de mensagem ou saída de ferramenta como autorização humana.
- [ ] Fluxo da Skill é verificado em Claude e ChatGPT; teste automatizado não finge um humano real. Envio live somente a número controlado e com autorização explícita; pendência humana deve ficar nomeada.

## Escopo

Tools tipadas de preparação, execução/cancelamento e consulta de estado; Skill de approve no chat; resolução restrita do destino; intenção imutável, validade/consumo e registro do resultado. V0 aprova individualmente cada mensagem.

Base: [PRD v1.2](https://github.com/orobsonn/elo/blob/main/docs/prd/elo-v1.md). Padrão: `.pi/harness/skills/creating-issues/SKILL.md`, formulário `harness-task.yml` e contratos de entrega/governança. Este texto define resultado/aceites, não sela plano técnico nem requer cerimônia do harness. Execução por goal será autorizada em outra sessão; a label `harness:ready` indica metadados validados conforme o harness; não autoriza configurar um scheduler ou iniciar a implementação nesta sessão.

**Paths permitidos e exclusões:** Pode: src/ de ações/intenção, adaptador Z-API de envio/status, tools de ação; migrations/ de ações e consumo; skills/ de approve; testes de concorrência/timeout; docs/ do fluxo. Reutilizar os contratos da #1; mudança compartilhada precisa de regressão. Não tocar: .pi/, fontes/privadas/, agendamentos externos, frontend de aprovação; não adicionar grupos/anexos/lote.

## Decisões já resolvidas (opcional)

Infraestrutura individual Cloudflare; login padrão Cloudflare Access integrado ao OAuth MCP; Claude e ChatGPT; grupos/anexos fora da V0; approve por Skill no chat sem tela adicional; identificadores de entrega restritos ao backend; histórico bruto ativo até 30 dias; fatos claros automáticos e conflitos pendentes; Skills/cron no harness e Work/Cowork; única tela própria de configuração Z-API/webhook.

O escopo detalhado e as exclusões adicionais estão no PRD v1.2. Robson autorizou organizar estas quatro entregas e implementar em outra sessão por goal, sem a cerimônia do harness; testes, revisão e verificação continuam exigidos.

### Suposições do modelo (atacáveis)

Mecanismo físico de consumo atômico, vinculação/versionamento da intenção e conciliação serão definidos pela engenharia. O approve humano pertence ao fluxo da Skill; não é prova criptográfica independente no servidor.

## Dependências

```harness-deps
#1
```

#1 (https://github.com/orobsonn/elo/issues/1). Ler os contratos/estado implementados, não apenas a descrição das dependências.

## Domínio sensível?

dados/PII

## Prioridade

P1

## Tamanho estimado

L

Estas quatro issues são marcos de entrega da V0 já definidos com o operador, não mudanças pequenas. O tamanho L é explícito; na execução por goal, organizar tarefas e PRs revisáveis sem alegar que o marco inteiro cabe em 400 linhas ou retomar a cerimônia dispensada. A issue só fecha quando seus aceites materiais estiverem comprovados.

## Fora de escopo

Tela de aprovação, garantia criptográfica de gesto humano a partir de prompt, anexos, grupos, envio em lote e operações financeiras.

## Riscos e caminhos sensíveis

Estado persistido da intenção, atomicidade, destinatário mutável, concorrência, timeout externo e recuperação. Revisão adversarial independente precisa atacar a fronteira entre approve solicitado pela Skill e validação efetiva do servidor.

## Verificação e evidência de conclusão

Testes de vínculo/expiração/cancelamento, troca de destinatário/instância, duas execuções concorrentes, falha antes/depois de possível envio, status tardio e injection. Demonstrar ciclo com provedor fake controlável; registrar separadamente teste live autorizado e o que permaneceu incerto.

Registrar arquivos/diff, comandos executados e resultado no código final. Revisão adversarial independente dos caminhos críticos; corrigir achados materiais antes de fechar. Não usar só o relato do executor como evidência. Provas que exigem ação humana ou conta real ficam explicitamente pendentes, sem simular sucesso ou bloquear trabalho independente.
