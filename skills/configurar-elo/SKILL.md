---
name: configurar-elo
description: Conferir a conexão do Elo e mapear a agenda do WhatsApp para localizar pessoas mesmo sem histórico capturado.
---

# Configurar Elo

Use tools autenticadas reais, descobrindo o schema disponível. Sem conexão, não simule configuração.

1. Consulte `installation_status`. Se WhatsApp não configurado, abra a tela `/setup` da instalação; credenciais entram somente nessa superfície protegida, nunca no chat. Login, consentimento e pareamento seguem o roteiro de instalação existente.
2. Execute `contacts_sync` sem cursor. A ferramenta lê uma página da agenda; continue chamando com o `next_cursor` até `complete:true`. Não peça que o usuário copie números, execute SQL ou cadastre cada pessoa.
3. Registre cobertura: páginas percorridas, término ou motivo de pausa. Cota/erro/interrupção não significa agenda completa. Cursor vencido ou conexão alterada pede reiniciar o percurso; repeti-lo não duplica os mesmos endereços.
4. Teste `contacts_list` com o nome solicitado pelo usuário. Pode buscar o nome completo; resposta mostra apenas alias seguro e ID interno, sem telefone ou sobrenome estruturado. Sem mensagem prévia não haverá memória/histórico: explique isso, sem inventar contexto.
5. Homônimos ou alias genérico: peça identificação reconhecível. Não selecione o primeiro nem associe por semelhança. A pessoa pode atribuir um alias curto com `contact_update` após identificar a referência correta. Se não consegue distingui-los, não envie. Atualização não une fichas sem endereço automaticamente.
6. Para enviar, use a Skill `approve`: prepare destinatário/texto, mostre a proposta e aguarde aprovação humana em outra mensagem. Mapear contatos não autoriza envio.

Pode atualizar a agenda novamente quando um contato novo não aparecer. Não importa mensagens antigas, grupos, fotos ou notas do celular; não classifica toda a agenda como cliente. O provedor pode alterar a ordem durante o percurso; conclusão é da paginação observada, não um snapshot imutável. Registros ausentes não são apagados automaticamente.

Contatos excluídos a partir desta versão não são recadastrados automaticamente no mesmo endereço. Bloqueio usa fingerprint privado; a mudança da chave de criptografia exige procedimento de migração. Exclusões anteriores não tinham esse fingerprint e não recebem garantia retroativa.
