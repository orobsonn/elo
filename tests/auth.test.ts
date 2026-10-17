import { env } from "cloudflare:test";
import {
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import {
  defaultAuthHandler,
  requireOwner,
  requireMcpOwner,
  requireSetupCsrf,
  accessEndpoints,
} from "../src/auth";
import type { AppEnv } from "../src/env";

const appEnv = env as AppEnv;
let pair: Awaited<ReturnType<typeof generateKeyPair>>;
let jwk: Awaited<ReturnType<typeof exportJWK>>;
const ctx = {
  waitUntil() {},
  passThroughOnException() {},
} as unknown as ExecutionContext;
const base = "https://elo.test";
const now = () => Math.floor(Date.now() / 1000);
const callback = `${base}/callback`;

beforeAll(async () => {
  pair = await generateKeyPair("RS256", { extractable: true });
  jwk = {
    ...(await exportJWK(pair.publicKey)),
    kid: "synthetic-key",
    alg: "RS256",
    use: "sig",
  };
});
beforeEach(async () => {
  await appEnv.DB.prepare("DELETE FROM auth_state").run();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("Unexpected network");
    }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function start() {
  const response = await defaultAuthHandler(
    new Request(`${base}/login?purpose=setup`),
    appEnv,
    ctx,
  );
  expect(response.status).toBe(302);
  return {
    response,
    url: new URL(response.headers.get("Location")!),
    cookie: response.headers.get("Set-Cookie")!.split(";")[0],
  };
}
async function token(nonce: string, claims: Record<string, unknown> = {}) {
  return new SignJWT({
    email: "owner@example.test",
    email_verified: true,
    nonce,
    ...claims,
  })
    .setProtectedHeader({ alg: "RS256", kid: "synthetic-key" })
    .setIssuer(accessEndpoints(appEnv).issuer)
    .setAudience(appEnv.ACCESS_CLIENT_ID)
    .setSubject(String(claims.sub ?? "owner-subject"))
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(pair.privateKey);
}
async function finish(
  flow: Awaited<ReturnType<typeof start>>,
  claims: Record<string, unknown> = {},
  override?: string,
) {
  const idToken =
    override ?? (await token(flow.url.searchParams.get("nonce")!, claims));
  const endpoints = accessEndpoints(appEnv);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      new Request(url, init); // Real workerd constructor catches unsupported redirect modes.
      if (url === endpoints.token && init?.method === "POST") {
        const body = new URLSearchParams(String(init.body));
        expect(body.get("code_verifier")).toHaveLength(43);
        expect(body.get("redirect_uri")).toBe(callback);
        return Response.json({
          id_token: idToken,
          access_token: "synthetic-upstream-token",
          token_type: "Bearer",
          expires_in: 900,
          refresh_token: "synthetic-refresh-1",
          refresh_expires_in: 604800,
        });
      }
      if (url === endpoints.jwks) return Response.json({ keys: [jwk] });
      throw new Error("Unexpected network");
    }),
  );
  return defaultAuthHandler(
    new Request(
      `${callback}?code=synthetic-code&state=${flow.url.searchParams.get("state")}`,
      { headers: { Cookie: flow.cookie } },
    ),
    appEnv,
    ctx,
  );
}

describe("Access owner boundary", () => {
  it("pins SaaS endpoints and rejects alternate origins and maintenance", async () => {
    expect(accessEndpoints(appEnv).issuer).toBe(
      "https://example.cloudflareaccess.com/cdn-cgi/access/sso/oidc/synthetic",
    );
    expect(
      (
        await defaultAuthHandler(
          new Request("https://preview.example/login?purpose=setup"),
          appEnv,
          ctx,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await defaultAuthHandler(
          new Request(`${base}/login?purpose=setup`),
          { ...appEnv, MAINTENANCE: "true" } as unknown as AppEnv,
          ctx,
        )
      ).status,
    ).toBe(503);
  });
  it.each(["transport", "server"])(
    "records only safe upstream diagnosis for %s failure",
    async (failure) => {
      const f = await start();
      const privateMarker = "never-log-synthetic-credential";
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          if (failure === "transport") throw new Error(privateMarker);
          return new Response(privateMarker, { status: 503 });
        }),
      );
      const r = await defaultAuthHandler(
        new Request(
          `${callback}?code=synthetic-code&state=${f.url.searchParams.get("state")}`,
          { headers: { Cookie: f.cookie } },
        ),
        appEnv,
        ctx,
      );
      expect(r.status).toBe(503);
      expect(await r.text()).not.toContain(privateMarker);
      const diagnostic = await appEnv.DB.prepare(
        "SELECT last_error FROM settings WHERE id=1",
      ).first();
      expect(diagnostic).toMatchObject({
        last_error:
          failure === "transport"
            ? "auth_upstream_transport"
            : "auth_upstream_http_503",
      });
      expect(JSON.stringify(diagnostic)).not.toContain(privateMarker);
      expect(
        await appEnv.DB.prepare(
          "SELECT value FROM auth_state WHERE key='owner_binding'",
        ).first(),
      ).toBeNull();
    },
  );
  it("rejects upstream redirects without forwarding credentials or binding an owner", async () => {
    const f = await start();
    const network = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const wire = new Request(input, init);
        expect(wire.redirect).toBe("manual");
        return Response.redirect("https://untrusted.example.test/token", 302);
      },
    );
    vi.stubGlobal("fetch", network);
    const r = await defaultAuthHandler(
      new Request(
        `${callback}?code=synthetic-code&state=${f.url.searchParams.get("state")}`,
        { headers: { Cookie: f.cookie } },
      ),
      appEnv,
      ctx,
    );
    expect(r.status).toBe(401);
    expect(network).toHaveBeenCalledTimes(1);
    expect(
      await appEnv.DB.prepare(
        "SELECT value FROM auth_state WHERE key='owner_binding'",
      ).first(),
    ).toBeNull();
  });
  it("diagnoses a missing verified-email claim without exposing token content", async () => {
    const r = await finish(await start(), { email_verified: undefined });
    expect(r.status).toBe(401);
    expect(
      await appEnv.DB.prepare(
        "SELECT last_error FROM settings WHERE id=1",
      ).first(),
    ).toMatchObject({ last_error: "auth_identity_claim_email_verified" });
    expect(
      await appEnv.DB.prepare(
        "SELECT value FROM auth_state WHERE key='owner_binding'",
      ).first(),
    ).toBeNull();
  });
  it("diagnoses an upstream rejection using only its status", async () => {
    const f = await start();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("private-upstream-body", { status: 400 })),
    );
    const r = await defaultAuthHandler(
      new Request(
        `${callback}?code=synthetic-code&state=${f.url.searchParams.get("state")}`,
        { headers: { Cookie: f.cookie } },
      ),
      appEnv,
      ctx,
    );
    expect(r.status).toBe(401);
    expect(await r.text()).not.toContain("private-upstream-body");
    expect(
      await appEnv.DB.prepare(
        "SELECT last_error FROM settings WHERE id=1",
      ).first(),
    ).toMatchObject({ last_error: "auth_upstream_http_400" });
  });
  it("starts upstream login with browser state, nonce and S256 PKCE", async () => {
    const f = await start();
    expect(f.url.pathname).toContain("/authorization");
    expect(f.url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(f.url.searchParams.get("code_challenge")).toHaveLength(43);
    expect(f.url.searchParams.get("nonce")).toHaveLength(43);
    expect(f.response.headers.get("Set-Cookie")).toContain(
      "HttpOnly; Secure; SameSite=Lax",
    );
  });
  it("rejects a callback without matching browser and state", async () => {
    const f = await start();
    const r = await defaultAuthHandler(
      new Request(
        `${callback}?state=${f.url.searchParams.get("state")}&code=x`,
      ),
      appEnv,
      ctx,
    );
    expect(r.status).toBe(401);
    expect(
      await appEnv.DB.prepare(
        "SELECT value FROM auth_state WHERE key='owner_binding'",
      ).first(),
    ).toBeNull();
  });
  it.each([
    { email: "intruder@example.test" },
    { email_verified: false },
    { nonce: "wrong-nonce" },
  ])("refuses unauthorized identity %#", async (claims) => {
    expect((await finish(await start(), claims)).status).toBe(401);
    expect(
      await appEnv.DB.prepare(
        "SELECT value FROM auth_state WHERE key='owner_binding'",
      ).first(),
    ).toBeNull();
  });
  it.each(["issuer", "audience", "expired", "signature"])(
    "rejects incorrect %s JWT",
    async (failure) => {
      const f = await start();
      let signer = new SignJWT({
        email: "owner@example.test",
        email_verified: true,
        nonce: f.url.searchParams.get("nonce"),
      })
        .setProtectedHeader({ alg: "RS256", kid: "synthetic-key" })
        .setIssuer(
          failure === "issuer"
            ? "https://untrusted.test"
            : accessEndpoints(appEnv).issuer,
        )
        .setAudience(
          failure === "audience" ? "other-client" : appEnv.ACCESS_CLIENT_ID,
        )
        .setSubject("owner-subject")
        .setIssuedAt()
        .setExpirationTime(failure === "expired" ? now() - 60 : now() + 3600);
      const key =
        failure === "signature"
          ? (await generateKeyPair("RS256")).privateKey
          : pair.privateKey;
      expect((await finish(f, {}, await signer.sign(key))).status).toBe(401);
    },
  );
  it("binds the pre-authorized owner, rejects replay and later subject replacement", async () => {
    const f = await start();
    const r = await finish(f);
    expect(r.status).toBe(302);
    expect(r.headers.get("Location")).toBe(`${base}/setup`);
    const cookie = r.headers.get("Set-Cookie")!.split(";")[0];
    const owner = await requireOwner(
      new Request(`${base}/setup`, { headers: { Cookie: cookie } }),
      appEnv,
    );
    expect(owner.ownerId).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(JSON.stringify(owner)).not.toContain("synthetic-upstream-token");
    await expect(
      requireSetupCsrf(
        new Request(`${base}/setup`, {
          method: "POST",
          headers: { Origin: base },
        }),
        owner,
        appEnv,
        owner.csrf,
      ),
    ).resolves.toBeUndefined();
    await expect(
      requireSetupCsrf(
        new Request(`${base}/setup`, {
          method: "POST",
          headers: { Origin: "https://attacker.test" },
        }),
        owner,
        appEnv,
        owner.csrf,
      ),
    ).rejects.toThrow();
    await expect(
      requireSetupCsrf(
        new Request(`${base}/setup`, {
          method: "POST",
          headers: { Origin: base },
        }),
        owner,
        appEnv,
        "bad-csrf",
      ),
    ).rejects.toThrow();
    const replay = await defaultAuthHandler(
      new Request(
        `${callback}?code=synthetic-code&state=${f.url.searchParams.get("state")}`,
        { headers: { Cookie: f.cookie } },
      ),
      appEnv,
      ctx,
    );
    expect(replay.status).toBe(401);
    const next = await start();
    const replaced = await new SignJWT({
      email: "owner@example.test",
      email_verified: true,
      nonce: next.url.searchParams.get("nonce"),
    })
      .setProtectedHeader({ alg: "RS256", kid: "synthetic-key" })
      .setIssuer(accessEndpoints(appEnv).issuer)
      .setAudience(appEnv.ACCESS_CLIENT_ID)
      .setSubject("different-subject")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(pair.privateKey);
    expect((await finish(next, {}, replaced)).status).toBe(401);
    await expect(
      requireOwner(
        new Request(`${base}/setup`, { headers: { Cookie: cookie } }),
        { ...appEnv, AUTH_EPOCH: "rotated" },
      ),
    ).rejects.toThrow();
  });
  it("enforces owner binding, absolute expiry, epoch and disable/maintenance on every use", async () => {
    const r = await finish(await start());
    const owner = await requireOwner(
      new Request(`${base}/setup`, {
        headers: { Cookie: r.headers.get("Set-Cookie")!.split(";")[0] },
      }),
      appEnv,
    );
    await expect(requireMcpOwner(owner, appEnv)).resolves.toEqual(owner);
    await expect(
      requireMcpOwner({ ...owner, ownerId: "other" }, appEnv),
    ).rejects.toThrow();
    await expect(
      requireMcpOwner({ ...owner, epoch: "old" }, appEnv),
    ).rejects.toThrow();
    await expect(
      requireMcpOwner({ ...owner, authUntil: now() - 1 }, appEnv),
    ).rejects.toThrow();
    await expect(
      requireMcpOwner(owner, {
        ...appEnv,
        MAINTENANCE: "true",
      } as unknown as AppEnv),
    ).rejects.toThrow();
    await appEnv.DB.prepare(
      "INSERT INTO auth_state(key,value) VALUES('owner_disabled','true')",
    ).run();
    await expect(requireMcpOwner(owner, appEnv)).rejects.toThrow();
  });
});

describe("MCP OAuth flow", () => {
  it("requires PKCE and fresh browser consent; issues only owner-bound tokens and expires refresh", async () => {
    const { makeOAuth } = await import("../src/auth");
    const worker = makeOAuth({
      async fetch(_req, _e, c) {
        return Response.json({ ok: true, ownerId: c.props.ownerId });
      },
    });
    const verifier = "A".repeat(43);
    const challenge = btoa(
      String.fromCharCode(
        ...new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(verifier),
          ),
        ),
      ),
    )
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const register = await worker.fetch(
      new Request(`${base}/oauth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: "Synthetic <client>",
          redirect_uris: ["https://client.example.test/callback"],
          token_endpoint_auth_method: "none",
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"],
        }),
      }),
      appEnv,
      ctx,
    );
    expect(register.status).toBe(201);
    const client = (await register.json()) as { client_id: string };
    const authorization = new URL(`${base}/authorize`);
    for (const [k, v] of Object.entries({
      client_id: client.client_id,
      redirect_uri: "https://client.example.test/callback",
      response_type: "code",
      scope: "elo offline_access",
      state: "mcp-state",
      resource: `${base}/mcp`,
      code_challenge: challenge,
      code_challenge_method: "S256",
    }))
      authorization.searchParams.set(k, v);
    const noPkce = new URL(authorization);
    noPkce.searchParams.delete("code_challenge");
    expect((await worker.fetch(new Request(noPkce), appEnv, ctx)).status).toBe(
      401,
    );
    const begin = await worker.fetch(new Request(authorization), appEnv, ctx);
    expect(begin.status).toBe(302);
    const flow = {
      response: begin,
      url: new URL(begin.headers.get("Location")!),
      cookie: begin.headers.get("Set-Cookie")!.split(";")[0],
    };
    const consent = await finish(flow);
    expect(consent.status).toBe(200);
    const html = await consent.text();
    expect(html).toContain("Synthetic &#60;client&#62;");
    expect(html).not.toContain("synthetic-upstream-token");
    const cookie = consent.headers.get("Set-Cookie")!.split(";")[0];
    const handle = html.match(/name="handle" value="([^"]+)"/)![1];
    const csrf = html.match(/name="csrf" value="([^"]+)"/)![1];
    const approve = () =>
      new Request(`${base}/authorize`, {
        method: "POST",
        headers: {
          Cookie: cookie,
          Origin: base,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ handle, csrf, decision: "approve" }),
      });
    const forged = approve();
    forged.headers.set("Origin", "https://attacker.test");
    expect((await worker.fetch(forged, appEnv, ctx)).status).toBe(401);
    const approved = await worker.fetch(approve(), appEnv, ctx);
    expect(approved.status).toBe(302);
    const redirect = new URL(approved.headers.get("Location")!);
    expect(redirect.searchParams.get("state")).toBe("mcp-state");
    expect((await worker.fetch(approve(), appEnv, ctx)).status).toBe(401);
    const exchange = async (codeVerifier: string) =>
      worker.fetch(
        new Request(`${base}/oauth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: redirect.searchParams.get("code")!,
            client_id: client.client_id,
            redirect_uri: "https://client.example.test/callback",
            code_verifier: codeVerifier,
            resource: `${base}/mcp`,
          }),
        }),
        appEnv,
        ctx,
      );
    // A failed verifier may consume a code: use the actual one in this successful flow.
    const exchanged = await exchange(verifier);
    expect(exchanged.status).toBe(200);
    let tokens = (await exchanged.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    expect(tokens.expires_in).toBeLessThanOrEqual(300);
    expect(tokens.refresh_token).toBeTruthy();
    const resource = await worker.fetch(
      new Request(`${base}/mcp`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }),
      appEnv,
      ctx,
    );
    expect(resource.status).toBe(200);
    expect(await resource.text()).not.toContain("owner@example.test");
    const refresh = () =>
      new Request(`${base}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokens.refresh_token,
          client_id: client.client_id,
          resource: `${base}/mcp`,
        }),
      });
    const refreshed = await worker.fetch(refresh(), appEnv, ctx);
    expect(refreshed.status).toBe(200);
    tokens = (await refreshed.json()) as typeof tokens;
    expect(
      (await worker.fetch(refresh(), { ...appEnv, AUTH_EPOCH: "rotated" }, ctx))
        .status,
    ).toBe(400);
    expect(
      (
        await worker.fetch(
          new Request(`${base}/mcp`, {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          }),
          { ...appEnv, AUTH_EPOCH: "rotated" },
          ctx,
        )
      ).status,
    ).toBe(401);
    const secondConsent = await worker.fetch(
      new Request(authorization, { headers: { Cookie: cookie } }),
      appEnv,
      ctx,
    );
    expect(secondConsent.status).toBe(200);
    const secondHtml = await secondConsent.text();
    const secondHandle = secondHtml.match(/name="handle" value="([^"]+)"/)![1];
    const secondApproved = await worker.fetch(
      new Request(`${base}/authorize`, {
        method: "POST",
        headers: {
          Cookie: cookie,
          Origin: base,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          handle: secondHandle,
          csrf,
          decision: "approve",
        }),
      }),
      appEnv,
      ctx,
    );
    const secondCode = new URL(
      secondApproved.headers.get("Location")!,
    ).searchParams.get("code")!;
    const badVerifier = await worker.fetch(
      new Request(`${base}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: secondCode,
          client_id: client.client_id,
          redirect_uri: "https://client.example.test/callback",
          code_verifier: "B".repeat(43),
          resource: `${base}/mcp`,
        }),
      }),
      appEnv,
      ctx,
    );
    expect(badVerifier.status).toBe(400);
  });
});

describe("bounded upstream renewal", () => {
  async function session() {
    const response = await finish(await start());
    expect(response.status).toBe(302);
    return requireOwner(
      new Request(`${base}/setup`, {
        headers: { Cookie: response.headers.get("Set-Cookie")!.split(";")[0] },
      }),
      appEnv,
    );
  }
  it("renews only after upstream policy response, rotates secret, and never moves absolute authUntil", async () => {
    const owner = await session();
    const absolute = owner.authUntil;
    expect(absolute).toBeGreaterThan(now() + 86400);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 901000);
    let refreshCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === accessEndpoints(appEnv).jwks)
          return Response.json({ keys: [jwk] });
        expect(String(input)).toBe(accessEndpoints(appEnv).token);
        const body = new URLSearchParams(String(init?.body));
        expect(body.get("grant_type")).toBe("refresh_token");
        expect(body.get("refresh_token")).toBe(
          refreshCount++ === 0 ? "synthetic-refresh-1" : "synthetic-refresh-2",
        );
        return Response.json({
          id_token: await token(undefined as unknown as string),
          access_token: "new-upstream-access",
          refresh_token: "synthetic-refresh-2",
          expires_in: 900,
        });
      }),
    );
    const renewed = await requireMcpOwner(owner, appEnv);
    expect(renewed.authUntil).toBe(absolute);
    expect(refreshCount).toBe(1);
    vi.setSystemTime(Date.now() + 901000);
    await requireMcpOwner(owner, appEnv);
    expect(refreshCount).toBe(2);
    vi.setSystemTime((absolute + 1) * 1000);
    await expect(requireMcpOwner(owner, appEnv)).rejects.toThrow();
    expect(refreshCount).toBe(2);
  });
  it.each([
    { sub: "changed-owner" },
    { nonce: "changed-nonce" },
    { email: "intruder@example.test" },
    { email_verified: false },
  ])("fails closed on changed refresh identity %#", async (claims) => {
    const owner = await session();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 901000);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        String(input) === accessEndpoints(appEnv).jwks
          ? Response.json({ keys: [jwk] })
          : Response.json({
              id_token: await token(undefined as unknown as string, claims),
              access_token: "fresh",
              expires_in: 900,
            }),
      ),
    );
    await expect(requireMcpOwner(owner, appEnv)).rejects.toThrow();
  });
  it("revokes the credential after upstream invalid_grant", async () => {
    const owner = await session();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 901000);
    const fetch = vi.fn(async () =>
      Response.json({ error: "invalid_grant" }, { status: 400 }),
    );
    vi.stubGlobal("fetch", fetch);
    await expect(requireMcpOwner(owner, appEnv)).rejects.toThrow();
    await expect(requireMcpOwner(owner, appEnv)).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("serializes rotating upstream refresh tokens across simultaneous calls", async () => {
    const owner = await session();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 901000);
    let began!: () => void;
    const started = new Promise<void>((resolve) => {
      began = resolve;
    });
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === accessEndpoints(appEnv).jwks)
        return Response.json({ keys: [jwk] });
      began();
      await pending;
      return Response.json({
        id_token: await token(undefined as unknown as string),
        access_token: "fresh",
        refresh_token: "rotated",
        expires_in: 900,
      });
    });
    vi.stubGlobal("fetch", fetch);
    const first = requireMcpOwner(owner, appEnv);
    await started;
    await expect(requireMcpOwner(owner, appEnv)).rejects.toThrow();
    release();
    await expect(first).resolves.toMatchObject({ authUntil: owner.authUntil });
    expect(
      fetch.mock.calls.filter(
        (call) => String(call[0]) === accessEndpoints(appEnv).token,
      ),
    ).toHaveLength(1);
  });
});

describe("login abuse control", () => {
  it("limits one source without consuming the owner login capacity for other sources", async () => {
    for (let i = 0; i < 11; i++) {
      const response = await defaultAuthHandler(
        new Request(`${base}/login?purpose=setup`, {
          headers: { "CF-Connecting-IP": "192.0.2.1" },
        }),
        appEnv,
        ctx,
      );
      expect(response.status).toBe(i < 10 ? 302 : 429);
    }
    expect(
      (
        await defaultAuthHandler(
          new Request(`${base}/login?purpose=setup`, {
            headers: { "CF-Connecting-IP": "192.0.2.2" },
          }),
          appEnv,
          ctx,
        )
      ).status,
    ).toBe(302);
    const rows = await appEnv.DB.prepare(
      "SELECT key,value FROM auth_state WHERE key LIKE 'rate:%'",
    ).all();
    expect(JSON.stringify(rows)).not.toContain("192.0.2.");
  });
  it("resumes the same browser flow without reserving more slots or charging rate attempts", async () => {
    const first = await start();
    for (let i = 0; i < 15; i++) {
      const response = await defaultAuthHandler(
        new Request(`${base}/login?purpose=setup`, {
          headers: { Cookie: first.cookie },
        }),
        appEnv,
        ctx,
      );
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe(
        first.response.headers.get("Location"),
      );
    }
    const row = await appEnv.DB.prepare(
      "SELECT count(*) AS n FROM auth_state WHERE key LIKE 'login:%'",
    ).first<{ n: number }>();
    expect(row?.n).toBe(1);
  });
});
