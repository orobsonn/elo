import { env as testEnv } from "cloudflare:test";
import { afterEach, expect, it, vi } from "vitest";
import { syncContacts } from "../src/directory";
import { ingest } from "../src/capture";
import { seal, sql } from "../src/core";
import type { AppEnv } from "../src/env";

const env = testEnv as AppEnv;
const device = "5511000000000";
const credentials = {
  instance_id: "synthetic_instance",
  instance_token: "synthetic_token",
  client_token: "synthetic_client",
  webhook_key: "synthetic_webhook_key_32_characters",
  device_identity: device,
};
afterEach(() => vi.unstubAllGlobals());

async function provider(count: number) {
  await sql(
    env.DB,
    "UPDATE settings SET connection_cipher=?,connection_generation=1 WHERE id=1",
    await seal(credentials, env.ENCRYPTION_KEY),
  ).run();
  const requested: number[] = [];
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init),
        url = new URL(request.url);
      if (url.pathname.endsWith("/device"))
        return Response.json({ phone: device });
      if (!url.pathname.endsWith("/contacts"))
        throw new Error("Unexpected synthetic provider operation");
      const page = Number(url.searchParams.get("page"));
      requested.push(page);
      return Response.json(
        Array.from(
          { length: Math.max(0, Math.min(100, count - (page - 1) * 100)) },
          (_, i) => ({
            phone: String(5511900000001 + (page - 1) * 100 + i),
            name: `Pessoa Sintética ${(page - 1) * 100 + i + 1}`,
            short: "Pessoa",
          }),
        ),
      );
    },
  );
  return requested;
}

// Real D1 results and commits; only the transport failure after a commit is synthetic.
function measuredDatabase(loseBatch?: number) {
  let reads = 0,
    batches = 0;
  const originals = new WeakMap<D1PreparedStatement, D1PreparedStatement>();
  const wrap = (statement: D1PreparedStatement): D1PreparedStatement => {
    const proxy = new Proxy(statement, {
      get(target, key) {
        if (key === "bind")
          return (...args: unknown[]) => wrap(target.bind(...args));
        if (key === "first")
          return async (column?: string) => {
            const result = await target.all<Record<string, unknown>>();
            reads += result.meta.rows_read;
            const row = result.results[0];
            return column ? (row?.[column] ?? null) : (row ?? null);
          };
        if (key === "all" || key === "run")
          return async () => {
            const result = await target[key]();
            reads += result.meta.rows_read;
            return result;
          };
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    originals.set(proxy, statement);
    return proxy;
  };
  const db = new Proxy(env.DB, {
    get(target, key) {
      if (key === "prepare")
        return (query: string) => wrap(target.prepare(query));
      if (key === "batch")
        return async (statements: D1PreparedStatement[]) => {
          const result = await target.batch(
            statements.map((s) => originals.get(s) ?? s),
          );
          reads += result.reduce((n, r) => n + r.meta.rows_read, 0);
          if (++batches === loseBatch)
            throw new Error(
              "Synthetic lost D1 response after successful commit",
            );
          return result;
        };
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return { db, reads: () => reads };
}

async function legacyProvider(count: number, replaceRun = false) {
  await provider(count);
  for (let i = 1; i <= count; i++)
    await ingest(
      env.DB,
      {
        type: "ReceivedCallback",
        phone: `${9999999900000 + i}@lid`,
        messageId: `synthetic_legacy_${i}`,
        momment: Date.now(),
        text: { message: "SIM histórico" },
      },
      1,
      env.ENCRYPTION_KEY,
    );
  const rows = Array.from({ length: count }, (_, i) => ({
    phone: String(5511900000001 + i),
    name: `Pessoa Sintética ${i + 1}`,
    short: "Pessoa",
  }));
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init),
        url = new URL(request.url);
      if (url.pathname.endsWith("/device"))
        return Response.json({ phone: device });
      if (url.pathname.endsWith("/contacts")) return Response.json(rows);
      if (!url.pathname.endsWith("/phone-exists-batch"))
        throw new Error("Unexpected synthetic operation");
      if (replaceRun)
        await sql(
          env.DB,
          "UPDATE directory_state SET run_id='synthetic_superseded' WHERE id=1",
        ).run();
      return Response.json(
        rows.map((r, i) => ({
          exists: true,
          inputPhone: r.phone,
          outputPhone: r.phone,
          lid: `${9999999900001 + i}@lid`,
        })),
      );
    },
  );
}

it("syncs 100 entries against a 1700-contact agenda with six identity pairs without scanning millions of rows", async () => {
  await provider(1700);
  await sql(
    env.DB,
    `WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<1700)
    INSERT INTO contacts(id,alias,address,created_at,alias_origin)
    SELECT 'ct_cost_'||x,'Pessoa',CAST(5511900000000+x AS TEXT),1,'provider' FROM n`,
  ).run();
  await sql(
    env.DB,
    `WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<6)
    INSERT INTO contact_identity_pairs(connection_generation,phone,lid,proof_key,observed_at)
    SELECT 1,CAST(5511900000000+x AS TEXT),CAST(9999999900000+x AS TEXT)||'@lid','proof_cost_'||x,1 FROM n`,
  ).run();
  const meter = measuredDatabase();
  const result = await syncContacts({ ...env, DB: meter.db }, {});
  expect(result.complete).toBe(false);
  expect(result.next_cursor).toBeTruthy();
  expect(
    (await sql(env.DB, "SELECT count(*) n FROM contact_directory").first<{
      n: number;
    }>())!.n,
  ).toBe(100);
  console.log(
    JSON.stringify({
      scenario: "directory_1700_page_100",
      rows_read: meter.reads(),
    }),
  );
  expect(meter.reads()).toBeLessThan(25000);
}, 30000);

it("returns page three cursor after page two commits but its D1 response is lost", async () => {
  const requested = await provider(200);
  const meter = measuredDatabase(2),
    app = { ...env, DB: meter.db };
  const first = await syncContacts(app, {});
  let second: Awaited<ReturnType<typeof syncContacts>> | undefined,
    failure: unknown;
  try {
    second = await syncContacts(app, { cursor: first.next_cursor });
  } catch (error) {
    failure = error;
  }
  expect(
    (await sql(
      env.DB,
      "SELECT next_page FROM directory_state WHERE id=1",
    ).first<{ next_page: number }>())!.next_page,
  ).toBe(3);
  expect(
    failure,
    "A successful commit must retain its next cursor despite a lost batch response",
  ).toBeUndefined();
  expect(second!.next_cursor).toBeTruthy();
  const replay = await syncContacts(app, { cursor: first.next_cursor });
  expect(replay).toEqual(second);
  expect(requested).toEqual([1, 2]);
  const last = await syncContacts(app, { cursor: second!.next_cursor });
  expect(last.complete).toBe(true);
  expect(requested).toEqual([1, 2, 3]);
});

it("bounds a complete 1700-contact refresh including 44 legacy identities and unrelated history, tasks and sends", async () => {
  await provider(1700);
  await sql(
    env.DB,
    `WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<1700)
    INSERT INTO contacts(id,alias,address,created_at,alias_origin)
    SELECT 'ct_cost_'||x,'Pessoa',CAST(5511900000000+x AS TEXT),1,'provider' FROM n`,
  ).run();
  await sql(
    env.DB,
    `WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<44)
    INSERT INTO contacts(id,alias,address,created_at,alias_origin)
    SELECT 'ct_lid_'||x,'Contato provisório',CAST(9999999900000+x AS TEXT)||'@lid',1,'system' FROM n`,
  ).run();
  const time = Date.now();
  await sql(
    env.DB,
    `WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<30000)
    INSERT INTO sources(id,contact_id,dedup_key,kind,occurred_at,received_at,expires_at,content)
    SELECT 'cost_source_'||x,'ct_cost_1700','cost_source_'||x,'meeting',?,?,?,'SIM histórico não relacionado' FROM n`,
    time,
    time,
    time + 86400000,
  ).run();
  await sql(
    env.DB,
    `WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<5000)
    INSERT INTO tasks(id,contact_id,subject,reason,source_id,dedup_key,updated_at)
    SELECT 'cost_task_'||x,'ct_cost_1700','SIM pendência','SIM motivo','cost_source_'||x,'cost_task_'||x,1 FROM n`,
  ).run();
  await sql(
    env.DB,
    `WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<5000)
    INSERT INTO actions(id,contact_id,alias,content,content_hash,address,address_version,connection_generation,epoch,status,prepared_at,expires_at)
    SELECT 'cost_action_'||x,'ct_cost_1700','Pessoa','SIM texto','synthetic','5511900001700',1,1,'synthetic','accepted',1,2 FROM n`,
  ).run();
  await sql(
    env.DB,
    `WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<44)
    INSERT INTO sources(id,contact_id,dedup_key,kind,occurred_at,received_at,expires_at,content)
    SELECT 'legacy_'||x,'ct_lid_'||x,'legacy_'||x,'whatsapp',?,?,?,'SIM histórico legado' FROM n`,
    time,
    time,
    time + 86400000,
  ).run();
  await sql(
    env.DB,
    `WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<44)
    INSERT INTO messages(id,source_id,provider_key,contact_id,direction,kind)
    SELECT 'legacy_message_'||x,'legacy_'||x,'legacy_message_'||x,'ct_lid_'||x,'received','text' FROM n`,
  ).run();
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init),
        url = new URL(request.url);
      if (url.pathname.endsWith("/device"))
        return Response.json({ phone: device });
      if (url.pathname.endsWith("/phone-exists-batch")) {
        const { phones } = (await request.json()) as { phones: string[] };
        return Response.json(
          phones.map((phone) => {
            const i = Number(phone) - 5511900000000;
            return i >= 1 && i <= 44
              ? {
                  exists: true,
                  inputPhone: phone,
                  outputPhone: phone,
                  lid: `${9999999900000 + i}@lid`,
                }
              : { exists: false, inputPhone: phone };
          }),
        );
      }
      if (!url.pathname.endsWith("/contacts"))
        throw new Error("Unexpected synthetic operation");
      const page = Number(url.searchParams.get("page"));
      return Response.json(
        Array.from(
          { length: Math.max(0, Math.min(100, 1700 - (page - 1) * 100)) },
          (_, i) => ({
            phone: String(5511900000001 + (page - 1) * 100 + i),
            name: `Pessoa Sintética ${(page - 1) * 100 + i + 1}`,
            short: "Pessoa",
          }),
        ),
      );
    },
  );
  const meter = measuredDatabase(),
    app = { ...env, DB: meter.db };
  let result = await syncContacts(app, {}),
    calls = 1,
    previous = meter.reads();
  expect(meter.reads()).toBeLessThan(25000);
  while (result.next_cursor) {
    result = await syncContacts(app, { cursor: result.next_cursor });
    calls++;
    expect(meter.reads() - previous).toBeLessThan(25000);
    previous = meter.reads();
    expect(calls).toBeLessThanOrEqual(65);
  }
  expect(result.complete).toBe(true);
  expect(
    (await sql(env.DB, "SELECT count(*) n FROM contact_directory").first<{
      n: number;
    }>())!.n,
  ).toBe(1700);
  expect(
    (await sql(env.DB, "SELECT count(*) n FROM contact_identity_pairs").first<{
      n: number;
    }>())!.n,
  ).toBe(44);
  expect(
    (await sql(
      env.DB,
      "SELECT count(*) n FROM messages WHERE contact_id LIKE 'ct_lid_%'",
    ).first<{ n: number }>())!.n,
  ).toBe(44);
  expect(
    (await sql(
      env.DB,
      "SELECT count(*) n FROM contacts WHERE deleted=0 AND address GLOB '*@lid'",
    ).first<{ n: number }>())!.n,
  ).toBe(44);
  console.log(
    JSON.stringify({
      scenario: "directory_complete_1700_44_lids",
      calls,
      rows_read: meter.reads(),
    }),
  );
  expect(meter.reads()).toBeLessThan(500000);
}, 60000);

it("does not invent success when the page batch fails before commit, and retries the same cursor", async () => {
  const requested = await provider(200);
  let batches = 0;
  const db = new Proxy(env.DB, {
    get(target, key) {
      if (key === "batch")
        return async (statements: D1PreparedStatement[]) => {
          if (++batches === 2)
            throw new Error("Synthetic rollback before commit");
          return target.batch(statements);
        };
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const app = { ...env, DB: db },
    first = await syncContacts(app, {});
  await expect(
    syncContacts(app, { cursor: first.next_cursor }),
  ).rejects.toMatchObject({
    code: "agenda_alterada_ou_gravacao_falhou_repita",
  });
  expect(
    (await sql(
      env.DB,
      "SELECT next_page FROM directory_state WHERE id=1",
    ).first<{ next_page: number }>())!.next_page,
  ).toBe(2);
  expect(
    (await sql(env.DB, "SELECT count(*) n FROM contact_directory").first<{
      n: number;
    }>())!.n,
  ).toBe(100);
  const second = await syncContacts(app, { cursor: first.next_cursor });
  expect(second.next_cursor).toBeTruthy();
  expect(requested).toEqual([1, 2, 2]);
});

it("two callers of the same step share one committed response and advance only once", async () => {
  await provider(200);
  const first = await syncContacts(env, {});
  const replies = await Promise.all([
    syncContacts(env, { cursor: first.next_cursor }),
    syncContacts(env, { cursor: first.next_cursor }),
  ]);
  expect(replies[0]).toEqual(replies[1]);
  expect(
    await sql(
      env.DB,
      "SELECT next_page,step FROM directory_state WHERE id=1",
    ).first(),
  ).toMatchObject({ next_page: 3, step: 2 });
  const final = await syncContacts(env, { cursor: replies[0].next_cursor });
  expect(final.complete).toBe(true);
  await expect(
    syncContacts(env, { cursor: first.next_cursor }),
  ).rejects.toMatchObject({ code: "agenda_alterada_reinicie" });
});

it.each([
  "connection_generation",
  "data_generation",
  "epoch",
  "expiration",
  "superseded_run",
] as const)("never recovers a receipt after %s changes", async (field) => {
  const requested = await provider(100);
  const first = await syncContacts(env, {});
  await syncContacts(env, { cursor: first.next_cursor });
  let app = env,
    cursor = first.next_cursor;
  if (field === "epoch") app = { ...env, AUTH_EPOCH: "synthetic-next-epoch" };
  else if (field === "expiration") {
    const { unseal } = await import("../src/core");
    const value = await unseal<Record<string, unknown>>(
      cursor!,
      env.ENCRYPTION_KEY,
    );
    cursor = await seal(
      { ...value, expires: Date.now() - 1 },
      env.ENCRYPTION_KEY,
    );
  } else if (field === "superseded_run") await syncContacts(env, {});
  else
    await sql(
      env.DB,
      `UPDATE settings SET ${field}=${field}+1 WHERE id=1`,
    ).run();
  const before = requested.length;
  await expect(syncContacts(app, { cursor })).rejects.toMatchObject({
    code: "agenda_alterada_reinicie",
  });
  expect(requested).toHaveLength(before);
});

it("replays the last repair receipt without learning another identity when the provider page stays the same", async () => {
  await legacyProvider(3);
  const first = await syncContacts(env, {});
  const second = await syncContacts(env, { cursor: first.next_cursor });
  expect(second.identity_mapping_pending).toBe(true);
  expect(await syncContacts(env, { cursor: first.next_cursor })).toEqual(
    second,
  );
  expect(
    (await sql(env.DB, "SELECT count(*) n FROM contact_identity_pairs").first<{
      n: number;
    }>())!.n,
  ).toBe(2);
  expect(
    (await sql(
      env.DB,
      "SELECT next_page FROM directory_state WHERE id=1",
    ).first<{ next_page: number }>())!.next_page,
  ).toBe(1);
  const final = await syncContacts(env, { cursor: second.next_cursor });
  expect(final.complete).toBe(true);
  expect(
    (await sql(env.DB, "SELECT count(*) n FROM contact_identity_pairs").first<{
      n: number;
    }>())!.n,
  ).toBe(3);
});

it("does not reconcile identities for a run superseded during the provider lookup", async () => {
  await legacyProvider(1, true);
  await expect(syncContacts(env, {})).rejects.toBeInstanceOf(Error);
  expect(
    (await sql(env.DB, "SELECT count(*) n FROM contact_identity_pairs").first<{
      n: number;
    }>())!.n,
  ).toBe(0);
  expect(
    (await sql(env.DB, "SELECT count(*) n FROM contact_associations").first<{
      n: number;
    }>())!.n,
  ).toBe(0);
});
