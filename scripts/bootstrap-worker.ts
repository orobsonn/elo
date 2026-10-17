// First provisioning only: no authentication surface, tools, data or provider routes.
export default {
  fetch(request: Request) {
    return new URL(request.url).pathname === "/health"
      ? Response.json({ ok: true, bootstrap: true })
      : new Response("Configuração em andamento.", { status: 503 });
  },
};
