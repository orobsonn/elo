import { env, applyD1Migrations } from "cloudflare:test";
import { beforeAll, beforeEach } from "vitest";
import migrations from "../migrations/0001_initial.sql?raw";
import reviewVersions from "../migrations/0002_review_versions.sql?raw";
import identityLinks from "../migrations/0003_identity.sql?raw";
import identitySources from "../migrations/0004_source_identity.sql?raw";
import sourceApplication from "../migrations/0005_source_application.sql?raw";
import reviewScopeIndexes from "../migrations/0006_review_scope_indexes.sql?raw";
import conversationBlocks from "../migrations/0007_conversation_blocks.sql?raw";
import directoryMigration from "../migrations/0008_contact_directory.sql?raw";
import identityDirectory from "../migrations/0009_identity_and_directory_runs.sql?raw";
import sendIntent from "../migrations/0010_send_intent.sql?raw";
import directoryReceipt from "../migrations/0011_directory_receipt.sql?raw";
beforeAll(async () => {
  await applyD1Migrations(env.DB, [
    {
      name: "0001",
      queries: migrations
        .split(/;\s*(?:\n|$)/)
        .map((s) => s.trim())
        .filter(Boolean),
    },
    {
      name: "0002",
      queries: reviewVersions
        .split(/;\s*(?:\n|$)/)
        .map((s) => s.trim())
        .filter(Boolean),
    },
    {
      name: "0003",
      queries: identityLinks
        .split(/;\s*(?:\n|$)/)
        .map((s) => s.trim())
        .filter(Boolean),
    },
    {
      name: "0004",
      queries: identitySources
        .split(/;\s*(?:\n|$)/)
        .map((s) => s.trim())
        .filter(Boolean),
    },
    {
      name: "0005",
      queries: sourceApplication
        .split(/;\s*(?:\n|$)/)
        .map((s) => s.trim())
        .filter(Boolean),
    },
    {
      name: "0006",
      queries: reviewScopeIndexes
        .split(/;\s*(?:\n|$)/)
        .map((s) => s.trim())
        .filter(Boolean),
    },
    {
      name: "0007",
      queries: conversationBlocks
        .split(/;(?=\s*(?:ALTER|CREATE)\b|\s*$)/i)
        .map((s) => s.trim())
        .filter(Boolean),
    },
    {
      name: "0008",
      queries: directoryMigration
        .split(/;\s*(?:\n|$)/)
        .map((s) => s.trim())
        .filter(Boolean),
    },
    {
      name: "0009",
      queries: identityDirectory
        .split(/;\s*(?:\n|$)/)
        .map((s) => s.trim())
        .filter(Boolean),
    },
    {
      name: "0010",
      queries: sendIntent
        .split(/;\s*(?:\n|$)/)
        .map((s) => s.trim())
        .filter(Boolean),
    },
    {
      name: "0011",
      queries: directoryReceipt
        .split(/;\s*(?:\n|$)/)
        .map((s) => s.trim())
        .filter(Boolean),
    },
  ]);
});
// This Vitest plugin shares D1 within a file. Explicit reset prevents prior test rows
// from satisfying a later assertion or concealing an out-of-order failure.
beforeEach(async () => {
  const tables = [
    "identity_observations",
    "contact_identity_pairs",
    "contact_directory",
    "forgotten_addresses",
    "directory_usage",
    "source_dependencies",
    "contact_associations",
    "review_items",
    "action_events",
    "actions",
    "memory",
    "tasks",
    "special_dates",
    "interactions",
    "messages",
    "sources",
    "contacts",
    "tombstones",
    "provider_status",
    "review_runs",
    "usage",
    "auth_state",
  ];
  await env.DB.batch([
    ...tables.map((t) => env.DB.prepare(`DELETE FROM ${t}`)),
    env.DB.prepare(
      "UPDATE directory_state SET completed_at=NULL,connection_generation=NULL,run_id=NULL,next_page=NULL,data_generation=NULL,step=0,last_step=NULL,last_result=NULL,epoch=NULL WHERE id=1",
    ),
    env.DB.prepare(
      "UPDATE settings SET sends_paused=1,connection_generation=0,connection_cipher=NULL,last_received=NULL,last_error=NULL,data_generation=1 WHERE id=1",
    ),
  ]);
});
