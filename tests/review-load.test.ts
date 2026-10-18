import { env } from "cloudflare:test";
import { expect, it } from "vitest";
import { DAY, now, sql } from "../src/core";
import { reviewPage } from "../src/memory";

// Observe real D1 query costs, including first()/batch(), without mocking SQL results.
function meteredDatabase() {
  let reads = 0;
  const originals = new WeakMap<object, D1PreparedStatement>();
  function wrap(statement: D1PreparedStatement): D1PreparedStatement {
    const proxy = new Proxy(statement, { get(target, key) {
      if (key === "bind") return (...args: unknown[]) => wrap(target.bind(...args));
      if (key === "first") return async (column?: string) => {
        const result = await target.all<Record<string, unknown>>();
        reads += result.meta.rows_read;
        const row = result.results[0];
        return column ? row?.[column] ?? null : row ?? null;
      };
      if (key === "all" || key === "run") return async () => {
        const result = await target[key](); reads += result.meta.rows_read; return result;
      };
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    }});
    originals.set(proxy, statement); return proxy;
  }
  const db = new Proxy(env.DB, { get(target, key) {
    if (key === "prepare") return (query: string) => wrap(target.prepare(query));
    if (key === "batch") return async (statements: D1PreparedStatement[]) => {
      const results = await target.batch(statements.map(s => originals.get(s) ?? s));
      reads += results.reduce((n, r) => n + r.meta.rows_read, 0); return results;
    };
    const value = Reflect.get(target, key);
    return typeof value === "function" ? value.bind(target) : value;
  }});
  return { db, reads: () => reads };
}

it("reviews a day plus an old edit without repeatedly scanning thirty days of history", async () => {
  const time = now(), day = new Date(time).toISOString().slice(0, 10);
  const start = Date.parse(`${day}T00:00:00Z`);
  await sql(env.DB, "INSERT INTO contacts(id,alias,created_at) VALUES('ct_load','SIM carga',?)", time).run();
  await sql(env.DB, `WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<30000)
    INSERT INTO sources(id,contact_id,dedup_key,kind,occurred_at,received_at,expires_at,content,reviewed_version)
    SELECT 'load_'||x,'ct_load','load_'||x,'meeting',?,
      ?-29*?+CAST((x-1)/1000 AS INTEGER)*?+(x-1)%1000,?,'SIM fonte',1 FROM n`,
    time, start, DAY, DAY, time + DAY).run();
  await sql(env.DB, "UPDATE sources SET version=2 WHERE id IN ('load_1','load_29500')").run();
  const meter = meteredDatabase(), ids: string[] = [];
  let page = await reviewPage(meter.db, { day, timezone: "UTC", limit: 50 });
  ids.push(...page.items.map(x => x.source_id));
  while (page.next_cursor) {
    page = await reviewPage(meter.db, { run_id: page.run_id, cursor: page.next_cursor, limit: 50 });
    ids.push(...page.items.map(x => x.source_id));
  }
  expect(ids).toEqual(["load_1", ...Array.from({ length: 1000 }, (_, i) => `load_${29001+i}`)]);
  expect(page.coverage.complete).toBe(true);
  expect(page.coverage.unavailable_count).toBe(0);
  expect(meter.reads()).toBeLessThan(500000);
}, 30000);
