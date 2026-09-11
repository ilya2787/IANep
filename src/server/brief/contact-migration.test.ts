import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("миграция сохраняет старые контакты и backfill-ит известные типы", async () => {
  const sql = await readFile(new URL("../../../prisma/migrations/20260911210000_typed_privacy_lookup_and_brief_contact/migration.sql", import.meta.url), "utf8");
  assert.match(sql, /ADD COLUMN "contactType"/);
  assert.match(sql, /"answers"->>'contactMethod'/);
  assert.doesNotMatch(sql, /DROP COLUMN "contact"/);
  assert.match(sql, /SET "lookupHash" = "lookupKey"/);
  assert.doesNotMatch(sql, /DROP COLUMN "lookupKey"/);
});
