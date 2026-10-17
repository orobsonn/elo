# Atualizar, recuperar e sair

Peça à IA assistente: “Atualize meu Elo e confira a saúde preservando meus dados”. Ela verifica a conta/Worker Elo, aplica migrations compatíveis e publica versão validada antes de promover tráfego. No uso diário você não precisa executar comandos nem editar arquivos.

Se uma atualização falhar, a IA pode retornar à última versão de código validada. Isso **não desfaz alterações no banco**. Versões anteriores a uma rotação de autenticação não devem ser restauradas com secrets antigos; a IA deve publicar o código anterior com o epoch atual.

Para recuperar dados, informe à IA o momento desejado. O Time Travel por horário escolhe o snapshot disponível anterior mais próximo; a IA deve conferir a cobertura e preferir bookmark exato quando disponível. `scripts/restore.mjs` coloca a aplicação em manutenção e muda o epoch fora do banco antes do restore, aguarda operações limitadas em voo, restaura D1, reaplica as migrations do código atual, reaplica o corte de 30 dias e invalida aprovações antigas. Uma interrupção mantém manutenção. Depois a IA valida e reabre; envios continuam pausados até sua decisão. Não apresentar esse procedimento como recuperação já testada com pessoa leiga.

Na configuração protegida você pode pausar novos envios ou revogar Z-API. Envios em execução podem já ter sido aceitos e precisam de consulta. Para excluir um contato, peça explicitamente no chat; `contact_delete` exige ID e confirmação exata. Tombstones opacos impedem replay das mesmas mensagens. Para exportar seus dados, entre pelo Access e abra `/export` na instalação; o arquivo é privado, pode conter endereços restritos e não deve ir ao suporte/grupo/chat.

A IA pode revogar todos os acessos Elo rotacionando `AUTH_EPOCH` pelo controle Cloudflare, sem colocar o valor no chat. Logout do navegador não revoga automaticamente clientes MCP. Access revalida sessões derivadas em até 15 minutos por refresh e o grant tem prazo absoluto de sete dias; uma política/organização pode encurtar esse prazo. Esses limites exigem validação no serviço real.

O expurgo remove o histórico do armazenamento ativo; Time Travel/backups D1 podem conservar versões por sua janela contratada. Dados da Z-API, histórico do Claude/ChatGPT e arquivos exportados têm exclusão própria. Desconectar o Elo não apaga automaticamente esses serviços. A IA deve explicar a janela vigente de backups e não prometer exclusão instantânea universal.

Nesta conta Paid, a documentação D1 informa janela Time Travel de até 30 dias, distinta do histórico ativo. Conferência em 2026-10-17: [Time Travel D1](https://developers.cloudflare.com/d1/reference/time-travel/). Nenhuma exportação periódica adicional foi habilitada. Exports que você baixar ficam sob sua guarda.

A atualização 0005 foi coberta por teste controlado de recuperação a partir do schema 0001: migrations, corte do texto vencido, pausa e invalidação de sessão. Não foi feito novo Time Travel na base pessoal nesta atualização. Se a reaplicação falhar, o script interrompe antes da limpeza/reabertura e mantém manutenção.
