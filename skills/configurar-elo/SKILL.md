---
name: configurar-elo
description: Use quando a pessoa acabou de instalar o Elo, pergunta o que instalou ou como começar, quer retomar o primeiro uso, conferir a conexão ou mapear a agenda WhatsApp.
---

# Configurar Elo

Use tools autenticadas reais, descobrindo o schema disponível. Sem conexão, não simule configuração. Instalação de infraestrutura segue o [guia canônico](https://github.com/orobsonn/elo/blob/main/docs/operacao/instalacao-assistida.md); esta Skill orienta o uso no cliente e a agenda, não substitui o instalador. Links externos usam a documentação atual; confira versão/commit da instalação antes de orientar mudanças e prefira o mesmo caminho em `blob/<commit>` quando houver commit completo verificado. O roteiro de primeiro uso em `references/` acompanha o pacote da Skill.

## Começar ou retomar sem importar nada

1. Consulte `installation_status`. Se a tool/conector não estiver acessível, informe a pendência e oriente a conexão no cliente; não invente diagnóstico.
2. Pedido “me mostre como usar”, “o que instalei”, “terminei” ou dúvida de primeiro uso: siga [Vamos usar seu Elo](references/primeiro-uso.md). Ofereça essa etapa ao final da instalação; ela é opcional e retomável. Não importar agenda, abrir `/setup` ou gravar demonstração só para explicar a solução.
3. Explique o estado com seu limite: `not_configured` = WhatsApp pendente, memória manual pode ser usada se as tools estiverem disponíveis; `configured_connection_not_checked` = credenciais salvas, não saúde atual. `capture_started_at` é um corte temporal, não prova de captura. `last_received_at` é um evento anterior, não cobertura completa; `last_error_code` pode ser histórico; `pending` é checklist, não veredito sobre recursos já testados. Não afirmar que Skills estão instaladas só por seus arquivos existirem.
4. Se a pessoa escolher conectar WhatsApp, abra `/setup` da **própria instalação** e o [guia visual Z-API](https://github.com/orobsonn/elo/blob/main/docs/operacao/zapi.md), conferindo versão conforme acima. Credenciais só na superfície protegida. Login, consentimento e pareamento seguem o instalador. Sem WhatsApp, não chamar `contacts_sync`; ofereça continuar na memória.

## Mapear agenda somente quando escolhido

1. Antes da primeira chamada `contacts_sync`, explique que ela **lê e persiste a agenda WhatsApp no backend**, com identificadores de entrega privados, e peça autorização explícita para essa finalidade. Ofereça “pular agora”. Pedido explícito de mapear a agenda ou localizar/enviar a um contato salvo já autoriza a atualização necessária; “explique/mostre como usar” não autoriza. Recusa persiste na sessão: não insistir nem importar como pré-requisito da apresentação.
2. Com conexão configurada e autorização, execute `contacts_sync` sem cursor. A ferramenta lê uma página; continue com `next_cursor` até `complete:true`. Não pedir números, SQL ou cadastro pessoa a pessoa.
3. Registre páginas concluídas e motivo de pausa. Em cota/erro, pare sem retry automático: dados das páginas anteriores já podem estar persistidos. Informe mapa parcial, sem concluir ausência ou unicidade de contato. Retome depois; cursor vencido ou conexão alterada exige reiniciar o percurso, sem duplicar os mesmos endereços. Nunca inventar `complete:true`.
4. Só teste `contacts_list` se houver nome solicitado pela pessoa. Não inventar um nome para o teste nem escolher contato real aleatório. Resposta mostra alias seguro e ID interno, sem telefone/sobrenome estruturado. Sem fontes disponíveis, explique a falta de histórico sem inventar contexto.
5. Homônimos ou resultados que o pedido não permita distinguir exigem identificação reconhecível. Alias genérico, isoladamente, não obriga recadastro quando a busca pelo nome solicitado identifica uma ficha sem ambiguidade. Não selecionar o primeiro nem associar por semelhança. `contact_update` só após identificar a referência e autorizar a mudança de alias. Se não consegue distinguir, não envie. Atualização não une fichas automaticamente.
6. Envio usa `approve`: pediu para enviar, a IA redige e envia direto no assunto solicitado. Só aguarda aprovação quando o dono pede prévia/revisão; pedir apenas rascunho não autoriza envio. Não repetir aprovação já dada. Mapear agenda ou habilitar envios não aprova nenhuma mensagem. Não enviar demonstração sem autorização específica.

Pode atualizar a agenda novamente quando um contato novo não aparecer. Não importa mensagens antigas, grupos, fotos ou notas do celular; não classifica toda a agenda como cliente. O provedor pode alterar a ordem durante o percurso; conclusão é da paginação observada, não um snapshot imutável. Registros ausentes não são apagados automaticamente.

Contatos excluídos a partir desta versão não são recadastrados automaticamente no mesmo endereço. Bloqueio usa fingerprint privado; a mudança da chave de criptografia exige procedimento de migração. Exclusões anteriores não tinham esse fingerprint e não recebem garantia retroativa.
