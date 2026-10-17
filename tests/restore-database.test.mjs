import test from "node:test";
import assert from "node:assert/strict";
import { restoreDatabase } from "../scripts/restore-database.mjs";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";

test("restores the snapshot, migrates it, then invalidates old authorizations before reopening", () => {
  const calls = [];
  const db = new DatabaseSync(":memory:");
  restoreDatabase(
    (args) => {
      calls.push(args);
      if (args[1] === "time-travel") {
        db.exec(
          readFileSync(
            new URL("../migrations/0001_initial.sql", import.meta.url),
            "utf8",
          ),
        );
        db.exec(
          "UPDATE settings SET sends_paused=0; INSERT INTO contacts(id,alias,created_at) VALUES('ct_demo','Lia',1); INSERT INTO sources(id,contact_id,dedup_key,kind,occurred_at,received_at,expires_at,content) VALUES('src_demo','ct_demo','demo','meeting',1,1,2,'expired fixture'); INSERT INTO auth_state VALUES('owner_binding','synthetic'),('old-session','synthetic');",
        );
      }
      if (args[1] === "migrations") {
        for (const name of readdirSync(
          new URL("../migrations/", import.meta.url),
        )
          .filter(
            (name) => name.endsWith(".sql") && name !== "0001_initial.sql",
          )
          .sort())
          db.exec(
            readFileSync(
              new URL("../migrations/" + name, import.meta.url),
              "utf8",
            ),
          );
      }
      if (args[1] === "execute") db.exec(args[5]);
    },
    "elo-recovery",
    "synthetic-bookmark",
    true,
  );
  assert.deepEqual(calls.slice(0, 2), [
    [
      "d1",
      "time-travel",
      "restore",
      "elo-recovery",
      "--bookmark",
      "synthetic-bookmark",
      "--json",
    ],
    ["d1", "migrations", "apply", "elo-recovery", "--remote"],
  ]);
  assert.equal(
    db.prepare("SELECT sends_paused FROM settings").get().sends_paused,
    1,
  );
  assert.equal(
    db.prepare("SELECT data_generation FROM settings").get().data_generation,
    2,
  );
  assert.equal(db.prepare("SELECT content FROM sources").get().content, null);
  assert.equal(
    db.prepare("SELECT extraction_owner FROM sources").get().extraction_owner,
    "backend",
  );
  assert.equal(
    db.prepare("SELECT skill_applied FROM sources").get().skill_applied,
    0,
  );
  assert.deepEqual(
    db
      .prepare("SELECT key FROM auth_state")
      .all()
      .map((x) => x.key),
    ["owner_binding"],
  );
  db.close();
});

test("migration failure stops recovery before data cleanup and reopening", () => {
  const calls = [];
  assert.throws(() =>
    restoreDatabase(
      (args) => {
        calls.push(args);
        if (args[1] === "migrations")
          throw new Error("synthetic migration failure");
      },
      "elo-recovery",
      "2026-10-17T10:00:00Z",
      false,
    ),
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[0][4], "--timestamp");
  assert.equal(
    calls.some((args) => args[1] === "execute"),
    false,
  );
});
