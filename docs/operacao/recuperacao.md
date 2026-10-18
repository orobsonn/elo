# Atualizar, recuperar e sair

Peça à IA assistente: “Atualize meu Elo e confira a saúde preservando meus dados”. Ela verifica a conta/Worker Elo, aplica migrations compatíveis e publica versão validada antes de promover tráfego. No uso diário você não precisa executar comandos nem editar arquivos.

Se uma atualização falhar, a IA pode retornar à última versão de código validada. Isso **não desfaz alterações no banco**. Versões anteriores a uma rotação de autenticação não devem ser restauradas com secrets antigos; a IA deve publicar o código anterior com o epoch atual.

Para recuperar dados, informe à IA o momento desejado. O Time Travel por horário escolhe o snapshot disponível anterior mais próximo; a IA deve conferir a cobertura e preferir bookmark exato quando disponível. `scripts/restore.mjs` coloca a aplicação em manutenção e muda o epoch fora do banco antes do restore, aguarda operações limitadas em voo, restaura D1, reaplica as migrations do código atual, reaplica o corte de 30 dias e invalida aprovações antigas. Uma interrupção mantém manutenção. Depois a IA valida e reabre; envios continuam pausados até sua decisão. Não apresentar esse procedimento como recuperação já testada com pessoa leiga.

Na configuração protegida você pode pausar novos envios ou revogar Z-API. Envios em execução podem já ter sido aceitos e precisam de consulta. Para excluir um contato, peça explicitamente no chat; `contact_delete` exige ID e confirmação exata. Tombstones opacos impedem replay das mesmas mensagens. Para exportar seus dados, entre pelo Access e abra `/export` na instalação; o arquivo é privado, pode conter endereços restritos e não deve ir ao suporte/grupo/chat.

A IA pode revogar todos os acessos Elo rotacionando `AUTH_EPOCH` pelo controle Cloudflare, sem colocar o valor no chat. Logout do navegador não revoga automaticamente clientes MCP. Access revalida sessões derivadas em até 15 minutos por refresh e o grant tem prazo absoluto de sete dias; uma política/organização pode encurtar esse prazo. Esses limites exigem validação no serviço real.

O expurgo remove o histórico do armazenamento ativo; Time Travel/backups D1 podem conservar versões por sua janela contratada. Dados da Z-API, histórico do Claude/ChatGPT e arquivos exportados têm exclusão própria. Desconectar o Elo não apaga automaticamente esses serviços. A IA deve explicar a janela vigente de backups e não prometer exclusão instantânea universal.

Nesta conta Paid, a documentação D1 informa janela Time Travel de até 30 dias, distinta do histórico ativo. Conferência em 2026-10-17: [Time Travel D1](https://developers.cloudflare.com/d1/reference/time-travel/). Nenhuma exportação periódica adicional foi habilitada. Exports que você baixar ficam sob sua guarda.

A atualização 0005 foi coberta por teste controlado de recuperação a partir do schema 0001: migrations, corte do texto vencido, pausa e invalidação de sessão. Não foi feito novo Time Travel na base pessoal nesta atualização. Se a reaplicação falhar, o script interrompe antes da limpeza/reabertura e mantém manutenção.

Em 17/10 foi exercitado Time Travel real numa D1 temporária somente sintética: snapshot do schema 0001, restore, migrations 0002–0005, retenção e invalidação de ações/sessões. A limpeza também apaga texto/endereço de ações vencidas antes da reabertura. A base pessoal não foi restaurada. Essa prova não cobre manutenção/epoch do Worker nem piloto leigo. [Evidência isolada](../implementacao/restore-isolado-1710.json).

O roteiro inteiro `restore.mjs --reopen` também foi executado em 17/10 numa instalação temporária só sintética, com Worker/D1/KV próprios. O monitor observou manutenção 503 e reabertura saudável, e a limpeza/pausa foram conferidas. Os recursos foram removidos ao final. Não comprova token OAuth legítimo antigo, drenagem real em voo ou recuperação por pessoa leiga. [Evidência do roteiro completo](../implementacao/restore-worker-isolado-1710.md).

Depois desse ensaio, a migração aditiva 0006 criou dois índices de revisão. O teste controlado de recuperação lê todas as migrations da pasta e passou também com 0006. Não foi repetido Time Travel real após essa mudança: a prova remota acima termina no schema 0005. Antes de reabrir uma recuperação atual, a IA deve conferir que 0006 foi reaplicada e que os dois índices existem, além das verificações de retenção, pausa e autorização.
