/** Maintenance must already be active; never reopen from this function. */
export function restoreDatabase(cli, database, target, isBookmark) {
  cli([
    "d1",
    "time-travel",
    "restore",
    database,
    isBookmark ? "--bookmark" : "--timestamp",
    target,
    "--json",
  ]);
  // Time Travel also rewinds the migration ledger and schema. Upgrade the
  // restored snapshot before running cleanup or exposing the current Worker.
  cli(["d1", "migrations", "apply", database, "--remote"]);
  const sql =
    "UPDATE settings SET sends_paused=1,data_generation=data_generation+1; UPDATE actions SET status=CASE WHEN status IN ('prepared','awaiting_approval','authorized') THEN 'cancelled' WHEN status='executing' THEN 'uncertain' ELSE status END; UPDATE sources SET content=NULL,extract_state='done',lease=NULL WHERE expires_at<=unixepoch()*1000; DELETE FROM auth_state WHERE key!='owner_binding';";
  cli(["d1", "execute", database, "--remote", "--command", sql]);
}
