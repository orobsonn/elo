# Instalação e primeiro uso — 22/10/2026

## Problema e escopo

O beta conseguiu avançar na instalação, mas relatou dúvidas pontuais nos campos e saiu sem entender o próximo passo de uso. A entrega consolida melhorias em [#28](https://github.com/orobsonn/elo/issues/28), [#29](https://github.com/orobsonn/elo/issues/29) e [#30](https://github.com/orobsonn/elo/issues/30). Não publica transcrições, mensagens, identidade ou arquivos privados do beta.

Plano aplicado: (1) documentar escolhas e reduzir o pedido inicial; (2) esclarecer a única tela de configuração e mostrar painel Z-API real; (3) encerrar com explicação/primeiro resultado no cliente; (4) testar proteção/estados, revisar adversarialmente e conferir o conjunto. Sem novo backend, tela de CRM, migração, scheduler ou mudança de autenticação.

## Todos os pontos consolidados

| Necessidade observada | Entrega | Issue |
|---|---|---|
| Uma escolha apareceu sem significado/impacto claros; opção exata não identificada | Protocolo objetivo → recomendação → alternativa → consequência antes de decidir; sem inventar qual foi a escolha | #28 |
| Localização do Client-Token diferente dos outros tokens | Caminhos separados por campo, explicação de conta versus instância e guia visual | #29 |
| Callbacks tratados como conhecimento prévio | Explicação simples de avisos e tabela com os rótulos reais do painel | #29 |
| Usuário só depois lembra que pode pedir ajuda à IA | Instrução “não achei; me guie uma etapa por vez”, com retomada sem reiniciar | #28/#30 |
| Não entender o que foi instalado | Apresentação de um minuto no fim, em configurar-elo | #30 |
| Não entender o que muda na rotina | Escolha de uma situação e primeiro resultado guiado | #30 |
| Dúvida sobre onde conversar, esperando assistente novo no WhatsApp | Separação explícita cliente de IA / backend Elo / canal WhatsApp | #30 |
| Skills exportadas sem saber como usar | Conceito simples, confirmação de instalação/carregamento e pedidos pelo nome | #30 |
| Confusão sobre Projetos e nuvem | Explicação de organização do cliente versus memória Cloudflare, sem promessa de dados locais | #30 |
| Falta de próximo passo | Convite “Vamos usar seu Elo”, opcional e retomável, com três pedidos prontos | #30 |
| Incerteza se a instalação acabou | Marcos e evidências separados; credenciais salvas não viram garantia de saúde/captura | #28/#29/#30 |
| Dúvida sobre encaixar análise de planilha | Arquivo continua no cliente; Elo consulta contexto e guarda apenas combinados autorizados, sem sincronização da planilha | #30 |
| Manter a fluidez do restante da instalação | Prompt curto para pessoa, roteiro técnico para IA e nenhuma tela nova; sem refazer infraestrutura ao pedir explicação | #28/#30 |

O feedback é evidência qualitativa de uma experiência, não medição de tempo, ganho ou validação de todos os clientes. Não atribuir causa técnica ao primeiro bloqueio ainda não identificado.

## Artefatos e limites de prova

- [Roteiro canônico](../operacao/instalacao-assistida.md) e [pedido curto](../prompts/instalar-elo.md): alvo próprio, código revisado antes de credenciais, escolhas/custos, retomada, Access e fechamento com adoção.
- [Guia Z-API](../operacao/zapi.md): seis capturas reais do Chrome logado, recortadas para excluir dados privados. [Proveniência](../operacao/imagens/zapi/README.md). Nenhuma configuração/tokens/callbacks da conta foi alterada.
- `src/setup.ts`: dicas ligadas aos campos, recebimento explicado, estado de verificação contextual, distinção de pause/captura e convite à apresentação. Ajuda usa commit completo válido do build; desenvolvimento cai em `main`.
- [Skill](../../skills/configurar-elo/SKILL.md) e [roteiro incluído no pacote](../../skills/configurar-elo/references/primeiro-uso.md): triagem sem escrita, consentimento da agenda, apresentação, demo autorizada e recusa respeitada.
- [Primeiro uso](../operacao/primeiro-uso.md), README e matriz de clientes atualizados. Evidência histórica Claude com quatro Skills continua distinta da instalação da quinta com a referência nova.

## Verificação executada

1. Baseline antes da implementação: `npm run test:all`, exit 0.
2. Dois testes novos de HTML ficaram vermelhos pela ausência de ajuda acessível/estados e passaram após a implementação. Teste adicional do link de documentação por commit ficou vermelho antes da correção e verde depois.
3. Regressão de reconfiguração usa D1 de teste e provedor controlado: re-salvar pausa envios, muda chave/generation e impede executar aprovação antiga mesmo após reabilitar. Não é envio real.
4. Código final: `npm run test:all`, exit 0 — **192 testes Vitest em 14 arquivos + 22 testes do instalador**. `npm run check`, exit 0; `npm run build` (dry-run), exit 0; `git diff --check`, exit 0.
5. 58 links locais em 11 documentos conferidos, nenhum ausente. Seis JPGs inspecionados: sem credenciais, nomes, telefones, URL privada, identificador de instância ou EXIF pessoal observado.
6. Renderização sintética do HTML real em Chrome, desktop e 390 × 844, sem overflow horizontal. Fixture apenas para revisão visual, fora do código versionado; a prévia não autentica. O fluxo de autenticação do código tem cobertura automatizada separada; isso não prova login real nesta fixture nem homologa celular/cliente do beta.
7. Revisão adversarial independente: preservação de auth/CSRF/CSP/escaping, estados de evidência, consentimento, empacotamento e referências versionadas. Achados de links da Skill, código revisado antes do token e ambiguidade de prova antiga corrigidos.

Warnings já presentes de dependências no teste: binding AI remoto, depreciação punycode, sourcemaps do SDK e aviso CIMD. Os testes controlam provedores e não usam inferência paga; os avisos não foram ocultados nem tratados como falhas resolvidas nesta entrega.

## Ensaio de processo da Skill

Revisão por simulação das instruções, sem ferramentas reais nem dados do beta:

| Cenário | Antes | Depois |
|---|---|---|
| Não sabe o que ganhou, sem WhatsApp e sem autorização de escrita | Caminho de configuração/sync incondicional, sem explicação | Só diagnóstico, explicação e escolhas; zero escrita/sync/setup automático |
| Quer explicação e recusa agenda | Sem ramo de recusa; passo sync incondicional | Respeita recusa, explica estado e entrega pedidos sem importar |
| Agenda autorizada, cota na segunda página | Cobertura parcial prevista, mas consentimento/retomada pouco explícitos | Para, informa uma página persistida/mapa parcial e não tenta novamente |
| Escolhe demo mas não autorizou a gravação | Roteiro de demo ausente | Mostra dados e aguarda antes de criar contato/fonte/tarefa |
| Pula apresentação | Retomada não definida | Respeita e entrega como retomar, sem efeito colateral |

O ensaio valida a clareza das instruções para um revisor; não prova que todo modelo sempre as seguirá. Autenticação e autorização de envio continuam nos controles existentes; os consentimentos de agenda e demonstração são instruções da Skill, não um novo gate persistido no servidor. Sem alterações em auth, actions, banco, harness, configuração de produção ou dependências.

## Pendências operacionais

Reinstalar/carregar a Skill atualizada no cliente-alvo e fazer novo ensaio humano de primeiro uso ainda são aceites próprios. Nenhum novo envio de WhatsApp, deploy, release ou alteração da conta do beta foi executado nesta implementação. A política de release por marco é preservada; documentação e código fonte não equivalem a publicação da nova versão.
