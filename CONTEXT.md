# Contexto do Elo

## Objetivo

Dar à IA pessoal do usuário uma memória organizada e ferramentas para preparar e executar ações aprovadas. O primeiro contexto comercial é o acompanhamento de clientes por consultores financeiros. Robson também quer usar o MCP de WhatsApp para si.

## Pessoas e responsabilidades

- **Robson:** responsável pelo produto, ensino e desenvolvimento. Decide objetivos, valor e escopo de negócio. Não deve ser tratado como validador técnico de arquitetura ou segurança.
- **Interlocutores da oferta e da formação:** A aprovação comercial não valida a viabilidade técnica de uma integração.
- **Consultor/aluno:** instala sua própria estrutura, usa sua conta de IA e revisa informações e ações.
- **Cliente do consultor:** pessoa acompanhada pelo profissional; seus dados exigem limites de acesso e uso.
- **Robson como usuário pessoal:** quer ler e enviar mensagens pelo MCP sem depender dos campos e fluxos financeiros da formação.

## Significados de negócio

| Termo | Significado neste projeto |
|---|---|
| Segundo cérebro | Memória longitudinal organizada, consultável e atualizável; não é só o histórico de um chat. |
| Agente | Experiência em que a IA recebe contexto, consulta memória e usa ferramentas para ajudar a executar trabalho. O termo comercial não comprova autonomia irrestrita. |
| GPS | Documento de diagnóstico e planejamento usado na metodologia dos consultores entrevistados. A IA organiza informações e recomendações definidas pelo consultor. |
| Briefing do cliente | Registro interno com contexto, objetivos, combinados, pendências e próximos passos. |
| Brief diário | Visão de quem precisa de atenção, por qual motivo, com qual contexto e qual ação sugerida. |
| Acompanhamento | Continuidade do relacionamento, incluindo reuniões, retornos e combinados com data futura. |
| Aprovação | Autorização para uma ação concreta, com destinatário, conteúdo e anexos definidos. |
| Instalação individual | Estrutura na infraestrutura própria de cada pessoa, sem um SaaS central operado para todos os alunos. |
| Consultor 10x | Nome da formação; não representa uma medição comprovada de multiplicação de resultados. |

## Prioridade de negócio

**Esclarecimento posterior de Robson:** separar backend/MCP (dados e ações), Skills no harness da pessoa (GPS, pós-reunião, revisões e brief) e crons/agendamentos do Work/Cowork. Não transformar todos os procedimentos em funcionalidades codificadas do Elo. Claude e ChatGPT são obrigatórios; grupos ficam fora inicialmente; mensagens ficam no histórico consultável por até 30 dias; datas familiares/especiais são opcionais. Triagem Clef no backend está em avaliação e não substitui as Skills. Consulte o [PRD atualizado](docs/prd/elo-v1.md).

**Correção mais recente:** front e telas próprias foram retirados do escopo; só reconsiderar mediante demanda posterior. A interface é a IA da pessoa e os serviços existentes. Rascunhos visuais não foram aprovados.

**Esclarecimento subsequente:** Robson admitiu sandbox com tela simples exclusivamente para informar credenciais Z-API e obter webhook. Aprovação de envios continua no chat, por Skill: IA sugere, consultor lê/aprova, Skill chama MCP. Testar MCP/instalador inexistentes não é condição para organizar issues; antes delas, validar procedimentos com dados fictícios. Os testes integrados serão aceites das futuras entregas.

**Respostas finais às pendências da v0.4:** Skill registra fatos claros automaticamente; dúvidas/conflitos ficam como informação a avaliar e aparecem na rotina, podendo sobreviver à expiração do histórico de 30 dias. V0 sem envio de imagem/documento. Priorizar Skill genérica para simplificar processos e criar/adaptar Skills, ampliando “Simplifique meu processo”; GPS é referência para o consultor criar a sua, não formato único obrigatório.

**Nome e fluxo atuais:** a Skill é **Otimize meu processo**. Entrevista sobre o objetivo, avalia capacidades disponíveis da plataforma (computer use, cron, conectores/MCP e outras pertinentes), cria a Skill do processo e testa junto com a pessoa. Não é uma Skill de GPS fixa.

**Pesquisa posterior:** Robson autorizou comparar generativo + Clef com histórico sintético. O [relatório](docs/experimentos/memoria-30dias/RELATORIO.md) favorece generativo com schema/validação local sem Clef obrigatório. É recomendação experimental, não implantação nem substituição de Skills/crons.

O núcleo é **memória do relacionamento + preparação dos próximos passos + WhatsApp com aprovação**. Fundamentos de IA e aplicação acompanhada continuam necessários na formação. Prompts genéricos e materiais que o aluno já consegue obter sozinho não sustentam a oferta.

Conteúdo e prospecção assistidos por IA são os dois bônus acordados. Não devem aumentar o núcleo a ponto de inviabilizar a instalação e a manutenção.

## Limites

Não incluir envio de ordens de investimento, movimentação financeira, SDR de voz, dependência do Salesforce, disparos em massa ou suporte individual. A formação terá suporte em grupo, com condições ainda a fechar.

Para requisitos completos, estados de decisão e perguntas do grill, leia BRIEF.md.

**Fechamento v1.0:** Robson aceitou DeepSeek na Cloudflare e pediu encerrar descoberta para construir. A engenharia adotou DeepSeek V4 Flash como modelo auxiliar inicial, sem alegar que o experimento anterior o testou; exige Paid/créditos e validação na entrega. PRD pronto, quatro issues no repositório público `orobsonn/elo`, conforme padrão Pi. Implementação será em outra sessão por goal, sem cerimônia do harness, preservando testes/revisão/verificação. Veja [entregas](docs/entregas/elo-v0.md) e [prompt](docs/prompts/implementar-elo-v0.md).
