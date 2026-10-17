# Instalação individual do Elo na Cloudflare

> **Atualização normativa — PRD v1.1:** Robson definiu Cloudflare Access como login padrão, integrado ao OAuth do MCP. O caminho inicial de engenharia é Access for SaaS/OIDC; o [exemplo oficial](https://developers.cloudflare.com/cloudflare-one/access-controls/ai-controls/secure-mcp-servers/) usa `workers.dev`, portanto uma restrição de domínio para proxy Access não deve ser generalizada a esse fluxo. Configuração, identidade do dono, tokens, renovação/revogação e dois clientes são aceites E1/E4. Free Access até 50 logins é distinto de custo Workers/AI/Z-API e não comprova disponibilidade de toda opção Managed OAuth. Propostas antigas abaixo não substituem essa definição.

Pesquisa documental em 16/10/2026. Nenhum recurso provisionado, credencial consultada, pacote instalado ou integração testada. Números refletem a documentação consultada e devem ser reconferidos antes da oferta e do piloto. Recomendações abaixo são candidatas para revisão adversarial, não arquitetura aprovada.

## Parecer

**Há um caminho plausível para instalação por leigos: botão Deploy to Cloudflare para a infraestrutura, seguido de um assistente de configuração e testes na conta do aluno. A promessa de instalação completa em um clique ainda não está demonstrada.** O maior risco de adoção é a soma de contas, permissões, autenticação do MCP, credenciais do WhatsApp e recuperação. Publicar um Worker não resolve essa jornada.

Provar primeiro uma instalação limpa, com dados fictícios e sem programação pelo aluno. O caminho de suporte deve funcionar em grupo, sem compartilhar tela com tokens, banco ou conversas reais. Não tornar uma IA de programação paga e instalada no computador um pré-requisito oculto da formação.

## O que o botão cobre

O botão oficial parte de repositório público GitHub/GitLab, cria uma cópia na conta Git do usuário, configura nomes e executa Workers Builds. Pode provisionar e vincular D1, KV, R2, entre outros recursos descritos no Wrangler. A documentação contempla declaração de secrets e migrations via comando de deploy; criar banco não equivale a aplicar schema. O template deve conter a configuração correta. Não há garantia documental de que o botão configure OAuth, Cloudflare Access, DNS externo ou o provedor WhatsApp. [Deploy buttons](https://developers.cloudflare.com/workers/platform/deploy-buttons/).

| Parte | Automação plausível | Ação humana ou prova pendente |
|---|---|---|
| Worker e D1 | Provisionar pelo botão; migrations preparadas pelo autor | Autorizar contas e confirmar recurso criado no destino correto |
| KV e R2 | Provisionar bindings suportados | Habilitar assinatura R2 quando exigida; verificar plano e cobrança |
| Secrets | Declarar nomes necessários e coletar em interface própria do serviço | Aluno informa seus valores em campo seguro; nunca no chat |
| Conta Cloudflare/Git | Jornada de login dos respectivos serviços | Cadastro, e-mail, MFA, CAPTCHA, consentimento e recuperação são humanos |
| OAuth do MCP | Implementação e configuração podem ser empacotadas no produto | Login/consentimento são humanos; interoperabilidade precisa ser testada |
| WhatsApp | Configurar URLs e validar conectividade, conforme API disponível | Conta/assinatura, autorização e pareamento do número pelo titular |
| Domínio | Associar Worker a zona que já esteja ativa e autorizada | Comprar domínio ou migrar DNS envolve etapas e custos adicionais |
| Atualização | Build a partir do repositório individual | Entregar nova versão ao clone do aluno e aprová-la exige fluxo próprio |

O GitHub precisa ser conectado ao Workers Builds; limitar a integração ao repositório do Elo, conforme as opções disponíveis. Copiar um template não cria sincronização automática com futuras releases do autor. [Integração GitHub](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/).

## Alternativas para o aluno

| Alternativa | Vantagem | Atrito e limite | Parecer de pesquisa |
|---|---|---|---|
| Botão + assistente web da instalação individual | Evita Node e terminal; mesmos passos para a turma | Exige construir onboarding, estado e diagnóstico; contas e consentimentos permanecem | Melhor hipótese para o caminho principal |
| IA local guiando instalação com CLI | Ajuda em erros e pode executar tarefas mecânicas | Sistema operacional, Node, terminal, agente, permissões e acesso a arquivos elevam suporte e exposição | Alternativa assistida; provar em Windows/macOS antes de incluir |
| Guia manual no dashboard | Menos ferramentas locais | Mais cliques, transcrição de IDs e risco de configuração desigual | Referência e recuperação, não experiência principal presumida |
| Instalador próprio com amplo token da conta | Pode esconder várias operações | Vira produto de provisionamento privilegiado e concentra risco; não é necessário para provar o Elo | Evitar como primeira solução |
| Conta central mantida por Robson | Reduz cliques do aluno | Contraria a instalação individual e cria operação central | Fora da direção atual |

Para a alternativa local, Wrangler oferece OAuth no navegador, seleção de scopes e armazenamento protegido por keyring com opção própria. Por padrão pode guardar tokens em arquivo local de texto; não deixar a IA ler esse diretório. O consentimento no navegador não autoriza expor token ao modelo. Scopes OAuth selecionáveis não significam autorização fina por recurso; a documentação distingue esse caso de API tokens com permissões específicas. [Login e keyring](https://developers.cloudflare.com/workers/wrangler/commands/general/), [permissões](https://developers.cloudflare.com/workers/authorization/).

## Contas, permissões e sequência proposta

O aluno precisa controlar sua conta Cloudflare, e-mail de recuperação, conta Git se usar o botão, IA compatível e conta do provedor WhatsApp. Cartão ou outro meio de pagamento pode ser necessário para assinaturas ativadas. Não prometer automatizar cadastro, login, MFA, CAPTCHA, aceite de termos, autorização institucional ou pagamento. Cloudflare verifica e-mail após o cadastro. [Criar conta](https://developers.cloudflare.com/fundamentals/account/create-account/).

| Etapa da futura instalação | Resultado observável |
|---|---|
| 1. Pré-voo | Lista de contas, custos, permissão de dados, navegador e plataforma compatível, antes de começar |
| 2. Entrar/criar contas | Aluno autenticado nas próprias contas; recuperação configurada |
| 3. Abrir botão oficial | Repositório individual e conta Cloudflare de destino conferidos |
| 4. Provisionar e aplicar schema | Worker, banco e versão do schema visíveis; falha pode ser retomada sem duplicar recursos |
| 5. Proteger instalação | Identidade única autorizada; ninguém acessa dados antes do fim do onboarding |
| 6. Inserir credenciais | Valores em secrets; interface informa somente configurado/ausente |
| 7. Conectar IA | URL individual e fluxo de autenticação; consulta fictícia funciona e acesso indevido falha |
| 8. Conectar WhatsApp | Identidade/número conferidos; webhook de teste recebido e deduplicado |
| 9. Envio controlado | Destino de teste do próprio aluno, aprovação exata e confirmação consultável |
| 10. Saída e recuperação | Aluno exporta, revoga conexão e encontra instrução para restaurar ou remover |

Requisitos técnicos do autor: permissões para criar Worker e D1; somente quando usados, R2/KV/Access. Rotas próprias exigem acesso ao Worker e permissão de rotas na zona afetada. Suporte não precisa receber conta de administrador. A matriz exata deve acompanhar os recursos do instalador final, sem usar Global API Key como atalho. [Permissões Workers](https://developers.cloudflare.com/workers/authorization/workers/).

## Autenticação, domínios e template existente

MCP remoto precisa autenticar a pessoa e autorizar o cliente. Cloudflare documenta OAuth 2.1, inclusive biblioteca própria e integração com Access; isso não transforma automaticamente uma barreira de login do Access em um servidor OAuth compatível com qualquer cliente MCP. Validar descoberta, login, consentimento, renovação, revogação e reconexão na IA escolhida. [Autorização MCP](https://developers.cloudflare.com/agents/model-context-protocol/protocol/authorization/).

`workers.dev` oferece URL inicial sem compra de domínio. Cloudflare recomenda domínio/rota própria para produção e descreve workers.dev como voltado a projetos pessoais/hobby. Portanto, uma prova com workers.dev não fecha a decisão de hospedagem comercial. [Rotas e domínios](https://developers.cloudflare.com/workers/configuration/routing/).

Access pode proteger workers.dev, previews e domínio próprio, mas precisa de Zero Trust habilitado e permissões correspondentes. Um bloqueio global pode impedir o webhook do WhatsApp, que não faz login de navegador. Provar separadamente MCP, onboarding e endpoint autenticado do provedor; nunca liberar todo o sistema para resolver um webhook bloqueado. [Access para Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/).

Custom Domain requer zona ativa controlada pelo aluno; pode conflitar com CNAME existente. No plano DNS Free/Pro, migrar zona pelo full setup envolve registrar nameservers e conferir registros, inclusive e-mail. DNSSEC mal tratado pode deixar domínio inacessível. Não incluir migração do domínio profissional como passo banal da aula; avaliar domínio separado ou URL inicial e registrar o custo. [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [full setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/).

### O template Expert é referência técnica, não instalador do Elo

Inspecionados localmente `templates/mcp/README.md`, `wrangler.jsonc` e `src/index.ts` em `/Users/robson/Desktop/dev/expert-governanca`:

- Assume conta Expert, domínio próprio, Access, registro no MCP guarda-chuva, placeholders e D1 criado manualmente.
- Code Mode vem ligado e `worker_loaders` permanece declarado no Wrangler. **Mudar só `CODE_MODE=off` desvia a execução, mas não demonstra deploy Free:** ainda existe binding de recurso Paid na configuração. Preparar configuração Free sem esse binding e prová-la, se esse for o objetivo.
- `/health` retorna sucesso sem provar banco, credenciais ou provedor; Access pode barrar a chamada antes de ela chegar ao Worker. Precisa de testes de dependências separados e privados.
- Banco de exemplo é somente leitura. Não resolve memória, envio, importação, backup nem onboarding.
- O exemplo destrutivo usa `confirm: true`; isso não comprova aprovação humana vinculada a destinatário/conteúdo/anexo nem consumo único. O Elo exige contrato próprio com proteção no servidor.
- Há pendências declaradas de dependências e overrides; reutilização exige revisão específica, não copiar e chamar de seguro.

Não copiar o template integralmente. Aproveitar componentes após testes e revisão adversarial, com configuração de instalação individual e sem a dependência do guarda-chuva Expert.

## Memória mínima e histórico

Hipótese a testar: um D1 individual para contatos com IDs inequívocos, vínculos com conversas, fontes autorizadas, registros de fatos/correções, pendências com datas, mensagens e eventos recebidos, rascunhos/aprovações e estados de envio. Isso atende busca por pessoa, período e pendência sem obrigar o WhatsApp pessoal a usar GPS ou cadastro financeiro.

Retenção e limite de captura devem ser explícitos; não anunciar histórico anterior ao pareamento sem prova do provedor. Guardar procedência e data de captura, identificar lacunas e registrar alterações sem apagar contradições silenciosamente. Consultas paginadas e índices por conversa/data/estado reduzem leitura e contexto enviado à IA. Reavaliação de busca textual/semântica só após exemplos em que filtros e busca simples falhem; Vectorize e embeddings não são requisito inicial demonstrado.

R2, se adotado, guarda anexos privados e exportações com política definida; D1 mantém referências e hashes. Não preservar toda mídia por padrão: áudio/imagens crescem muito mais que texto. KV é opcional para dados tolerantes a atraso; **não serve como trava de aprovação ou deduplicação confiável**, pois tem consistência eventual e limite de uma gravação por chave por segundo. [Comportamento de escrita KV](https://developers.cloudflare.com/kv/api/write-key-value-pairs/).

## Limites e custos verificáveis

Valores em USD, sem impostos/câmbio. Cada franquia é compartilhada com outros recursos elegíveis da mesma conta; não multiplicar franquias por Worker. Sites/zonas Free/Pro não são o mesmo plano de Workers. Custos de IA do usuário, WhatsApp, domínio e eventuais APIs são adicionais.

| Recurso | Free / franquia relevante | Paid / excedente relevante | Implicação |
|---|---|---|---|
| Workers | 100 mil requests/dia; 10 ms CPU por HTTP request | Mínimo US$5/mês; 10 milhões requests e 30 milhões CPU-ms/mês; +US$0,30/milhão requests e +US$0,02/milhão CPU-ms | Medir autenticação, parsing e serialização; I/O em espera não conta como CPU |
| D1 | 5 milhões linhas lidas/dia; 100 mil escritas/dia; 500 MB por banco, 5 GB total | 25 bilhões lidas/mês, 50 milhões escritas/mês e 5 GB incluídos; +US$0,001/milhão lidas, US$1/milhão escritas, US$0,75/GB-mês; 10 GB por banco | Retenção longa pode estourar banco Free mesmo com poucas consultas |
| KV | 100 mil leituras/dia, mil escritas/dia, 1 GB | 10 milhões leituras/mês, 1 milhão escritas/mês, 1 GB; excedentes próprios | Dispensável se não houver necessidade comprovada |
| R2 Standard | 10 GB-mês, 1 milhão operações A, 10 milhões B/mês | US$0,015/GB-mês; US$4,50/milhão A; US$0,36/milhão B; arredondamentos de unidade | Franquia não dispensa assinatura/checkout; sem egress direto cobrado pelo R2 |
| Dynamic Workers / Code Mode | Indisponível no Workers Free | Mil unidades únicas diárias acumuladas no mês incluídas; +US$0,002 por unidade extra; requests/CPU também contam em Workers | Código sem ID estável ou via `load()` conta criação por chamada |

Fontes: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [KV pricing](https://developers.cloudflare.com/kv/platform/pricing/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Dynamic Workers pricing](https://developers.cloudflare.com/dynamic-workers/pricing/).

R2 exige assinatura ativada em checkout mesmo com uso incluído. Não prometer ausência de cartão: conferir o checkout real no piloto. A política de cobrança prevê validação de meio de pagamento e possível suspensão de serviços por falha. [Ativação R2](https://developers.cloudflare.com/r2/get-started/), [billing policy](https://developers.cloudflare.com/billing/understand/billing-policy/).

### Envelope de referência calculado, ainda não medido

Premissas de dimensionamento, não comportamento observado: 30 dias/mês; por mensagem capturada, média de 4 KB em D1 já estimando metadados/índices; até oito linhas cobradas como escritas por mensagem incluindo índices, eventos e estados; margem para retries e consultas já incluída na linha de requests. Transcrições, memória derivada e auditoria têm acréscimo próprio. Médias não substituem medir os picos diários e o tamanho real do banco.

| Perfil | Mensagens/mês e retenção | Requests/mês e média CPU presumida | D1 esperado | Mídia R2 média mantida | Estimativa Cloudflare |
|---|---|---|---|---|---|
| Pessoal leve | 3 mil; 12 meses | 30 mil; 5 ms | 144 MB de mensagens + até 50 MB de outros dados; até 800 escritas/dia em média; leitura-alvo ≤100 mil linhas/dia | Até 2 GB; ≤30 mil A e 100 mil B/mês | US$0 de consumo no Free se CPU/picos/armazenamento e demais limites forem comprovados; Code Mode excluído |
| Consultor ativo | 15 mil; 6 meses | 150 mil; 5 ms | 360 MB + até 100 MB; até 4 mil escritas/dia em média; leitura-alvo ≤1 milhão linhas/dia | Até 5 GB; ≤100 mil A e 500 mil B/mês | Potencial US$0 sem Code Mode, perto do limite de armazenamento; US$5 base se Paid; não garantir Free |
| Pessoal intenso | 30 mil; 12 meses | 600 mil; 10 ms | 1,44 GB + até 200 MB; até 8 mil escritas/dia em média; leitura-alvo ≤3 milhões linhas/dia | Média 20 GB; ≤200 mil A e 1 milhão B/mês | Free inviável por banco; cerca de US$5,15/mês no Paid sem Code Mode, se todas as demais franquias atenderem |

Exemplo adicional: 3 mil execuções mensais de Code Mode que gerem uma criação cada resultam em aproximadamente US$4 além da base Paid: `(3000 − 1000) × 0,002`. Nesse caso o piso vira cerca de US$9, antes de mídia e outros excedentes. Um ID reutilizado só reduz essa parcela se código e ID forem iguais no mesmo dia; não presumir isso para código escrito pela IA. Fórmula e regra na [página Dynamic Workers](https://developers.cloudflare.com/dynamic-workers/pricing/).

Não somar oito escritas por mensagem como se isso já cobrisse a aplicação real: medir `rows_written` incluindo índices e limpezas; medir `rows_read`, sem confundir linhas retornadas com linhas varridas. Quota Free excedida pode interromper consultas. Importação inicial é um pico separado e precisa de lotes/limites. [Métricas D1](https://developers.cloudflare.com/d1/platform/pricing/).

Medidas necessárias: CPU por endpoint e percentis, pico diário, erros de quota, tamanho após 1/3/6/12 meses projetados, linhas lidas/escritas, mídia retida, retries e número real de Dynamic Workers. Configurar limites de trabalho, tamanho de payload e limites por conta; alarmes não são um teto financeiro universal.

Builds também têm quota: Free inclui 3 mil minutos/mês e um build simultâneo; Paid inclui 6 mil e cobra excedente. Atualização de muitos clones não deve depender de reconstruções incessantes. [Builds limits](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/).

## Atualização, recuperação e suporte

**Atualização candidata:** releases assinadas/verificáveis e versionadas pelo autor, aviso compreensível, cópia de segurança antes de migration relevante, aplicação no repositório do aluno e confirmação da versão ativa. Definir quem fornece correção e por quanto tempo. Um clone individual não se mantém sozinho e suporte em grupo não equivale a manutenção ilimitada.

Rollback de Worker restaura versão de código/configuração, mas não desfaz dados modificados nos recursos vinculados. Preferir migrations compatíveis com a versão anterior quando possível; migration destrutiva exige caminho de recuperação separado. Testar login, consulta e envio controlado após upgrade e rollback. [Rollback](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).

D1 oferece Time Travel automático: janela específica de sete dias no Free e trinta no Paid, conforme a tabela de limites. É recuperação temporária na mesma conta, não cópia independente. Exportação SQL e importação são documentadas; prever exportação de anexos, manifesto com versão/hash/schema e teste em instalação vazia. Definir retenção e exclusão dos backups para não manter dados pessoais indefinidamente. [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/), [limites](https://developers.cloudflare.com/d1/platform/limits/), [export/import](https://developers.cloudflare.com/d1/best-practices/import-export-data/).

Restaurar o banco pode ressuscitar aprovações e apagar registros de envio já realizado externamente. Recuperação deve iniciar com envios desabilitados, aprovações antigas invalidadas e reconciliação do estado externo; restaurar não autoriza repetir ações. Essa é uma exigência de produto a testar, não capacidade automática da Cloudflare.

### Credenciais fora da IA e do grupo

Entradas sensíveis somente em campos seguros controlados pelo aluno: token do provedor, assinatura de webhook e segredos de sessão. Secrets Cloudflare ficam disponíveis ao código, portanto uma atualização maliciosa ainda pode extraí-los; revisar proveniência e permissões de atualização. Não registrar segredo, header Authorization, cookie, URL assinada ou corpo de conversa em logs. [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

Se usar IA local, a etapa humana de inserção de segredo deve ocorrer fora da transcrição do agente; não dar ao agente permissão ampla de ler o arquivo de credenciais ou capturar a tela nesse momento. Seu diagnóstico deve receber apenas presente/ausente, válido/inválido e código sanitizado. Se isso não puder ser garantido, escolher onboarding pelo dashboard e guia humano.

Pacote mínimo de diagnóstico para suporte em grupo: versão Elo/schema, etapa, plataforma e versão do cliente, horário/fuso, código de erro, resultado de testes sintéticos e métricas agregadas. Usar identificador aleatório temporário; não incluir account IDs, URL privada, telefone, nome, e-mail, IDs do provedor, prompts, conteúdo ou dumps. Revisão/preview antes do aluno compartilhar. Reproduzir com dados fictícios.

Logs operacionais são temporários; não substituem histórico nem auditoria funcional. A página Workers Logs anuncia mudança de preços em 01/12/2026: reconferir antes de qualquer turma posterior. [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/), [novo modelo Observability](https://developers.cloudflare.com/observability/pricing/).

Definir no material da formação: prazo/canal do suporte em grupo, versões suportadas, problemas de credenciais resolvidos pelo titular, procedimento para indisponibilidade do provedor, exportação e encerramento. Senhas/tokens nunca devem ser solicitados para diagnóstico. Rotação/revogação devem continuar possíveis sem o Robson acessar a conta.

## Provas exigidas antes da promessa pública

| Prova futura | Critério proposto, ainda sujeito à validação do piloto |
|---|---|
| Instalação por leigos | Pelo menos cinco pessoas do público, contas limpas, guia idêntico; ≥80% concluem sem atendimento individual; medir tempo, passos e abandonos |
| Esforço aceitável | Alvo inicial de ≤30 minutos após pré-requisitos; contabilizar cadastro, cartão, OAuth, QR e retomada separadamente; ajustar promessa ao observado |
| Isolamento | Duas instalações com dados fictícios distintos; credencial A não consulta/altera B; nenhum binding ou conta compartilhado por engano |
| Configuração incompleta | Sem credenciais válidas ou autenticação pronta, nenhuma leitura/escrita de dados reais e nenhum envio |
| Caminho Free | Deploy real sem Worker Loader/bindings Paid; autenticação e consultas abaixo dos limites; provar comportamento ao atingir quota |
| Caminho Paid/Code Mode | Uso e faturamento do Loader medidos; custo por volume documentado; anúncio explícito de base e excedentes |
| IA e celular | Login, tools, aprovação, arquivo, renovação/reconexão e revogação nas plataformas/planos realmente oferecidos |
| Falhas e retomada | Build falha, quota, segredo incorreto, sessão expirada, webhook duplicado, QR perdido, timeout e provedor fora; erro compreensível sem suporte privado |
| Atualização | Instalação antiga recebe release escolhida, preserva dados, verifica versão ativa e suporta rollback compatível |
| Recuperação | Exportar/restaurar em instalação nova, conferir contagens/amostras/hash dos anexos, revogar tokens antigos e bloquear repetição de envios |
| Suporte sem dados pessoais | Cinco erros simulados diagnosticáveis pelo pacote sanitizado; revisão automática e humana antes do compartilhamento |

A prova de maior prioridade é uma pessoa leiga concluir **instalar → autenticar IA → consultar memória fictícia → aprovar envio de teste → desconectar/recuperar**, usando apenas material e suporte em grupo. Até isso acontecer, a linguagem adequada é “instalação guiada em validação”, sem garantia de um clique, gratuidade universal ou compatibilidade completa.
