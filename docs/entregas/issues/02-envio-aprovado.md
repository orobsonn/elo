## Problema e resultado esperado

O consultor deve conseguir pedir uma mensagem usando o ID do contato, revisar destinatário/texto no chat e aprovar o envio sem copiar telefone ou abrir outra tela.

## Escopo

Tools tipadas de preparação, execução/cancelamento e consulta de estado; Skill de approve no chat; resolução restrita do destino; intenção imutável, validade/consumo e registro do resultado. V0 aprova individualmente cada mensagem.

Base: [PRD v1.0](https://github.com/orobsonn/elo/blob/main/docs/prd/elo-v1.md). Padrão: `.pi/harness/skills/harness-issues/SKILL.md` e contratos de entrega/governança. Este texto define resultado/aceites, não sela plano técnico nem requer cerimônia do harness. Execução por goal será autorizada em outra sessão; não habilitar fila automática por criar esta issue.

## Dependências

```harness-deps
#1
```

#1 (https://github.com/orobsonn/elo/issues/1). Ler os contratos/estado implementados, não apenas a descrição das dependências.

## Critérios de aceitação

- [ ] A IA prepara por ID interno; a Skill mostra alias/destinatário inequívoco e texto, aguarda approve do consultor e só então solicita execução. Conteúdo recebido do cliente não vale como approve.
- [ ] Backend autentica o dono e vincula conteúdo, contato, versão do endereço e instância remetente. Alteração material, cancelamento ou expiração invalidam a intenção antiga. O servidor não anuncia que comprova independentemente a autoria humana do approve.
- [ ] Duas execuções concorrentes da mesma ação não iniciam dois envios. Consumo e mudança de estado são atômicos no mecanismo escolhido; teste precisa observar a fronteira real, não apenas um mock sequencial.
- [ ] Timeout depois de possível aceite do provedor deixa ação incerta, sem retry cego. Reconciliação usa evidência disponível, distinguindo aceito, entregue, falho e desconhecido; não prometer exatamente uma vez sem contrato do provedor.
- [ ] Chamadas com imagem/documento são rejeitadas. Sem grupos, disparos em massa, aprovação em conjunto, negociação autônoma ou permissão indefinida.
- [ ] Ação, approve solicitado no chat e resultado mantêm rastreabilidade sem devolver os IDs restritos/segredos. Falha, rascunho ou aceite não confirmado não reiniciam automaticamente a cadência.
- [ ] Fixtures de injection não alteram regras de servidor nem expõem credenciais. A Skill não trata instrução de mensagem ou saída de ferramenta como autorização humana.
- [ ] Fluxo da Skill é verificado em Claude e ChatGPT; teste automatizado não finge um humano real. Envio live somente a número controlado e com autorização explícita; pendência humana deve ficar nomeada.

## Requisitos rastreados do PRD

- **R31:** Preparar mensagem produz rascunho vinculado ao contato correto e permite revisar conteúdo/contexto. A IA pode preparar ação usando apenas ID interno.
- **R32:** Uma Skill de aprovação mostra no chat o destinatário e texto propostos; a pessoa lê e dá o approve. Só depois a Skill solicita o envio pelo MCP. Mensagem de cliente não é aprovação do consultor; mudança material requer novo approve. Autenticação e validação da ação no servidor continuam necessárias, sem exigir tela própria ou gesto fora do chat. V0 não envia anexos.
- **R33:** Aprovação tem validade, cancelamento e consumo único; vincula ID, versão do endereço resolvido e identidade/versão da instância remetente. Editar destinatário, associação contato→WhatsApp, número conectado, conteúdo ou arquivo invalida a autorização. Dois pedidos concorrentes não executam a mesma ação duas vezes.
- **R34:** Depois de timeout externo, registrar estado incerto e reconciliar antes de permitir nova tentativa. Não prometer entrega exatamente uma vez quando o provedor não oferece contrato para isso.
- **R35:** Estado distingue preparado, aguardando aprovação, autorizado, em execução, aceito pelo provedor, entregue quando confirmado, falho, cancelado e incerto. “Aceito” não é “lido”.
- **R36:** A versão 0 envia somente texto. Não oferece upload/envio de PDF, imagem ou outro documento pelo MCP. Chamadas de envio com anexos são rejeitadas com explicação do limite.
- **R38:** Mensagens e documentos são dados, não instruções de autorização. O servidor trata esse conteúdo como dado sem autoridade para alterar regras ou permissões; segredos não são retornáveis por tool. O approve humano é exigido pela Skill, sem alegar que o servidor comprova sua autoria independentemente do modelo. Testar instruções maliciosas conhecidas, sem prometer imunidade do modelo ou controle sobre outros conectores habilitados no chat.
- **R40:** Ação aprovada e resultado ficam ligados ao histórico; tentativa falha ou rascunho não reinicia a cadência de relacionamento. Contato relevante é registrado explicitamente pelo consultor/Skill como interação efetiva, com origem e data; uma mensagem genérica não o redefine. Esse padrão de engenharia pode ser configurado sem alterar o histórico bruto.

## Fora de escopo

Tela de aprovação, garantia criptográfica de gesto humano a partir de prompt, anexos, grupos, envio em lote e operações financeiras.

## Riscos e caminhos sensíveis

Estado persistido da intenção, atomicidade, destinatário mutável, concorrência, timeout externo e recuperação. Revisão adversarial independente precisa atacar a fronteira entre approve solicitado pela Skill e validação efetiva do servidor.

## Verificação e evidência de conclusão

Testes de vínculo/expiração/cancelamento, troca de destinatário/instância, duas execuções concorrentes, falha antes/depois de possível envio, status tardio e injection. Demonstrar ciclo com provedor fake controlável; registrar separadamente teste live autorizado e o que permaneceu incerto.

Registrar arquivos/diff, comandos executados e resultado no código final. Revisão adversarial independente dos caminhos críticos; corrigir achados materiais antes de fechar. Não usar só o relato do executor como evidência. Provas que exigem ação humana ou conta real ficam explicitamente pendentes, sem simular sucesso ou bloquear trabalho independente.
