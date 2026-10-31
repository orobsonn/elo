# Reparos LID limitados — v0.4.2

## Escopo e decisão

O dono solicitou reduzir a repetição de páginas causada pelo limite de um reparo LID por chamada, preservando as proteções e verificando efeitos secundários. A implementação continua individual, sem grupos, novas autorizações, proatividade ou acesso à instalação do cliente.

Escolha de engenharia: **até cinco reparos sequenciais** por chamada. Cada par continua passando por `observePair` e sua transação existente. Não usamos paralelismo de mutações, engine nova ou uma transação global para todos os contatos. Se houver mais reparos, a mesma página continua com o próximo passo/cursor. Falha no terceiro reparo mantém os dois commits anteriores; a página não avança e a retomada ignora os pares comprovados.

O limite deixa margem no orçamento de chamadas do runtime. A [documentação do D1](https://developers.cloudflare.com/d1/platform/limits/#batch-limits) conta `batch()` como uma chamada, não uma por statement. O teste anterior contava `prepare`, que não executa consulta: foi corrigido para medir `first/all/run/batch`, bindings e acessos ao provedor.

## Revisão adversarial antes da implementação

O revisor independente aprovou o lote limitado, condicionado a testes de cota, histórico dos próprios contatos reparados e falhas parciais. Encontrou também uma brecha anterior: exclusão de um LID entre a consulta ao provedor e a gravação da página podia recriar a pessoa pelo telefone ainda não aprendido. Tratar apenas os cinco escolhidos deixaria a cauda vulnerável.

As regressões vermelhas reproduziram o recadastro nos casos de LID selecionado, fora do lote, excluído antes da seleção e excluído imediatamente antes do commit. Outro teste mostrou que filtrar só a página atual não basta: um novo percurso sem LIDs pendentes perdia a evidência e recriava o telefone.

A revisão final encontrou outro interleaving e bloqueou o fechamento: com exatamente cinco LIDs, quatro reparos podiam commitar enquanto o primeiro havia sido excluído. Se a página abortasse, o fingerprint do telefone era revertido e nenhum LID pendente restava para provocar lookup na retomada. A regressão falhou com um marcador em vez de dois. Reconsultar não basta, pois o provedor pode omitir o par depois.

A correção preserva a evidência em HMAC antes dos reparos e a consome na transação de exclusão. O revisor exigiu também que callbacks respeitassem essa prova e que a restauração não a apagasse ao invalidar autorizações; ambas as condições foram incorporadas e testadas.

## Proteções incorporadas

- A página mantém em memória somente os pares autenticados daquela resposta. O payload privado inclui o fingerprint de telefone e LID; a projeção MCP permanece igual, sem esses campos ou endereços.
- O batch recusa contradições com pares já gravados na mesma geração, também fora do lote escolhido. Usa buscas exatas indexadas em vez de introduzir outra varredura por OR/join.
- Migration `0012_directory_identity_fingerprints.sql` cria índice privado de pares de HMAC, com unicidade por telefone e LID na geração. Antes de reparar, um batch protegido preserva esses pares e materializa/propaga marcadores de aliases já excluídos. Não grava antecipadamente pares brutos nem une fichas fora do lote.
- A exclusão consulta esse índice dentro de sua própria transação, inclusive se a prova apareceu depois do preflight. Callbacks verificam a mesma bijeção no batch de `observePair`; não podem introduzir um par contraditório entre preflight e commit.
- O batch da página repete propagação e verifica ambos os marcadores antes de importar. Rollback reverte nomes e avanço, mas conserva a prova e os marcadores já confirmados em transações anteriores. Assim, nem ausência de LIDs pendentes nem omissão posterior do provedor permitem perder o bloqueio.
- Os pares de HMAC são metadados pessoais pseudonimizados, restritos ao backend/exportação privada, retidos durante a conexão para proteção operacional. Troca de geração da conexão limpa a tabela por trigger; não limpa tombstones. O bump de dados usado na restauração preserva a prova válida do backup. Rotação da chave exige migrar/preservar fingerprints, como os tombstones existentes.
- Uma corrida perdida durante reparo só retorna sucesso se houver recibo canônico da mesma execução/passo/gerações/epoch. Sem recibo válido, preserva o erro. Isso não contorna conflito real nem resultado incerto de envio.
- Permanecem guards de exclusão, aliases manuais, duas fichas classificadas, provas contraditórias, mudanças de geração/execução e ações `executing/uncertain`. A identidade alterada cancela ações pendentes e sinaliza revisão da memória transferida.

## Medições em D1/workerd local

Dados sintéticos e provedor controlado, não medições da instalação do cliente:

| Cenário | Chamadas de sync | Linhas lidas | Linhas escritas |
|---|---:|---:|---:|
| v0.4.1 publicada: 1.700 contatos, 44 LIDs e histórico não relacionado | 61 | 438.153 | não medida naquele ensaio |
| Código com proteções novas, mutação controlada para **um** reparo | 61 | 505.121 | 14.658 |
| Mesmo cenário com **cinco** reparos | 26 | 195.979 | 7.576 |

O cenário inclui 30 mil fontes e cinco mil tarefas/ações não relacionadas. A mutação para um reparo fez os testes de eficiência/histórico falharem; o código foi restaurado antes da verificação final. Assim, o ganho do lote não é confundido com a proteção adicional de exclusão.

Também movemos cinco históricos de **2.500 mensagens**, com memória, tarefas, ações e fichas classificadas: **33.946 leituras, 23.155 escritas, 34 chamadas D1 e cinco ao provedor**. Conferimos fontes/versionamento, leases antigos, revisão da memória, preservação de fatos confirmados/aliases, prazos e cancelamento de ações pendentes. O cenário sem reparo manteve **6.885 leituras** na página de 100 entradas.

Os testes limitam o cenário completo a 26 chamadas, 250 mil leituras e 25 mil escritas; cada invocação fica abaixo de 45 acessos medidos entre D1 e provedor. Os limiares são critérios dos cenários, não limites universais para qualquer volume de histórico. Autenticação externa, CPU/latência de produção e disputa com outras aplicações não estão certificados por esse ensaio local.

## Limites preservados

- Cada par é transacional; o lote inteiro não é. A cota continua contabilizando consultas reais, inclusive tentativas que falham.
- A cota diária do D1 segue compartilhada na conta. Mover histórico grande exige escritas reais; o lote não reserva saldo nem impede esgotamento por outros usos. Os marcadores propagados são limitados a 200 fingerprints por resposta de até 100 pares.
- Um vínculo nunca obtido pelo backend continua desconhecido. Provas já preservadas protegem exclusões futuras; a migration não inventa pares nem dá garantia retroativa a exclusões cuja relação nunca foi aprendida. Não inferimos identidade por nome.
- Bloquear importações por um alias comprovado não apaga automaticamente outra ficha classificada já existente nem muda sua autorização de envio. Ficha, histórico, alias e ação existentes são preservados; a exclusão explícita dessa outra ficha pertence ao dono.
- Apenas o recibo mais recente é recuperável. Sem cursor, iniciar outra execução continua sendo uma operação nova; expiração, restauração e troca de conexão mantêm os bloqueios anteriores.
- Agendas com todos os contatos exigindo reparo ainda podem ultrapassar 300 chamadas/dia. Não há promessa de terminar qualquer agenda em um dia.

## Verificação e ativação

`npm test -- --maxWorkers=2`: **267 testes em 16 arquivos** passaram. `npm run test:installer`: **26 testes**, incluindo upgrade e restauração, passaram. TypeScript, build seco e diff-check passaram; audit de dependências de produção retornou zero vulnerabilidades. A mutação controlada para um reparo falhou em dois testes de comportamento/custo e foi restaurada antes da suíte final.

Regressões cobrem cinco reparos e sexto pendente; replay; falha antes/depois do commit do terceiro par; contradição intermediária/fora do lote; exclusão em quatro interleavings e numa consulta futura; captura pelo telefone comprovado excluído; troca de conexão/dados/execução entre pares; aliases manuais, fichas classificadas e ações em voo; concorrência e histórico dos alvos. Incluem rollback sem LID restante, retomada sem depender da repetição do par pelo provedor, conflitos entre callback e evidência durável em ambas as ordens, exclusão com prova inserida depois do preflight, restauração e limpeza por reconfiguração.

Aplicar migration aditiva **0012** antes de publicar o backend. Os cursores da v0.4.1 continuam válidos; instalações anteriores precisam também das migrations já publicadas, incluindo 0011. MCP/Skills e plugin 1.1.1 continuam compatíveis, pois o contrato público é o mesmo. Atualizar backend, conferir versão/saúde e percorrer a agenda até `complete:true`.

Ativação pessoal usa commit revisado, preview, promoção e smokes; envios permanecem pausados e Z-API não é reconectada como teste. Validação no cliente continua separada. Rollback para v0.4.1 reintroduz um reparo por chamada e perde as proteções novas mesmo para provas já preservadas: o código antigo não consulta a nova tabela durante exclusões/captura. Somente tombstones já propagados continuam sendo respeitados. A tabela permanece para recuperação adiante; não limpar fingerprints para contornar bloqueios. Em incidente, suspender sync e preservar envios pausados até recuperar uma versão que consuma a prova.
