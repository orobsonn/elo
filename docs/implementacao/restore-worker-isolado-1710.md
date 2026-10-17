# Recuperação isolada com Worker — 17/10/2026

O ensaio anterior cobriu D1 e o helper de limpeza. Este executou **`scripts/restore.mjs --reopen` inteiro**, com banco, KV e Worker recém-criados na conta pessoal, somente fixtures sintéticas e sem compartilhar recursos, credenciais ou aplicação Access da instalação pessoal. [Registro técnico](restore-worker-isolado-1710.json).

## Preparação e execução

- Nomes aleatórios `elo-restore-e2e-*`, UUID D1 e ID KV fixados no manifesto/configuração própria; a API confirmou os bindings do Worker temporário. Cron vazio foi conferido pela API; IA desabilitada e nenhuma conexão Z-API configurada.
- `main` e migrations por caminho absoluto, origem QA própria e secrets QA aleatórios em arquivo 0600. Não foram copiados secrets/bindings da produção. Identificadores Access e dono sintéticos; nenhum novo acesso à aplicação real concedido.
- Duas tentativas iniciais falharam no build antes de publicar o Worker, por resolução do campo redundante `tsconfig` numa configuração fora do repositório. O campo foi omitido, o dry-run passou e o ensaio prosseguiu. Isso foi um ajuste do ambiente de teste, não alteração no runtime do produto.
- Schema 0001 e fixtures; bookmark real; alteração proposital do alias; bootstrap QA fechado; roteiro completo de manutenção → espera → Time Travel → migrations 0002–0005 → limpeza → reabertura.

## O que foi observado

O MCP QA exigia autenticação antes da recuperação (401). Durante a execução, o monitor externo registrou **75 respostas 503**, abrangendo **77,337 segundos** entre a primeira e a última amostra 503. Depois observou 401 novamente. São amostras, não captura contínua de toda a janela.

A versão reaberta **228dbc96-8e22-4eec-85e2-7f13c05be16c** foi confirmada pelo `/health`, com D1 saudável e commit **0df4eac**. O script terminou com status `restored`. Onze verificações no monitor/SQL cobriram:

- Proteção antes, manutenção 503 observada e versão ativa da reabertura correspondente à saída do roteiro.
- Alias original restaurado; texto ativo preservado; texto vencido expurgado; cinco migrations aplicadas.
- Ação antiga cancelada e seu texto/endereço vencidos apagados; fixture de ação em voo convertida para incerta.
- Sessão antiga removida de `auth_state`, vínculo sintético do dono preservado e envios pausados.

O script declarou rotação do epoch. **Não houve grant OAuth legítimo na QA**, então essa saída não comprova rejeição de um token real antigo. A espera 55s foi exercitada, mas não havia envio/inferência reais em voo; não é prova de drenagem efetiva desses trabalhos. Nenhum WhatsApp foi enviado.

## Encerramento e limites

Worker, KV e D1 temporários foram removidos pelos identificadores recém-criados, depois de conferir nome/bindings e guardar os resultados. A saúde da URL pessoal foi confirmada depois, mantendo **fa8c0a95-b3e7-4529-8e6e-521946abe863 / 4a3945b**. A base pessoal não foi restaurada e sua autenticação não foi rotacionada.

A prova avança os aceites de recuperação das issues #3/#4 além da limpeza D1 isolada. Permanecem separados: revogação com token legítimo, operações reais em voo, integração Access dessa QA, recuperação feita por pessoa leiga e experiência no celular. Não fechar os marcos por esta prova técnica.
