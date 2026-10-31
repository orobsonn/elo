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
          "UPDATE settings SET sends_paused=0; INSERT INTO contacts(id,alias,created_at) VALUES('ct_demo','Lia',1); INSERT INTO sources(id,contact_id,dedup_key,kind,occurred_at,received_at,expires_at,content) VALUES('src_demo','ct_demo','demo','meeting',1,1,2,'expired fixture'); INSERT INTO auth_state VALUES('owner_binding','synthetic'),('old-session','synthetic'); INSERT INTO actions(id,contact_id,alias,content,content_hash,address,address_version,connection_generation,epoch,status,prepared_at,expires_at) VALUES('act_expired','ct_demo','Lia','expired action fixture','synthetic','5511000000000',1,1,'old','awaiting_approval',1,2);",
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
  assert.deepEqual({...db.prepare("SELECT content,address,status FROM actions WHERE id='act_expired'").get()}, {content:"",address:"",status:"cancelled"});
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

test('identity upgrade revokes legacy pending hashes and preserves uncertain attempts',()=>{
  const db=new DatabaseSync(':memory:');
  try {
    const names=readdirSync(new URL('../migrations/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort();
    for(const name of names.filter(n=>n<'0009_identity_and_directory_runs.sql')) db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
    db.exec("INSERT INTO contacts(id,alias,created_at) VALUES('ct_demo','Lia',1)");
    for(const status of ['awaiting_approval','uncertain']) db.prepare("INSERT INTO actions(id,contact_id,alias,content,content_hash,address,address_version,connection_generation,epoch,status,prepared_at,expires_at) VALUES(?,'ct_demo','Lia','Texto','legacy-hash','synthetic-address',1,1,'old',?,1,9999999999999)").run('act_'+status,status);
    db.exec(readFileSync(new URL('../migrations/0009_identity_and_directory_runs.sql',import.meta.url),'utf8'));
    assert.equal(db.prepare("SELECT status FROM actions WHERE id='act_awaiting_approval'").get().status,'cancelled');
    assert.equal(db.prepare("SELECT status FROM actions WHERE id='act_uncertain'").get().status,'uncertain');
    assert.equal(db.prepare("SELECT state FROM action_events WHERE action_id='act_awaiting_approval' ORDER BY id DESC LIMIT 1").get()?.state,'cancelled');
  } finally {db.close();}
});

test('send intent upgrade revokes pending legacy actions and keeps attempted sends conservative',()=>{
  const db=new DatabaseSync(':memory:');
  try{
    for(const name of readdirSync(new URL('../migrations/',import.meta.url)).filter(n=>n.endsWith('.sql')&&n<'0010_send_intent.sql').sort())db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
    db.exec("INSERT INTO contacts(id,alias,created_at) VALUES('ct_demo','Lia',1)");
    for(const state of ['prepared','awaiting_approval','executing','uncertain'])db.prepare("INSERT INTO actions(id,contact_id,alias,content,content_hash,address,address_version,connection_generation,epoch,status,prepared_at,expires_at,request_fingerprint) VALUES(?,'ct_demo','Lia','Texto','legacy','synthetic-address',1,1,'old',?,1,9999999999999,?)").run('act_'+state,state,'request_'+state);
    db.exec(readFileSync(new URL('../migrations/0010_send_intent.sql',import.meta.url),'utf8'));
    for(const state of ['prepared','awaiting_approval','executing','uncertain']){
      const row=db.prepare('SELECT status,review_required FROM actions WHERE id=?').get('act_'+state);
      assert.equal(row.review_required,1);assert.equal(row.status,['prepared','awaiting_approval'].includes(state)?'cancelled':state);
    }
    assert.match(db.prepare("SELECT sql FROM sqlite_master WHERE name='actions_open_request'").get().sql,/'prepared'/);
  }finally{db.close();}
});

test('directory receipt upgrade invalidates old paging state and preserves contacts and paused sends',()=>{
  const db=new DatabaseSync(':memory:');
  try{
    for(const name of readdirSync(new URL('../migrations/',import.meta.url)).filter(n=>n.endsWith('.sql')&&n<'0011_directory_receipt.sql').sort())db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
    db.exec("INSERT INTO contacts(id,alias,created_at) VALUES('ct_upgrade','Pessoa',1); UPDATE directory_state SET run_id='old',next_page=3,completed_at=123,connection_generation=1,data_generation=1 WHERE id=1; UPDATE settings SET sends_paused=1");
    db.exec(readFileSync(new URL('../migrations/0011_directory_receipt.sql',import.meta.url),'utf8'));
    const state=db.prepare('SELECT run_id,next_page,completed_at,step,last_result FROM directory_state WHERE id=1').get();
    assert.deepEqual({...state},{run_id:null,next_page:null,completed_at:null,step:0,last_result:null});
    assert.equal(db.prepare("SELECT alias FROM contacts WHERE id='ct_upgrade'").get().alias,'Pessoa');
    assert.equal(db.prepare('SELECT sends_paused FROM settings WHERE id=1').get().sends_paused,1);
  }finally{db.close();}
});
