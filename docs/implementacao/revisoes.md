# Revisões independentes e tratamento

Revisões somente leitura por Astra/high, com arquivos reais novos e testes, sem selos de harness.

- Desenho: revogação de refresh, vínculo issuer/subject, CAS com estado atual, timeout sem ID, tombstones/fencing, manutenção fora do backup, campos canônicos e custo diário. Incorporados no código; sem afirmar integração real.
- E1/E2: envelopes oficiais `isEdit`/DeliveryCallback/LID; status antecipado; exclusão simultânea; PII formatada no alias; autoria da extração; abuso de login; export com backpressure. Corrigidos e cobertos por regressões locais. O runner compartilhava D1 por arquivo; reset explícito por teste eliminou um falso verde e mostrou a regressão concorrente.
- Revisão final: preparo concorrente com exclusão, direção em review_page, corte de actions na exportação e versões editadas após revisão. INSERT de preparo agora tem fence na mesma transação; revisão guarda versões efetivamente mostradas em review_items; export aplica corte independentemente do cron.

Cada prova de concorrência usa o D1 do workerd; provedor Z-API e inferência são controlados nos testes locais. Isso não prova ordenamento, autenticação ou entrega do provedor real. Login/refresh Access e schema/qualidade DeepSeek ainda exigem os smokes publicados. Não foram lidas fontes privadas nem credenciais em relatórios.

Fechamento R13: revisor independente novo conferiu associação, memória e migrations 0001–0004, executando 35/35 testes focados. Fontes transferidas recebem identidade sujeita à revisão permanente; tarefas deduplicam pela fonte global; revisão manual usa claim de estado aleatório e revalida a seleção completa antes de substituir fatos. Exclusão por ID provisório aposentado recusa em vez de anunciar sucesso. Não restaram achados materiais conhecidos nesse escopo. Verificação integrada posterior pelo responsável: 87/87 workerd, 7/7 instalador Node, TypeScript e build/dry-run aprovados.
