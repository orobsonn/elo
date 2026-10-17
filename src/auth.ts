import {
  OAuthProvider,
  OAuthError,
  type AuthRequest,
  type OAuthResourceContext,
} from "@cloudflare/workers-oauth-provider";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AppEnv } from "./env";

export interface OwnerAuth {
  ownerId: string;
  epoch: string;
  authUntil: number;
  credentialId: string;
  csrf?: string;
}
interface Login {
  binding: string;
  nonce: string;
  verifier: string;
  epoch: string;
  authRequest?: AuthRequest;
}
interface Stored {
  expires: number;
  data: string;
}
interface UpstreamCredential {
  ownerId: string;
  epoch: string;
  nonce: string;
  authUntil: number;
  accessUntil: number;
  issuedAt: number;
  audience: string;
  authTime?: number;
  tokens: UpstreamTokens;
}
interface UpstreamTokens {
  id_token?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
}
class AuthUnavailable extends Error {
  constructor(readonly safeCode = "auth_indisponivel") {
    super(safeCode);
  }
}
const FLOW_COOKIE = "__Host-elo-flow";
const SESSION_COOKIE = "__Host-elo-session";
const MAX_AUTH_SECONDS = 7 * 24 * 60 * 60;
const UPSTREAM_CHECK_SECONDS = 15 * 60;
const SCOPES = ["elo", "offline_access"];
const now = () => Math.floor(Date.now() / 1000);
const enc = new TextEncoder();
const b64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
const unb64 = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );
const random = () => b64(crypto.getRandomValues(new Uint8Array(32)));
const digest = async (s: string) =>
  b64(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s))));
const denied = () =>
  new Error("Sessão inválida. Conecte novamente pelo Cloudflare Access.");
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const secureHeaders = () =>
  new Headers({
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy":
      "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    "X-Frame-Options": "DENY",
  });
function cookie(request: Request, name: string) {
  return request.headers
    .get("Cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
function setCookie(name: string, value: string, ttl: number) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.max(0, Math.floor(ttl))}`;
}
function responseError(status = 401) {
  return new Response(
    status === 503
      ? "Elo temporariamente em manutenção."
      : "Não foi possível autorizar. Inicie a conexão novamente.",
    { status, headers: secureHeaders() },
  );
}
function canonical(request: Request, env: AppEnv) {
  const origin = new URL(env.PUBLIC_ORIGIN);
  if (
    origin.protocol !== "https:" ||
    origin.origin !== env.PUBLIC_ORIGIN ||
    new URL(request.url).origin !== origin.origin
  )
    throw denied();
}
function operational(env: AppEnv) {
  if (env.MAINTENANCE !== "false" || !env.AUTH_EPOCH || !env.OWNER_EMAIL)
    throw denied();
}
export function accessEndpoints(env: AppEnv) {
  if (
    !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN) ||
    !/^[a-zA-Z0-9_-]{1,200}$/.test(env.ACCESS_CLIENT_ID)
  )
    throw denied();
  const issuer = `https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/sso/oidc/${env.ACCESS_CLIENT_ID}`;
  return {
    issuer,
    authorization: `${issuer}/authorization`,
    token: `${issuer}/token`,
    jwks: `${issuer}/jwks`,
  };
}
async function key(env: AppEnv) {
  if (!/^[a-fA-F0-9]{64}$/.test(env.ENCRYPTION_KEY)) throw denied();
  return crypto.subtle.importKey(
    "raw",
    Uint8Array.from(env.ENCRYPTION_KEY.match(/../g)!, (h) => parseInt(h, 16)),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}
async function seal(value: unknown, aad: string, env: AppEnv) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: enc.encode(aad) },
    await key(env),
    enc.encode(JSON.stringify(value)),
  );
  return `${b64(iv)}.${b64(new Uint8Array(data))}`;
}
async function open<T>(cipher: string, aad: string, env: AppEnv): Promise<T> {
  const parts = cipher.split(".");
  if (parts.length !== 2) throw denied();
  const data = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(parts[0]), additionalData: enc.encode(aad) },
    await key(env),
    unb64(parts[1]),
  );
  return JSON.parse(new TextDecoder().decode(data)) as T;
}
async function store(
  name: string,
  data: unknown,
  expires: number,
  env: AppEnv,
) {
  await env.DB.prepare("INSERT INTO auth_state(key,value) VALUES(?,?)")
    .bind(name, JSON.stringify({ expires, data: await seal(data, name, env) }))
    .run();
}
async function load<T>(name: string, env: AppEnv, consume = false): Promise<T> {
  const row = await env.DB.prepare(
    consume
      ? "DELETE FROM auth_state WHERE key=? RETURNING value"
      : "SELECT value FROM auth_state WHERE key=?",
  )
    .bind(name)
    .first<{ value: string }>();
  if (!row) throw denied();
  const stored = JSON.parse(row.value) as Stored;
  if (!Number.isInteger(stored.expires) || stored.expires <= now())
    throw denied();
  return open<T>(stored.data, name, env);
}
async function ownerEnabled(env: AppEnv) {
  operational(env);
  const row = await env.DB.prepare(
    "SELECT value FROM auth_state WHERE key='owner_disabled'",
  ).first<{ value: string }>();
  if (row && row.value !== "false") throw denied();
}
export async function requireMcpOwner(
  props: unknown,
  env: AppEnv,
): Promise<OwnerAuth> {
  await ownerEnabled(env);
  const p = props as Partial<OwnerAuth> | undefined;
  if (
    !p ||
    typeof p.ownerId !== "string" ||
    !/^[a-zA-Z0-9_-]{43}$/.test(p.ownerId) ||
    typeof p.credentialId !== "string" ||
    !/^[a-zA-Z0-9_-]{43}$/.test(p.credentialId) ||
    p.epoch !== env.AUTH_EPOCH ||
    typeof p.authUntil !== "number" ||
    !Number.isInteger(p.authUntil) ||
    p.authUntil <= now() ||
    p.authUntil > now() + MAX_AUTH_SECONDS
  )
    throw denied();
  const binding = await env.DB.prepare(
    "SELECT value FROM auth_state WHERE key='owner_binding'",
  ).first<{ value: string }>();
  if (!binding || binding.value !== p.ownerId) throw denied();
  await ensureUpstream(p as OwnerAuth, env);
  return {
    ownerId: p.ownerId,
    epoch: p.epoch,
    authUntil: p.authUntil,
    credentialId: p.credentialId,
    ...(typeof p.csrf === "string" ? { csrf: p.csrf } : {}),
  };
}
export async function requireOwner(
  request: Request,
  env: AppEnv,
): Promise<OwnerAuth> {
  canonical(request, env);
  operational(env);
  const sid = cookie(request, SESSION_COOKIE);
  if (!sid || !/^[a-zA-Z0-9_-]{43}$/.test(sid)) throw denied();
  const session = await load<OwnerAuth>(`session:${await digest(sid)}`, env);
  await requireMcpOwner(session, env);
  return {
    ownerId: session.ownerId,
    epoch: session.epoch,
    authUntil: session.authUntil,
    credentialId: session.credentialId,
    csrf: session.csrf,
  };
}
export async function requireSetupCsrf(
  request: Request,
  owner: OwnerAuth,
  env: AppEnv,
  supplied?: unknown,
) {
  canonical(request, env);
  if (
    request.method !== "POST" ||
    request.headers.get("Origin") !== env.PUBLIC_ORIGIN ||
    !owner.csrf
  )
    throw denied();
  const csrf = supplied ?? (await request.clone().formData()).get("csrf");
  if (csrf !== owner.csrf) throw denied();
}
async function beginLogin(
  request: Request,
  env: AppEnv,
  authRequest?: AuthRequest,
) {
  await ownerEnabled(env);
  const existing = cookie(request, FLOW_COOKIE);
  if (existing && /^[a-zA-Z0-9_-]{43}$/.test(existing)) {
    try {
      const saved = await load<{ state: string }>(
        `flow:${await digest(existing)}`,
        env,
      );
      const pending = await load<Login>(`login:${saved.state}`, env);
      if (
        pending.epoch === env.AUTH_EPOCH &&
        pending.binding === (await digest(existing)) &&
        JSON.stringify(pending.authRequest) === JSON.stringify(authRequest)
      )
        return loginRedirect(saved.state, pending, existing, env);
    } catch {} // Expired or consumed flow starts again without trusting browser state.
  }
  const window = Math.floor(now() / 600);
  const source = await digest(
    `${env.AUTH_EPOCH}:${request.headers.get("CF-Connecting-IP") ?? "unavailable"}:${window}`,
  );
  const limit = await env.DB.prepare(
    "INSERT INTO auth_state(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=json_set(auth_state.value,'$.count',json_extract(auth_state.value,'$.count')+1) RETURNING value",
  )
    .bind(
      `rate:${source}`,
      JSON.stringify({ expires: (window + 1) * 600, count: 1 }),
    )
    .first<{ value: string }>();
  if (!limit || JSON.parse(limit.value).count > 10) return responseError(429);
  // Bound unauthenticated state growth; expired encrypted envelopes can be removed without decrypting.
  await env.DB.prepare(
    "DELETE FROM auth_state WHERE (key LIKE 'login:%' OR key LIKE 'consent:%' OR key LIKE 'session:%' OR key LIKE 'credential:%' OR key LIKE 'refresh:%' OR key LIKE 'flow:%' OR key LIKE 'rate:%') AND json_extract(value,'$.expires') <= ?",
  )
    .bind(now())
    .run();
  const count = await env.DB.prepare(
    "SELECT count(*) AS n FROM auth_state WHERE key LIKE 'login:%'",
  ).first<{ n: number }>();
  if ((count?.n ?? 0) >= 2000) return responseError(503);
  const state = random(),
    binding = random(),
    verifier = random(),
    nonce = random();
  const pending: Login = {
    binding: await digest(binding),
    nonce,
    verifier,
    epoch: env.AUTH_EPOCH,
    authRequest,
  };
  await store(`login:${state}`, pending, now() + 600, env);
  await store(`flow:${await digest(binding)}`, { state }, now() + 600, env);
  return loginRedirect(state, pending, binding, env);
}
async function loginRedirect(
  state: string,
  flow: Login,
  binding: string,
  env: AppEnv,
) {
  const url = new URL(accessEndpoints(env).authorization);
  for (const [k, v] of Object.entries({
    response_type: "code",
    client_id: env.ACCESS_CLIENT_ID,
    redirect_uri: `${env.PUBLIC_ORIGIN}/callback`,
    scope: "openid email offline_access",
    prompt: "consent",
    state,
    nonce: flow.nonce,
    code_challenge: await digest(flow.verifier),
    code_challenge_method: "S256",
  }))
    url.searchParams.set(k, v);
  const headers = secureHeaders();
  headers.set("Location", url.toString());
  headers.set("Set-Cookie", setCookie(FLOW_COOKIE, binding, 600));
  return new Response(null, { status: 302, headers });
}
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
async function verifyIdToken(
  idToken: string,
  nonce: string,
  env: AppEnv,
  refresh = false,
) {
  const ep = accessEndpoints(env);
  let jwks = jwksCache.get(ep.jwks);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(ep.jwks), { timeoutDuration: 8000 });
    jwksCache.set(ep.jwks, jwks);
  }
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: ep.issuer,
    audience: env.ACCESS_CLIENT_ID,
    algorithms: ["RS256"],
    requiredClaims: [
      "sub",
      "exp",
      "iat",
      "email",
      "email_verified",
      ...(refresh ? [] : ["nonce"]),
    ],
    maxTokenAge: refresh ? "5m" : "24h",
  });
  if (
    (payload.azp !== undefined && payload.azp !== env.ACCESS_CLIENT_ID) ||
    (Array.isArray(payload.aud) &&
      payload.aud.length > 1 &&
      payload.azp !== env.ACCESS_CLIENT_ID)
  )
    throw denied();
  if (
    ((!refresh || payload.nonce !== undefined) && payload.nonce !== nonce) ||
    payload.email_verified !== true ||
    typeof payload.email !== "string" ||
    payload.email.toLowerCase() !== env.OWNER_EMAIL.toLowerCase() ||
    !payload.sub ||
    !payload.exp
  )
    throw denied();
  return {
    ownerId: await digest(JSON.stringify([ep.issuer, payload.sub])),
    accessUntil: Math.min(payload.exp, now() + UPSTREAM_CHECK_SECONDS),
    issuedAt: payload.iat!,
    audience: JSON.stringify(
      Array.isArray(payload.aud) ? [...payload.aud].sort() : [payload.aud],
    ),
    authTime:
      typeof payload.auth_time === "number" ? payload.auth_time : undefined,
  };
}
async function upstreamTokens(
  parameters: Record<string, string>,
  env: AppEnv,
): Promise<UpstreamTokens> {
  let response: Response;
  try {
    response = await fetch(accessEndpoints(env).token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        ...parameters,
        client_id: env.ACCESS_CLIENT_ID,
        client_secret: env.ACCESS_CLIENT_SECRET,
      }),
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    const timeout =
      error instanceof Error &&
      ["AbortError", "TimeoutError"].includes(error.name);
    throw new AuthUnavailable(
      timeout ? "auth_upstream_timeout" : "auth_upstream_transport",
    );
  }
  if (response.status >= 500 || response.status === 429)
    throw new AuthUnavailable(`auth_upstream_http_${response.status}`);
  if (
    !response.ok ||
    Number(response.headers.get("Content-Length") ?? 0) > 32768
  )
    throw denied();
  const text = await response.text();
  if (text.length > 32768) throw denied();
  const tokens = JSON.parse(text) as UpstreamTokens;
  if (
    typeof tokens.id_token !== "string" ||
    typeof tokens.access_token !== "string" ||
    (tokens.refresh_token !== undefined &&
      (typeof tokens.refresh_token !== "string" ||
        tokens.refresh_token.length > 8192)) ||
    (tokens.expires_in !== undefined &&
      (!Number.isInteger(tokens.expires_in) || tokens.expires_in <= 0)) ||
    (tokens.refresh_expires_in !== undefined &&
      (!Number.isInteger(tokens.refresh_expires_in) ||
        tokens.refresh_expires_in <= 0))
  )
    throw denied();
  return tokens;
}
async function ensureUpstream(owner: OwnerAuth, env: AppEnv) {
  const name = `credential:${owner.credentialId}`;
  let credential = await load<UpstreamCredential>(name, env);
  const check = () => {
    if (
      credential.ownerId !== owner.ownerId ||
      credential.epoch !== env.AUTH_EPOCH ||
      credential.authUntil !== owner.authUntil ||
      credential.authUntil <= now()
    )
      throw denied();
  };
  check();
  if (credential.accessUntil > now()) return;
  if (!credential.tokens.refresh_token) throw denied();
  const lockKey = `refresh:${owner.credentialId}`;
  const lockValue = JSON.stringify({ expires: now() + 30, token: random() });
  const acquired = await env.DB.prepare(
    "INSERT INTO auth_state(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE json_extract(auth_state.value,'$.expires')<=? RETURNING key",
  )
    .bind(lockKey, lockValue, now())
    .first();
  if (!acquired) throw new AuthUnavailable();
  try {
    credential = await load<UpstreamCredential>(name, env);
    check();
    if (credential.accessUntil > now()) return;
    try {
      const fresh = await upstreamTokens(
        {
          grant_type: "refresh_token",
          refresh_token: credential.tokens.refresh_token!,
        },
        env,
      );
      const identity = await verifyIdToken(
        fresh.id_token!,
        credential.nonce,
        env,
        true,
      );
      if (
        identity.ownerId !== owner.ownerId ||
        identity.audience !== credential.audience ||
        identity.issuedAt < credential.issuedAt ||
        (identity.authTime !== undefined &&
          identity.authTime !== credential.authTime)
      )
        throw denied();
      await ownerEnabled(env);
      const renewed: UpstreamCredential = {
        ...credential,
        ...identity,
        tokens: {
          ...fresh,
          refresh_token: fresh.refresh_token ?? credential.tokens.refresh_token,
        },
        accessUntil: Math.min(
          identity.accessUntil,
          typeof fresh.expires_in === "number"
            ? now() + fresh.expires_in
            : Infinity,
          credential.authUntil,
        ),
      };
      const value = JSON.stringify({
        expires: credential.authUntil,
        data: await seal(renewed, name, env),
      });
      const updated = await env.DB.prepare(
        "UPDATE auth_state SET value=? WHERE key=? AND EXISTS(SELECT 1 FROM auth_state WHERE key=? AND value=?) RETURNING key",
      )
        .bind(value, name, lockKey, lockValue)
        .first();
      if (!updated) throw new AuthUnavailable();
    } catch (error) {
      if (!(error instanceof AuthUnavailable))
        await env.DB.prepare(
          "DELETE FROM auth_state WHERE key=? AND EXISTS(SELECT 1 FROM auth_state WHERE key=? AND value=?)",
        )
          .bind(name, lockKey, lockValue)
          .run();
      throw error;
    }
  } finally {
    await env.DB.prepare("DELETE FROM auth_state WHERE key=? AND value=?")
      .bind(lockKey, lockValue)
      .run();
  }
}
async function bindOwner(ownerId: string, env: AppEnv) {
  // Only the verified, control-plane-provisioned email reaches this atomic first binding.
  await env.DB.prepare(
    "INSERT INTO auth_state(key,value) VALUES('owner_binding',?) ON CONFLICT(key) DO NOTHING",
  )
    .bind(ownerId)
    .run();
  const stored = await env.DB.prepare(
    "SELECT value FROM auth_state WHERE key='owner_binding'",
  ).first<{ value: string }>();
  if (stored?.value !== ownerId) throw denied();
}
async function checkedAuthRequest(request: Request, env: AppEnv) {
  const auth = await env.OAUTH_PROVIDER.parseAuthRequest(request);
  if (
    auth.responseType !== "code" ||
    auth.codeChallengeMethod !== "S256" ||
    !auth.codeChallenge ||
    !/^[a-zA-Z0-9_-]{43}$/.test(auth.codeChallenge) ||
    auth.scope.some((s) => !SCOPES.includes(s))
  )
    throw denied();
  // Basic MCP access always carries an explicit scope and appears in consent.
  if (!auth.scope.includes("elo")) auth.scope.push("elo");
  return auth;
}
async function consent(
  auth: AuthRequest,
  owner: OwnerAuth,
  env: AppEnv,
  cookieHeader?: string,
) {
  const client = await env.OAUTH_PROVIDER.lookupClient(auth.clientId);
  if (!client) throw denied();
  const handle = random();
  await store(
    `consent:${handle}`,
    { auth, ownerId: owner.ownerId },
    Math.min(now() + 600, owner.authUntil),
    env,
  );
  const headers = secureHeaders();
  headers.set("Content-Type", "text/html; charset=utf-8");
  if (cookieHeader) headers.set("Set-Cookie", cookieHeader);
  const clientName = client.clientName || "Cliente MCP";
  const redirectHost = new URL(auth.redirectUri).hostname;
  const localWarning = /^(localhost|127\.|\[::1\])/.test(redirectHost)
    ? "<p>Acesso para um aplicativo neste computador. Autorize somente se acabou de iniciar esta conexão nele.</p>"
    : "";
  return new Response(
    `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Autorizar Elo</title><h1>Autorizar ${esc(clientName)}?</h1><p>O nome foi informado pelo cliente. Continue apenas se iniciou esta conexão.</p><p>O acesso será enviado para <strong>${esc(redirectHost)}</strong>.</p>${localWarning}<p>Permissões: ${auth.scope.map(esc).join(", ")}. Acesso às ferramentas Elo; envio continua exigindo approve no chat.</p><form method="post" action="/authorize"><input type="hidden" name="handle" value="${handle}"><input type="hidden" name="csrf" value="${esc(owner.csrf!)}"><button name="decision" value="approve">Autorizar</button><button name="decision" value="deny">Cancelar</button></form></html>`,
    { headers },
  );
}
export async function defaultAuthHandler(
  request: Request,
  env: AppEnv,
  _ctx: ExecutionContext,
): Promise<Response> {
  try {
    canonical(request, env);
  } catch {
    return responseError(403);
  }
  try {
    operational(env);
    const url = new URL(request.url);
    if (
      request.method === "GET" &&
      url.pathname === "/login" &&
      url.searchParams.get("purpose") === "setup"
    )
      return beginLogin(request, env);
    if (request.method === "GET" && url.pathname === "/authorize") {
      const auth = await checkedAuthRequest(request, env);
      let owner: OwnerAuth;
      try {
        owner = await requireOwner(request, env);
      } catch (error) {
        if (error instanceof AuthUnavailable) throw error;
        return beginLogin(request, env, auth);
      }
      return consent(auth, owner, env);
    }
    if (request.method === "GET" && url.pathname === "/callback") {
      const state = url.searchParams.get("state"),
        code = url.searchParams.get("code"),
        browser = cookie(request, FLOW_COOKIE);
      if (
        !state ||
        !/^[a-zA-Z0-9_-]{43}$/.test(state) ||
        !browser ||
        !/^[a-zA-Z0-9_-]{43}$/.test(browser) ||
        !code ||
        code.length > 4096 ||
        url.searchParams.has("error")
      )
        throw denied();
      const pending = await load<Login>(`login:${state}`, env);
      if (
        pending.binding !== (await digest(browser)) ||
        pending.epoch !== env.AUTH_EPOCH
      )
        throw denied();
      const flow = await load<Login>(`login:${state}`, env, true); // Exactly one callback can exchange this code.
      const tokens = await upstreamTokens(
        {
          grant_type: "authorization_code",
          code,
          redirect_uri: `${env.PUBLIC_ORIGIN}/callback`,
          code_verifier: flow.verifier,
        },
        env,
      );
      const identity = await verifyIdToken(tokens.id_token!, flow.nonce, env);
      await ownerEnabled(env);
      await bindOwner(identity.ownerId, env);
      const authUntil =
        typeof tokens.refresh_token === "string"
          ? Math.min(
              now() + MAX_AUTH_SECONDS,
              typeof tokens.refresh_expires_in === "number"
                ? now() + tokens.refresh_expires_in
                : Infinity,
            )
          : identity.accessUntil;
      if (!Number.isInteger(authUntil) || authUntil <= now()) throw denied();
      const credentialId = random();
      const credential: UpstreamCredential = {
        ...identity,
        epoch: env.AUTH_EPOCH,
        authUntil,
        nonce: flow.nonce,
        tokens,
        accessUntil: Math.min(
          identity.accessUntil,
          typeof tokens.expires_in === "number"
            ? now() + tokens.expires_in
            : Infinity,
        ),
      };
      await store(`credential:${credentialId}`, credential, authUntil, env);
      const owner: OwnerAuth = {
        ownerId: identity.ownerId,
        authUntil,
        credentialId,
        epoch: env.AUTH_EPOCH,
        csrf: random(),
      };
      const sid = random();
      await store(`session:${await digest(sid)}`, owner, owner.authUntil, env);
      const sessionCookie = setCookie(
        SESSION_COOKIE,
        sid,
        owner.authUntil - now(),
      );
      if (flow.authRequest)
        return consent(flow.authRequest, owner, env, sessionCookie);
      const headers = secureHeaders();
      headers.set("Location", `${env.PUBLIC_ORIGIN}/setup`);
      headers.set("Set-Cookie", sessionCookie);
      return new Response(null, { status: 302, headers });
    }
    if (request.method === "POST" && url.pathname === "/authorize") {
      const owner = await requireOwner(request, env);
      if (Number(request.headers.get("Content-Length") ?? 0) > 8192)
        throw denied();
      const form = await request.formData();
      await requireSetupCsrf(request, owner, env, form.get("csrf"));
      const handle = String(form.get("handle"));
      if (!/^[a-zA-Z0-9_-]{43}$/.test(handle)) throw denied();
      const pending = await load<{ auth: AuthRequest; ownerId: string }>(
        `consent:${handle}`,
        env,
        true,
      );
      if (pending.ownerId !== owner.ownerId) throw denied();
      let redirectTo: string;
      if (form.get("decision") !== "approve") {
        const redirect = new URL(pending.auth.redirectUri);
        redirect.searchParams.set("error", "access_denied");
        redirect.searchParams.set("state", pending.auth.state);
        redirect.searchParams.set("iss", env.PUBLIC_ORIGIN);
        redirectTo = redirect.toString();
      } else {
        ({ redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
          request: pending.auth,
          userId: owner.ownerId,
          metadata: {},
          scope: pending.auth.scope,
          props: {
            ownerId: owner.ownerId,
            epoch: owner.epoch,
            authUntil: owner.authUntil,
            credentialId: owner.credentialId,
          },
        }));
      }
      const headers = secureHeaders();
      headers.set("Location", redirectTo);
      return new Response(null, { status: 302, headers });
    }
    if (request.method === "POST" && url.pathname === "/logout") {
      const owner = await requireOwner(request, env);
      await requireSetupCsrf(request, owner, env);
      const sid = cookie(request, SESSION_COOKIE)!;
      await env.DB.prepare("DELETE FROM auth_state WHERE key=?")
        .bind(`session:${await digest(sid)}`)
        .run();
      const headers = secureHeaders();
      headers.set("Set-Cookie", setCookie(SESSION_COOKIE, "", 0));
      return new Response("Sessão encerrada neste navegador.", { headers });
    }
    return new Response("Não encontrado.", {
      status: 404,
      headers: secureHeaders(),
    });
  } catch (error) {
    if (error instanceof AuthUnavailable) {
      await env.DB.prepare("UPDATE settings SET last_error=? WHERE id=1")
        .bind(error.safeCode)
        .run()
        .catch(() => {});
    }
    return responseError(
      error instanceof AuthUnavailable
        ? 503
        : env.MAINTENANCE === "false"
          ? 401
          : 503,
    );
  }
}

type ApiHandler = {
  fetch(
    request: Request,
    env: AppEnv,
    ctx: OAuthResourceContext<OwnerAuth>,
  ): Promise<Response> | Response;
};
export function makeOAuth(apiHandler: ApiHandler) {
  // Instance per origin: immutable metadata; no redirect or resource derived from Host.
  let configured:
    { origin: string; provider: OAuthProvider<AppEnv> } | undefined;
  return {
    async fetch(request: Request, env: AppEnv, ctx: ExecutionContext) {
      try {
        canonical(request, env);
        operational(env);
      } catch {
        return responseError(env.MAINTENANCE === "false" ? 403 : 503);
      }
      if (!configured || configured.origin !== env.PUBLIC_ORIGIN) {
        const provider = new OAuthProvider<AppEnv>({
          apiRoute: "/mcp",
          apiHandler: {
            async fetch(req, e, c) {
              try {
                const resourceCtx = c as OAuthResourceContext<OwnerAuth>;
                await requireMcpOwner(resourceCtx.props, e);
                if (!resourceCtx.auth.scope.includes("elo"))
                  return new Response("Permissão insuficiente.", {
                    status: 403,
                    headers: secureHeaders(),
                  });
                return await apiHandler.fetch(req, e, resourceCtx);
              } catch (error) {
                return responseError(
                  error instanceof AuthUnavailable ? 503 : 401,
                );
              }
            },
          },
          defaultHandler: { fetch: defaultAuthHandler },
          authorizeEndpoint: "/authorize",
          tokenEndpoint: "/oauth/token",
          clientRegistrationEndpoint: "/oauth/register",
          scopesSupported: SCOPES,
          requiredScopes: ["elo"],
          accessTokenTTL: 300,
          refreshTokenTTL: MAX_AUTH_SECONDS,
          clientRegistrationTTL: 7 * 86400,
          resourceMetadata: {
            resource: `${env.PUBLIC_ORIGIN}/mcp`,
            authorization_servers: [env.PUBLIC_ORIGIN],
          },
          clientIdMetadataDocumentEnabled: false,
          async tokenExchangeCallback({ props, env: e, grantType }) {
            try {
              await requireMcpOwner(props, e);
            } catch (error) {
              if (error instanceof AuthUnavailable)
                throw new OAuthError("temporarily_unavailable", {
                  description: "Autorização temporariamente indisponível.",
                  statusCode: 503,
                });
              throw new OAuthError("invalid_grant", {
                description: "Conecte novamente pelo Cloudflare Access.",
              });
            }
            const remaining = Math.floor(
              (props as OwnerAuth).authUntil - now(),
            );
            if (remaining < 60)
              throw new OAuthError("invalid_grant", {
                description: "Conecte novamente pelo Cloudflare Access.",
              });
            if (
              grantType !== "authorization_code" &&
              grantType !== "refresh_token"
            )
              throw new OAuthError("unsupported_grant_type", {
                description: "Fluxo não suportado.",
              });
            return {
              accessTokenTTL: Math.min(300, remaining),
              refreshTokenTTL: remaining,
            };
          },
          onError: ({ code, status, headers }) =>
            new Response(
              JSON.stringify({
                error: code,
                error_description: "Não foi possível autorizar a conexão.",
              }),
              {
                status,
                headers: {
                  ...headers,
                  "Content-Type": "application/json",
                  "Cache-Control": "no-store",
                },
              },
            ),
        });
        configured = { origin: env.PUBLIC_ORIGIN, provider };
      }
      return configured.provider.fetch(request, env, ctx);
    },
  };
}
