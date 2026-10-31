import { env as testEnv } from "cloudflare:test";
import { afterEach, expect, it, vi } from "vitest";
import { syncContacts } from "../src/directory";
import { ingest } from "../src/capture";
import { deleteContact } from "../src/operations";
import { addressFingerprint, seal, sql } from "../src/core";
import { observePair } from "../src/contact-addresses";
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
function measuredDatabase(
  loseBatch?: number,
  hooks?: {
    beforeBatch?: (batch: number) => Promise<void>;
    afterRead?: (query: string) => Promise<void>;
  },
) {
  let reads = 0,
    writes = 0,
    requests = 0,
    batches = 0;
  const originals = new WeakMap<D1PreparedStatement, D1PreparedStatement>();
  const wrap = (
    statement: D1PreparedStatement,
    query: string,
  ): D1PreparedStatement => {
    const proxy = new Proxy(statement, {
      get(target, key) {
        if (key === "bind")
          return (...args: unknown[]) => {
            expect(args.length).toBeLessThanOrEqual(100);
            return wrap(target.bind(...args), query);
          };
        if (key === "first")
          return async (column?: string) => {
            requests++;
            const result = await target.all<Record<string, unknown>>();
            await hooks?.afterRead?.(query);
            reads += result.meta.rows_read;
            writes += result.meta.rows_written;
            const row = result.results[0];
            return column ? (row?.[column] ?? null) : (row ?? null);
          };
        if (key === "all" || key === "run")
          return async () => {
            requests++;
            const result = await target[key]();
            await hooks?.afterRead?.(query);
            reads += result.meta.rows_read;
            writes += result.meta.rows_written;
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
        return (query: string) => wrap(target.prepare(query), query);
      if (key === "batch")
        return async (statements: D1PreparedStatement[]) => {
          const number = ++batches;
          requests++;
          await hooks?.beforeBatch?.(number);
          const result = await target.batch(
            statements.map((s) => originals.get(s) ?? s),
          );
          reads += result.reduce((n, r) => n + r.meta.rows_read, 0);
          writes += result.reduce((n, r) => n + r.meta.rows_written, 0);
          if (number === loseBatch)
            throw new Error(
              "Synthetic lost D1 response after successful commit",
            );
          return result;
        };
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return {
    db,
    reads: () => reads,
    writes: () => writes,
    requests: () => requests,
  };
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
  let networkCalls = 0;
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      networkCalls++;
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
  return { calls: () => networkCalls };
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
  let providerRequests = 0;
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      providerRequests++;
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
    previous = meter.reads(),
    previousRequests = meter.requests(),
    previousProviderRequests = providerRequests,
    maxSubrequests = meter.requests() + providerRequests;
  expect(maxSubrequests).toBeLessThan(45);
  expect(meter.reads()).toBeLessThan(25000);
  while (result.next_cursor) {
    result = await syncContacts(app, { cursor: result.next_cursor });
    calls++;
    const subrequests =
      meter.requests() -
      previousRequests +
      providerRequests -
      previousProviderRequests;
    expect(subrequests).toBeLessThan(45);
    maxSubrequests = Math.max(maxSubrequests, subrequests);
    previousRequests = meter.requests();
    previousProviderRequests = providerRequests;
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
      rows_written: meter.writes(),
      max_subrequests: maxSubrequests,
    }),
  );
  expect(calls).toBeLessThanOrEqual(26);
  expect(meter.reads()).toBeLessThan(250000);
  expect(meter.writes()).toBeLessThan(25000);
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
  await legacyProvider(11);
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
  ).toBe(10);
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
  ).toBe(11);
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

it("repairs five proven identities, keeps the sixth pending and fits the D1 invocation budget", async () => {
  const remote = await legacyProvider(6);
  const meter = measuredDatabase(),
    app = { ...env, DB: meter.db };
  const first = await syncContacts(app, {});
  expect(first.identity_mapping_pending).toBe(true);
  expect(
    (await sql(env.DB, "SELECT count(*) n FROM contact_identity_pairs").first<{
      n: number;
    }>())!.n,
  ).toBe(5);
  expect(meter.requests() + remote.calls()).toBeLessThan(45);
  expect(JSON.stringify(first)).not.toMatch(/@lid|5511900|fingerprint|proof/);
  const before = meter.requests(),
    remoteBefore = remote.calls();
  const last = await syncContacts(app, { cursor: first.next_cursor });
  expect(last.complete).toBe(true);
  expect(
    (await sql(env.DB, "SELECT count(*) n FROM contact_identity_pairs").first<{
      n: number;
    }>())!.n,
  ).toBe(6);
  expect(
    meter.requests() - before + remote.calls() - remoteBefore,
  ).toBeLessThan(45);
  expect(await syncContacts(app, { cursor: first.next_cursor })).toEqual(last);
});

it.each([
  ["selected_after_known", 1, "after"],
  ["tail_after_known", 6, "after"],
  ["deleted_before_known", 6, "before"],
  ["tail_before_page_commit", 6, "commit"],
] as const)(
  "does not recreate a deleted identity by phone: %s",
  async (_scenario, index, point) => {
    await legacyProvider(6);
    const contact = (await sql(
      env.DB,
      "SELECT id FROM contacts WHERE address=?",
      `${9999999900000 + index}@lid`,
    ).first<{ id: string }>())!;
    let deleted = false;
    const erase = async () => {
      if (!deleted) {
        deleted = true;
        await deleteContact(env.DB, contact.id, env.ENCRYPTION_KEY);
      }
    };
    // Before known: the mapping response is authenticated but the LID card has already gone.
    if (point === "before") {
      const network = globalThis.fetch;
      vi.stubGlobal(
        "fetch",
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const r = await network(input, init);
          if (
            new URL(new Request(input, init).url).pathname.endsWith(
              "/phone-exists-batch",
            )
          )
            await erase();
          return r;
        },
      );
    }
    const meter = measuredDatabase(undefined, {
      beforeBatch: async (n) => {
        if (point === "commit" && n === 7) await erase();
      },
      afterRead: async (query) => {
        if (
          point === "after" &&
          query.includes(
            "SELECT address FROM contacts c WHERE deleted=0 AND address IN (SELECT value FROM json_each",
          )
        )
          await erase();
      },
    });
    const app = { ...env, DB: meter.db };
    let page = await syncContacts(app, {}),
      steps = 0;
    while (page.next_cursor) {
      page = await syncContacts(app, { cursor: page.next_cursor });
      expect(++steps).toBeLessThan(6);
    }
    await syncContacts(app, {}); // A later refresh may no longer need the provider mapping.
    expect(deleted).toBe(true);
    expect(
      await sql(
        env.DB,
        "SELECT id FROM contacts WHERE deleted=0 AND address=?",
        String(5511900000000 + index),
      ).first(),
    ).toBeNull();
    expect(
      await sql(
        env.DB,
        "SELECT contact_id FROM contact_directory WHERE contact_id=?",
        contact.id,
      ).first(),
    ).toBeNull();
    expect(
      await sql(
        env.DB,
        "SELECT phone FROM contact_identity_pairs WHERE phone=?",
        String(5511900000000 + index),
      ).first(),
    ).toBeNull();
    expect(
      await ingest(
        env.DB,
        {
          type: "ReceivedCallback",
          phone: String(5511900000000 + index),
          messageId: "synthetic_blocked_new_message",
          momment: Date.now(),
          text: { message: "SIM nova mensagem" },
        },
        1,
        env.ENCRYPTION_KEY,
      ),
    ).toEqual({ ignored: "forgotten_contact" });
  },
);

it.each(["before", "after"] as const)(
  "resumes a partial repair slice after failure %s the third identity commit",
  async (point) => {
    await legacyProvider(11);
    const first = await syncContacts(env, {});
    const meter = measuredDatabase(point === "after" ? 4 : undefined, {
      beforeBatch: async (n) => {
        if (point === "before" && n === 4)
          throw new Error("Synthetic failure before third repair commit");
      },
    });
    const app = { ...env, DB: meter.db };
    await expect(
      syncContacts(app, { cursor: first.next_cursor }),
    ).rejects.toBeInstanceOf(Error);
    expect(
      (await sql(
        env.DB,
        "SELECT count(*) n FROM contact_identity_pairs",
      ).first<{ n: number }>())!.n,
    ).toBe(point === "before" ? 7 : 8);
    expect(
      await sql(
        env.DB,
        "SELECT step,next_page FROM directory_state WHERE id=1",
      ).first(),
    ).toMatchObject({ step: 1, next_page: 1 });
    const done = await syncContacts(app, { cursor: first.next_cursor });
    expect(done.complete).toBe(true);
    expect(await syncContacts(app, { cursor: first.next_cursor })).toEqual(
      done,
    );
    expect(
      (await sql(
        env.DB,
        "SELECT count(*) n FROM contact_identity_pairs",
      ).first<{ n: number }>())!.n,
    ).toBe(11);
    expect(
      (await sql(env.DB, "SELECT count(*) n FROM contact_associations").first<{
        n: number;
      }>())!.n,
    ).toBe(6);
    expect(
      (await sql(env.DB, "SELECT count(*) n FROM messages").first<{
        n: number;
      }>())!.n,
    ).toBe(11);
    expect(
      (await sql(
        env.DB,
        "SELECT count(*) n FROM contacts WHERE deleted=0 AND generation=2 AND address GLOB '*@lid'",
      ).first<{ n: number }>())!.n,
    ).toBe(11);
  },
);

it("rejects a preexisting contradictory identity before repairing another pair", async () => {
  await legacyProvider(11);
  const first = await syncContacts(env, {}),
    phone = String(5511900000008);
  await sql(
    env.DB,
    "INSERT INTO contact_identity_pairs(connection_generation,phone,lid,proof_key,observed_at) VALUES(1,?,'8888888888888@lid','synthetic_conflict',1)",
    phone,
  ).run();
  await expect(
    syncContacts(env, { cursor: first.next_cursor }),
  ).rejects.toMatchObject({
    code: "identidade_conflitante_ou_alterada_requer_revisao",
  });
  expect(
    (await sql(
      env.DB,
      "SELECT lid FROM contact_identity_pairs WHERE phone=?",
      phone,
    ).first<{ lid: string }>())!.lid,
  ).toBe("8888888888888@lid");
  expect(
    (await sql(env.DB, "SELECT count(*) n FROM contact_identity_pairs").first<{
      n: number;
    }>())!.n,
  ).toBe(6);
  expect(
    await sql(
      env.DB,
      "SELECT step,next_page FROM directory_state WHERE id=1",
    ).first(),
  ).toMatchObject({ step: 1, next_page: 1 });
  expect(
    (await sql(env.DB, "SELECT count(*) n FROM messages").first<{
      n: number;
    }>())!.n,
  ).toBe(11);
});

it.each(["connection_generation", "data_generation", "run_id"] as const)(
  "stops later repairs when %s changes between identities",
  async (field) => {
    await legacyProvider(11);
    const first = await syncContacts(env, {});
    const meter = measuredDatabase(undefined, {
      beforeBatch: async (n) => {
        if (n !== 3) return;
        if (field === "run_id")
          await sql(
            env.DB,
            "UPDATE directory_state SET run_id='synthetic_replaced' WHERE id=1",
          ).run();
        else
          await sql(
            env.DB,
            `UPDATE settings SET ${field}=${field}+1 WHERE id=1`,
          ).run();
      },
    });
    await expect(
      syncContacts({ ...env, DB: meter.db }, { cursor: first.next_cursor }),
    ).rejects.toBeInstanceOf(Error);
    expect(
      (await sql(
        env.DB,
        "SELECT count(*) n FROM contact_identity_pairs",
      ).first<{ n: number }>())!.n,
    ).toBe(6);
    expect(
      (await sql(env.DB, "SELECT step FROM directory_state WHERE id=1").first<{
        step: number;
      }>())!.step,
    ).toBe(1);
  },
);

it("rejects contradictory evidence outside the repair slice before propagating forgotten aliases", async () => {
  await legacyProvider(6);
  await sql(
    env.DB,
    "INSERT INTO contact_identity_pairs(connection_generation,phone,lid,proof_key,observed_at) VALUES(1,'5511900000006','8888888888888@lid','synthetic_prior',1)",
  ).run();
  const contact = (await sql(
    env.DB,
    "SELECT id FROM contacts WHERE address='9999999900006@lid'",
  ).first<{ id: string }>())!;
  let erased = false;
  const meter = measuredDatabase(undefined, {
    afterRead: async (q) => {
      if (
        !erased &&
        q.includes(
          "SELECT address FROM contacts c WHERE deleted=0 AND address IN (SELECT value FROM json_each",
        )
      ) {
        erased = true;
        await deleteContact(env.DB, contact.id, env.ENCRYPTION_KEY);
      }
    },
  });
  await expect(
    syncContacts({ ...env, DB: meter.db }, {}),
  ).rejects.toBeInstanceOf(Error);
  expect(
    (await sql(env.DB, "SELECT count(*) n FROM forgotten_addresses").first<{
      n: number;
    }>())!.n,
  ).toBe(1);
  expect(
    (await sql(
      env.DB,
      "SELECT lid FROM contact_identity_pairs WHERE phone='5511900000006'",
    ).first<{ lid: string }>())!.lid,
  ).toBe("8888888888888@lid");
  expect(
    (await sql(env.DB, "SELECT step FROM directory_state WHERE id=1").first<{
      step: number;
    }>())!.step,
  ).toBe(0);
});

it.each([false, true])(
  "preserves deletion proof after all repairs finish, page rollback and omitted provider evidence: %s",
  async (omitProof) => {
    await legacyProvider(5);
    const contact = (await sql(
      env.DB,
      "SELECT id FROM contacts WHERE address='9999999900001@lid'",
    ).first<{ id: string }>())!;
    let erased = false,
      batches = 0;
    const meter = measuredDatabase(undefined, {
      afterRead: async (q) => {
        if (
          !erased &&
          q.includes(
            "SELECT address FROM contacts c WHERE deleted=0 AND address IN (SELECT value FROM json_each",
          )
        ) {
          erased = true;
          await deleteContact(env.DB, contact.id, env.ENCRYPTION_KEY);
        }
      },
    });
    const db = new Proxy(meter.db, {
      get(target, key) {
        if (key === "batch")
          return (stmts: D1PreparedStatement[]) =>
            target.batch(
              ++batches === 6
                ? [
                    ...stmts,
                    env.DB.prepare("SELECT json('synthetic page rollback')"),
                  ]
                : stmts,
            );
        const v = Reflect.get(target, key);
        return typeof v === "function" ? v.bind(target) : v;
      },
    });
    await expect(syncContacts({ ...env, DB: db }, {})).rejects.toBeInstanceOf(
      Error,
    );
    expect(
      (await sql(env.DB, "SELECT count(*) n FROM forgotten_addresses").first<{
        n: number;
      }>())!.n,
    ).toBe(2);
    expect(
      (await sql(
        env.DB,
        "SELECT count(*) n FROM contact_identity_pairs",
      ).first<{
        n: number;
      }>())!.n,
    ).toBe(4);
    expect(
      (await sql(env.DB, "SELECT count(*) n FROM contact_directory").first<{
        n: number;
      }>())!.n,
    ).toBe(0);
    expect(
      await sql(
        env.DB,
        `SELECT 1 FROM contacts c WHERE c.deleted=0 AND c.address GLOB '*@lid'
      AND NOT EXISTS(SELECT 1 FROM contact_identity_pairs p WHERE p.connection_generation=1 AND p.lid=c.address) LIMIT 1`,
      ).first(),
    ).toBeNull();
    if (omitProof) {
      const network = globalThis.fetch;
      vi.stubGlobal(
        "fetch",
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const r = await network(input, init);
          if (
            !new URL(new Request(input, init).url).pathname.endsWith(
              "/phone-exists-batch",
            )
          )
            return r;
          const pairs = (await r.json()) as { inputPhone: string }[];
          return Response.json(
            pairs.filter((p) => p.inputPhone !== "5511900000001"),
          );
        },
      );
    }
    await syncContacts(env, {});
    expect(
      (await sql(env.DB, "SELECT count(*) n FROM forgotten_addresses").first<{
        n: number;
      }>())!.n,
    ).toBe(2);
    expect(
      await sql(
        env.DB,
        "SELECT id FROM contacts WHERE deleted=0 AND address='5511900000001'",
      ).first(),
    ).toBeNull();
  },
);

it("suppresses new imports through a forgotten alias without deleting an existing classified card or its action", async () => {
  await legacyProvider(6);
  const contact = (await sql(
    env.DB,
    "SELECT id FROM contacts WHERE address='9999999900006@lid'",
  ).first<{ id: string }>())!;
  await sql(
    env.DB,
    "INSERT INTO contacts(id,alias,address,created_at,alias_origin,relationship) VALUES('ct_classified','SIM carteira','5511900000006',1,'manual','client')",
  ).run();
  await sql(
    env.DB,
    "INSERT INTO sources(id,contact_id,dedup_key,kind,occurred_at,received_at,expires_at,content) VALUES('src_classified','ct_classified','synthetic_classified','meeting',1,1,9999999999999,'SIM memória existente')",
  ).run();
  await sql(
    env.DB,
    "INSERT INTO actions(id,contact_id,alias,content,content_hash,address,address_version,connection_generation,epoch,status,prepared_at,expires_at) VALUES('act_classified','ct_classified','SIM carteira','SIM texto','synthetic','5511900000006',1,1,'synthetic','prepared',1,9999999999999)",
  ).run();
  let erased = false;
  const meter = measuredDatabase(undefined, {
    afterRead: async (q) => {
      if (
        !erased &&
        q.includes(
          "SELECT address FROM contacts c WHERE deleted=0 AND address IN (SELECT value FROM json_each",
        )
      ) {
        erased = true;
        await deleteContact(env.DB, contact.id, env.ENCRYPTION_KEY);
      }
    },
  });
  await syncContacts({ ...env, DB: meter.db }, {});
  expect(
    await sql(
      env.DB,
      "SELECT alias,address,deleted,relationship FROM contacts WHERE id='ct_classified'",
    ).first(),
  ).toEqual({
    alias: "SIM carteira",
    address: "5511900000006",
    deleted: 0,
    relationship: "client",
  });
  expect(
    (await sql(
      env.DB,
      "SELECT content FROM sources WHERE id='src_classified'",
    ).first<{ content: string }>())!.content,
  ).toBe("SIM memória existente");
  expect(
    (await sql(
      env.DB,
      "SELECT status FROM actions WHERE id='act_classified'",
    ).first<{ status: string }>())!.status,
  ).toBe("prepared");
  expect(
    (await sql(env.DB, "SELECT count(*) n FROM forgotten_addresses").first<{
      n: number;
    }>())!.n,
  ).toBe(2);
});

it.each(["manual_alias", "executing", "uncertain", "both_classified"] as const)(
  "keeps the third repair blocked by %s after earlier pairs commit",
  async (condition) => {
    await legacyProvider(11);
    const first = await syncContacts(env, {});
    const phoneCard = (await sql(
      env.DB,
      "SELECT id FROM contacts WHERE address='5511900000008'",
    ).first<{ id: string }>())!;
    if (condition === "manual_alias")
      await sql(
        env.DB,
        "UPDATE contacts SET alias='SIM escolha manual',alias_origin='manual' WHERE id=?",
        phoneCard.id,
      ).run();
    else if (condition === "both_classified")
      await sql(
        env.DB,
        "UPDATE contacts SET relationship='client' WHERE address IN ('5511900000008','9999999900008@lid')",
      ).run();
    else
      await sql(
        env.DB,
        "INSERT INTO actions(id,contact_id,alias,content,content_hash,address,address_version,connection_generation,epoch,status,prepared_at,expires_at) VALUES('act_blocked',?,'Pessoa','SIM texto','synthetic','5511900000008',1,1,'synthetic',?,1,9999999999999)",
        phoneCard.id,
        condition,
      ).run();
    await expect(
      syncContacts(env, { cursor: first.next_cursor }),
    ).rejects.toMatchObject({
      code: "identidade_conflitante_ou_alterada_requer_revisao",
    });
    expect(
      (await sql(
        env.DB,
        "SELECT count(*) n FROM contact_identity_pairs",
      ).first<{ n: number }>())!.n,
    ).toBe(7);
    expect(
      await sql(
        env.DB,
        "SELECT id FROM contacts WHERE address='5511900000008' AND deleted=0",
      ).first(),
    ).toEqual({ id: phoneCard.id });
    expect(
      (await sql(env.DB, "SELECT step FROM directory_state WHERE id=1").first<{
        step: number;
      }>())!.step,
    ).toBe(1);
    if (condition === "manual_alias")
      expect(
        (await sql(
          env.DB,
          "SELECT alias FROM contacts WHERE id=?",
          phoneCard.id,
        ).first<{ alias: string }>())!.alias,
      ).toBe("SIM escolha manual");
    if (condition === "executing" || condition === "uncertain")
      expect(
        (await sql(
          env.DB,
          "SELECT status FROM actions WHERE id='act_blocked'",
        ).first<{ status: string }>())!.status,
      ).toBe(condition);
  },
);

it("moves five real histories while preserving classified cards, sources, review flags, tasks and action states", async () => {
  const remote = await legacyProvider(5),
    time = Date.now();
  for (let i = 1; i <= 5; i++) {
    const old = (await sql(
      env.DB,
      "SELECT id FROM contacts WHERE address=?",
      `${9999999900000 + i}@lid`,
    ).first<{ id: string }>())!;
    await sql(
      env.DB,
      "INSERT INTO contacts(id,alias,address,created_at,alias_origin,relationship) VALUES(?,?,?,1,'manual','client')",
      `ct_bulk_${i}`,
      `SIM cliente ${i}`,
      String(5511900000000 + i),
    ).run();
    await sql(
      env.DB,
      `WITH RECURSIVE n(x) AS(SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<499)
      INSERT INTO sources(id,contact_id,dedup_key,kind,occurred_at,received_at,expires_at,content,extract_state,lease,lease_until)
      SELECT 'bulk_source_'||?||'_'||x,?,'bulk_source_'||?||'_'||x,'whatsapp',?,?,?,'SIM histórico associado','processing','synthetic_old_lease',? FROM n`,
      i,
      old.id,
      i,
      time,
      time,
      time + 86400000,
      time + 60000,
    ).run();
    await sql(
      env.DB,
      `WITH RECURSIVE n(x) AS(SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<499)
      INSERT INTO messages(id,source_id,provider_key,contact_id,direction,kind)
      SELECT 'bulk_msg_'||?||'_'||x,'bulk_source_'||?||'_'||x,'bulk_msg_'||?||'_'||x,?,'received','text' FROM n`,
      i,
      i,
      i,
      old.id,
    ).run();
    await sql(
      env.DB,
      `WITH RECURSIVE n(x) AS(SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<20)
      INSERT INTO memory(id,contact_id,field,value,state,reason,source_id,source_version,occurred_at,recorded_at,confirmed_at,dedup_key)
      SELECT 'bulk_memory_'||?||'_'||x,?,'preferences','SIM fato anterior',CASE WHEN x=1 THEN 'confirmed' ELSE 'supporting' END,'SIM motivo','bulk_source_'||?||'_'||x,1,?,?,?,'bulk_memory_'||?||'_'||x FROM n`,
      i,
      old.id,
      i,
      time,
      time,
      time,
      i,
    ).run();
    await sql(
      env.DB,
      `WITH RECURSIVE n(x) AS(SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<10)
      INSERT INTO tasks(id,contact_id,subject,reason,due_date,state,source_id,dedup_key,updated_at)
      SELECT 'bulk_task_'||?||'_'||x,?,'SIM tarefa','SIM motivo','2026-11-05','open','bulk_source_'||?||'_'||x,'bulk_task_'||?||'_'||x,? FROM n`,
      i,
      old.id,
      i,
      i,
      time,
    ).run();
    await sql(
      env.DB,
      `WITH RECURSIVE n(x) AS(SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<20)
      INSERT INTO actions(id,contact_id,alias,content,content_hash,address,address_version,connection_generation,epoch,status,prepared_at,expires_at)
      SELECT 'bulk_action_'||?||'_'||x,?,'SIM cliente','SIM texto','synthetic',?,1,1,'synthetic',CASE WHEN x<=10 THEN 'accepted' ELSE 'prepared' END,?,? FROM n`,
      i,
      old.id,
      `${9999999900000 + i}@lid`,
      time,
      time + 600000,
    ).run();
    await sql(
      env.DB,
      "INSERT INTO sources(id,contact_id,dedup_key,kind,occurred_at,received_at,expires_at,content) VALUES(?,?,?,'note',?,?,?,'SIM fato atual')",
      `classified_source_${i}`,
      `ct_bulk_${i}`,
      `classified_source_${i}`,
      time,
      time,
      time + 86400000,
    ).run();
    await sql(
      env.DB,
      "INSERT INTO memory(id,contact_id,field,value,state,reason,source_id,source_version,occurred_at,recorded_at,confirmed_at,dedup_key) VALUES(?,?,'preferences','SIM fato atual','confirmed','SIM motivo',?,1,?,?,?,?)",
      `classified_memory_${i}`,
      `ct_bulk_${i}`,
      `classified_source_${i}`,
      time,
      time,
      time,
      `classified_memory_${i}`,
    ).run();
    await sql(
      env.DB,
      "INSERT INTO actions(id,contact_id,alias,content,content_hash,address,address_version,connection_generation,epoch,status,prepared_at,expires_at) VALUES(?,?,'SIM cliente','SIM texto','synthetic',?,1,1,'synthetic','prepared',?,?)",
      `classified_action_${i}`,
      `ct_bulk_${i}`,
      String(5511900000000 + i),
      time,
      time + 600000,
    ).run();
  }
  const meter = measuredDatabase();
  const result = await syncContacts({ ...env, DB: meter.db }, {});
  expect(result.complete).toBe(true);
  expect(meter.requests() + remote.calls()).toBeLessThan(45);
  expect(meter.reads()).toBeLessThan(50000);
  expect(
    (await sql(
      env.DB,
      "SELECT count(*) n FROM contacts WHERE deleted=0 AND relationship='client' AND alias_origin='manual' AND address_version=2 AND alias LIKE 'SIM cliente %'",
    ).first<{ n: number }>())!.n,
  ).toBe(5);
  expect(
    (await sql(
      env.DB,
      "SELECT count(*) n FROM messages WHERE contact_id LIKE 'ct_bulk_%'",
    ).first<{ n: number }>())!.n,
  ).toBe(2500);
  expect(
    (await sql(
      env.DB,
      "SELECT count(*) n FROM sources WHERE id LIKE 'bulk_source_%' AND contact_id LIKE 'ct_bulk_%' AND version=2 AND identity_review_required=1 AND extract_state='pending' AND lease IS NULL AND lease_until IS NULL",
    ).first<{ n: number }>())!.n,
  ).toBe(2495);
  expect(
    (await sql(
      env.DB,
      "SELECT count(*) n FROM memory WHERE id LIKE 'bulk_memory_%' AND state='pending' AND needs_review=1 AND confirmed_at IS NULL AND contact_id LIKE 'ct_bulk_%'",
    ).first<{ n: number }>())!.n,
  ).toBe(100);
  expect(
    (await sql(
      env.DB,
      "SELECT count(*) n FROM memory WHERE state='confirmed' AND value='SIM fato atual'",
    ).first<{ n: number }>())!.n,
  ).toBe(5);
  expect(
    (await sql(
      env.DB,
      "SELECT count(*) n FROM tasks WHERE contact_id LIKE 'ct_bulk_%' AND state='open' AND due_date='2026-11-05'",
    ).first<{ n: number }>())!.n,
  ).toBe(50);
  expect(
    (await sql(
      env.DB,
      "SELECT count(*) n FROM actions WHERE status='accepted' AND contact_id LIKE 'ct_bulk_%'",
    ).first<{ n: number }>())!.n,
  ).toBe(50);
  expect(
    (await sql(
      env.DB,
      "SELECT count(*) n FROM actions WHERE status='cancelled' AND contact_id LIKE 'ct_bulk_%'",
    ).first<{ n: number }>())!.n,
  ).toBe(55);
  expect(
    (await sql(env.DB, "SELECT count(*) n FROM forgotten_addresses").first<{
      n: number;
    }>())!.n,
  ).toBe(0);
  console.log(
    JSON.stringify({
      scenario: "five_classified_histories_2500_messages",
      rows_read: meter.reads(),
      d1_requests: meter.requests(),
      provider_requests: remote.calls(),
      rows_written: meter.writes(),
    }),
  );
});

it("recovers the canonical page receipt when a concurrent caller wins during the third repair", async () => {
  await legacyProvider(11);
  const first = await syncContacts(env, {});
  let winner: Awaited<ReturnType<typeof syncContacts>> | undefined;
  const meter = measuredDatabase(undefined, {
    beforeBatch: async (n) => {
      if (n === 4)
        winner = await syncContacts(env, { cursor: first.next_cursor });
    },
  });
  const result = await syncContacts(
    { ...env, DB: meter.db },
    { cursor: first.next_cursor },
  );
  expect(winner?.complete).toBe(true);
  expect(result).toEqual(winner);
  expect(
    (await sql(env.DB, "SELECT step FROM directory_state WHERE id=1").first<{
      step: number;
    }>())!.step,
  ).toBe(2);
  expect(
    (await sql(env.DB, "SELECT count(*) n FROM contact_identity_pairs").first<{
      n: number;
    }>())!.n,
  ).toBe(11);
  expect(
    (await sql(env.DB, "SELECT count(*) n FROM contact_associations").first<{
      n: number;
    }>())!.n,
  ).toBe(6);
  const day = new Date().toISOString().slice(0, 10);
  expect(
    (await sql(
      env.DB,
      "SELECT calls FROM directory_usage WHERE day=?",
      day,
    ).first<{ calls: number }>())!.calls,
  ).toBe(3);
});

it.each(["phone", "lid"] as const)(
  "rejects a callback contradicting durable directory evidence by %s before repairing the tail",
  async (side) => {
    await legacyProvider(6);
    const first = await syncContacts(env, {});
    expect(first.identity_mapping_pending).toBe(true);
    await expect(
      ingest(
        env.DB,
        {
          type: "ReceivedCallback",
          phone: side === "phone" ? "5511900000006" : "5511888888888",
          chatLid: side === "phone" ? "8888888888888@lid" : "9999999900006@lid",
          messageId: "synthetic_contradicting_cached_proof",
          momment: Date.now(),
          text: { message: "SIM prova contraditória" },
        },
        1,
        env.ENCRYPTION_KEY,
      ),
    ).rejects.toMatchObject({
      code: "identidade_conflitante_ou_alterada_requer_revisao",
    });
    expect(
      (await sql(
        env.DB,
        "SELECT count(*) n FROM contact_identity_pairs",
      ).first<{ n: number }>())!.n,
    ).toBe(5);
    expect(
      (await sql(env.DB, "SELECT count(*) n FROM sources").first<{
        n: number;
      }>())!.n,
    ).toBe(6);
    expect(
      (await sql(
        env.DB,
        "SELECT count(*) n FROM directory_identity_fingerprints",
      ).first<{ n: number }>())!.n,
    ).toBe(6);
    expect(
      JSON.stringify(await syncContacts(env, { cursor: first.next_cursor })),
    ).not.toMatch(/@lid|5511900|fingerprint|proof/);
  },
);

it("checks durable fingerprints inside the callback transaction, after its preflight", async () => {
  await provider(1);
  const phone = "5511900000001",
    lid = "9999999900001@lid";
  const phoneFp = await addressFingerprint(phone, env.ENCRYPTION_KEY);
  const otherLidFp = await addressFingerprint(
    "8888888888888@lid",
    env.ENCRYPTION_KEY,
  );
  const meter = measuredDatabase(undefined, {
    beforeBatch: async () => {
      await sql(
        env.DB,
        "INSERT INTO directory_identity_fingerprints VALUES(1,?,?)",
        phoneFp,
        otherLidFp,
      ).run();
    },
  });
  await expect(
    observePair(
      meter.db,
      phone,
      lid,
      1,
      "synthetic_callback_race",
      env.ENCRYPTION_KEY,
    ),
  ).rejects.toMatchObject({
    code: "identidade_conflitante_ou_alterada_requer_revisao",
  });
  expect(
    (await sql(env.DB, "SELECT count(*) n FROM contact_identity_pairs").first<{
      n: number;
    }>())!.n,
  ).toBe(0);
});

it("rejects a contradictory callback committed between directory lookup and its proof batch", async () => {
  await legacyProvider(6);
  let raced = false;
  const meter = measuredDatabase(undefined, {
    afterRead: async (q) => {
      if (
        raced ||
        !q.includes(
          "SELECT address FROM contacts c WHERE deleted=0 AND address IN (SELECT value FROM json_each",
        )
      )
        return;
      raced = true;
      await ingest(
        env.DB,
        {
          type: "ReceivedCallback",
          phone: "5511900000006",
          chatLid: "8888888888888@lid",
          messageId: "synthetic_winning_conflicting_callback",
          momment: Date.now(),
          text: { message: "SIM concorrência" },
        },
        1,
        env.ENCRYPTION_KEY,
      );
    },
  });
  await expect(
    syncContacts({ ...env, DB: meter.db }, {}),
  ).rejects.toMatchObject({
    code: "identidade_conflitante_ou_alterada_requer_revisao",
  });
  expect(raced).toBe(true);
  expect(
    (await sql(
      env.DB,
      "SELECT count(*) n FROM directory_identity_fingerprints",
    ).first<{ n: number }>())!.n,
  ).toBe(0);
  expect(
    (await sql(env.DB, "SELECT count(*) n FROM contact_identity_pairs").first<{
      n: number;
    }>())!.n,
  ).toBe(1);
  expect(
    (await sql(env.DB, "SELECT step FROM directory_state WHERE id=1").first<{
      step: number;
    }>())!.step,
  ).toBe(0);
});

it("deletion consumes fingerprint proof committed after its preflight without resurrecting the phone", async () => {
  await legacyProvider(1);
  const contact = (await sql(
    env.DB,
    "SELECT id FROM contacts WHERE address='9999999900001@lid'",
  ).first<{ id: string }>())!;
  const phoneFp = await addressFingerprint("5511900000001", env.ENCRYPTION_KEY);
  const lidFp = await addressFingerprint(
    "9999999900001@lid",
    env.ENCRYPTION_KEY,
  );
  const meter = measuredDatabase(undefined, {
    beforeBatch: async () => {
      await sql(
        env.DB,
        "INSERT INTO directory_identity_fingerprints VALUES(1,?,?)",
        phoneFp,
        lidFp,
      ).run();
    },
  });
  await deleteContact(meter.db, contact.id, env.ENCRYPTION_KEY);
  expect(
    (await sql(env.DB, "SELECT count(*) n FROM forgotten_addresses").first<{
      n: number;
    }>())!.n,
  ).toBe(2);
  await syncContacts(env, {});
  expect(
    await sql(
      env.DB,
      "SELECT id FROM contacts WHERE deleted=0 AND address='5511900000001'",
    ).first(),
  ).toBeNull();
});
