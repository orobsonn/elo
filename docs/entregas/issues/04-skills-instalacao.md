## Resumo + por quê

O Elo só tem valor para pessoas leigas quando conecta, funciona nas IAs usadas, tem rotinas instaláveis e pode ser atualizado/recuperado sem depender de programação ou suporte individual.

## User journeys

- #uj-1: Uma pessoa leiga conclui a instalação e usa Skills no Claude/ChatGPT sem editar código ou usar terminal diariamente.
- #uj-2: O consultor descreve um processo ao Otimize meu processo, cria/adapta uma Skill e testa seu resultado com orientação.

## Critérios de aceite (testáveis e observáveis)

- [ ] #ac-6.1: A instalação só termina após teste de autenticação, recebimento de evento, leitura com ID interno, envio aprovado a destino controlado e consulta do resultado. Diagnóstico informa a etapa que falta. (PRD R06)
- [ ] #ac-9.1: Atualizar preserva dados e configurações; antes de alteração incompatível existe recuperação documentada. Uma instalação de teste deve ser atualizada e recuperada sem assistência individual de engenharia. (PRD R09)
- [ ] #ac-10.1: A pessoa pode interromper envios pendentes, revogar conexões, exportar e excluir seus dados. O procedimento explica separadamente o que fica no Elo, em backups, na Z-API e no histórico da IA. (PRD R10)
- [ ] #ac-42.1: Documentar matriz por plataforma/plano: conectar, ler, escrever, revisar, celular e agendar. Arquivos da própria IA, se descritos, não implicam envio de anexos WhatsApp na V0. Marcar suportado documentalmente, testado ou pendente; não presumir paridade Claude/ChatGPT. (PRD R42)
- [ ] #ac-43.1: Jornadas principais são testadas no celular real. Configuração inicial orientada no computador é a hipótese de planejamento, coerente com a instalação assistida pela IA local; uso diário não pode depender de terminal. Restrição maior exige apresentar impacto antes de mudar o escopo. (PRD R43)
- [ ] #ac-46.1: Perfil de uso mensurável estima requisições, CPU, linhas lidas/escritas, índices, armazenamento, mídia e plano da IA. Mostrar custos externos e avisos antes de habilitar recursos pagos. (PRD R46)
- [ ] #ac-48.1: Procedimentos/Skills vêm com exemplo, saída esperada, informação ausente, erro e conferência. Não depender de formato de Skill idêntico em todos os clientes. (PRD R48)
- [ ] #ac-50.1: GPS e rotinas são Skills instaladas no harness da pessoa; o pacote inclui orientação de cron no Work/Cowork. O backend oferece operações de dados e ação, sem duplicar esses procedimentos como serviços próprios. (PRD R50)
- [ ] #ac-51.1: Entregar “Otimize meu processo”: entrevistar o consultor sobre a rotina e o resultado desejado; avaliar recursos disponíveis na plataforma/harness (computer use, cron, conectores, MCP, arquivos e demais capacidades pertinentes); desenhar uma rotina melhor; criar/adaptar a Skill e testá-la junto com a pessoa até demonstrar o resultado ou explicitar um bloqueio. Conferir disponibilidade/permissões reais, sem prometer toda capacidade em todo ambiente. GPS é exemplo, sem formato único obrigatório. (PRD R51)

- [ ] #ac-42.2: Matriz Claude/ChatGPT distingue login Access, autorização MCP, renovação, revogação e uso em rotina agendada. Demonstrar as combinações reais possíveis; documentar impedimento humano/cliente sem desativar auth para passar no smoke.
- [ ] #ac-6.2: Roteiro inclui ativação/configuração do Access na conta individual, dono autorizado, callback e entrada protegida de segredos. Não exigir compra de domínio só por usar Access quando o caminho OIDC em workers.dev atender. Free cobre até 50 logins conforme oferta verificada, não 50 contatos nem toda a infraestrutura gratuita; verificar elegibilidade concreta de recursos usados.

### Verificações complementares da entrega

- [ ] Instalação termina com autenticação, recebimento, consulta por ID, envio aprovado a destino controlado e leitura do estado. Ponto de entrada único não promete eliminar login/consentimento/QR/pagamento; botão é preferido, orientação IA local é caminho complementar.
- [ ] Orientação por IA local não pede segredos no chat e não presume ocultação em screenshot. A única tela do produto continua sendo configuração Z-API/webhook. Recomeçar não recria recursos nem apaga dados.
- [ ] Skills trazem entradas, exemplo sintético, saída esperada, dados faltantes, erro e conferência. A revisão diária apresenta prazos, datas, mensagens não avaliadas e informações pendentes, com fonte/cobertura e ações sugeridas.
- [ ] Otimize meu processo entrevista sobre o resultado desejado, verifica capacidades reais da plataforma (computer use, cron, conectores/MCP, arquivos), desenha o processo, cria/adapta a Skill e testa junto com a pessoa. GPS é exemplo, não formato/gerador fixo.
- [ ] Agendamento usa Work/Cowork, não scheduler próprio do Elo. Matriz por cliente/plano registra conectar/ler/escrever/revisar/approve/celular/agendar como documentado, testado ou pendente. Rotina manual não vira substituta silenciosa da recorrência prometida.
- [ ] Uso diário é verificado no celular nas superfícies suportadas; configuração inicial no computador é hipótese declarada. Uma restrição concreta de cliente deve ter impacto informado, sem alegar paridade porque ambos falam MCP.
- [ ] Atualização/migração, restauração, interrupção de envios, revogação, exportação e exclusão têm procedimento testado e distinguem Elo, backups, Z-API e histórico da IA. Restauração não revive autorização de envio.
- [ ] Perfil de uso mede CPU, consultas/escritas, armazenamento/memória durável, inferência e serviços externos. Mostrar Paid/créditos exigidos pelo DeepSeek e custos separados de Z-API/IA. US$5 não é teto de todos os serviços.
- [ ] Piloto assistido com pessoa leiga disponível é aceite humano, sem prazo artificial em minutos. Registrar atritos e limitações; não fechar como comprovado por inspeção documental. Todo trabalho automatizável deve estar entregue antes de pedir essa participação.

## Escopo

Pacote e instruções por plataforma; Skills de revisão/brief/approve e Otimize meu processo; cron Work/Cowork; finalização do botão/roteiro de instalação, operação, atualização, diagnóstico, exportação e exclusão. Concluir integração das entregas anteriores.

Base: [PRD v1.1](https://github.com/orobsonn/elo/blob/main/docs/prd/elo-v1.md). Padrão: `.pi/harness/skills/creating-issues/SKILL.md`, formulário `harness-task.yml` e contratos de entrega/governança. Este texto define resultado/aceites, não sela plano técnico nem requer cerimônia do harness. Execução por goal será autorizada em outra sessão; a label `harness:ready` indica metadados validados conforme o harness; não autoriza configurar um scheduler ou iniciar a implementação nesta sessão.

**Paths permitidos e exclusões:** Pode: skills/, scripts/ e configuração de distribuição/instalação; tela já prevista de configuração; docs/; testes/smokes de integração, migração/recuperação e saída; configuração de CI/Workers necessária ao fechamento. Ajustes de integração em src/ exigem regressão da área. Não tocar: .pi/, fontes/privadas/, outros projetos, contas/rotinas reais sem autorização; não criar CRM/dashboard, anexos ou novos fluxos de produto.

## Decisões já resolvidas (opcional)

Infraestrutura individual Cloudflare; login padrão Cloudflare Access integrado ao OAuth MCP; Claude e ChatGPT; grupos/anexos fora da V0; approve por Skill no chat sem tela adicional; identificadores de entrega restritos ao backend; histórico bruto ativo até 30 dias; fatos claros automáticos e conflitos pendentes; Skills/cron no harness e Work/Cowork; única tela própria de configuração Z-API/webhook.

O escopo detalhado e as exclusões adicionais estão no PRD v1.1. Robson autorizou organizar estas quatro entregas e implementar em outra sessão por goal, sem a cerimônia do harness; testes, revisão e verificação continuam exigidos.

### Suposições do modelo (atacáveis)

Configuração inicial no computador e distribuição por botão/roteiro são hipóteses de implementação; a experiência deve ser testada. Compatibilidade, celular e cron nas duas plataformas não são inferidos da existência do protocolo MCP.

## Dependências

```harness-deps
#1
#2
#3
```

#1 (https://github.com/orobsonn/elo/issues/1), #2 (https://github.com/orobsonn/elo/issues/2), #3 (https://github.com/orobsonn/elo/issues/3). Ler os contratos/estado implementados, não apenas a descrição das dependências.

## Domínio sensível?

segredos

## Prioridade

P1

## Tamanho estimado

L

Estas quatro issues são marcos de entrega da V0 já definidos com o operador, não mudanças pequenas. O tamanho L é explícito; na execução por goal, organizar tarefas e PRs revisáveis sem alegar que o marco inteiro cabe em 400 linhas ou retomar a cerimônia dispensada. A issue só fecha quando seus aceites materiais estiverem comprovados.

## Fora de escopo

CRM/dashboard, segundo agendador, suporte individual permanente, compatibilidade fictícia, mock aprovado inexistente e expansão dos bônus educacionais para backend.

## Riscos e caminhos sensíveis

Provisionamento/autenticação/segredos, mudanças de plano/quota, restauração, compatibilidade de agendamento e execução com conectores reais. Evitar dependências de IDE/terminal no uso diário ou promessa falsa de um clique.

## Verificação e evidência de conclusão

Smoke integrado, regressão afetada, roteiro de upgrade/restauração/exportação/exclusão em ambiente isolado, matriz dos dois clientes e ensaio controlado de cron. Evidência live e mocks separados. Entregar guia simples e lista exata de intervenções humanas que faltam; não anunciar teste leigo/QR/envio real sem executá-lo.

Registrar arquivos/diff, comandos executados e resultado no código final. Revisão adversarial independente dos caminhos críticos; corrigir achados materiais antes de fechar. Não usar só o relato do executor como evidência. Provas que exigem ação humana ou conta real ficam explicitamente pendentes, sem simular sucesso ou bloquear trabalho independente.
