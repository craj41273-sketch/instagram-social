import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { eq } from "drizzle-orm";
import { PgDialect, getTableConfig } from "drizzle-orm/pg-core";

import { follows, profiles, users } from "@/lib/db/schema.ts";
import {
  buildFollowPageCondition,
  buildFollowPageOrder,
} from "@/lib/db/follow-query.ts";
import {
  buildUpdateProfileStatement,
  parseUserId,
} from "@/lib/db/profile-sql.ts";
import {
  PROTECTED_ROUTE_PREFIXES,
  isProtectedRoute,
} from "@/lib/auth/constants.ts";
import {
  decodeFollowCursor,
  encodeFollowCursor,
  parseListLimit,
} from "@/lib/pagination.ts";
import { profileInitials, safeHttpUrl } from "@/lib/profile/format.ts";
import {
  editProfileSchema,
  followActionSchema,
  userSearchQuerySchema,
} from "@/lib/validations/profile.ts";

const ownerId = "11111111-1111-4111-8111-111111111111";
const targetId = "22222222-2222-4222-8222-222222222222";

test("Block 5 schema adds follows with database-enforced safety", () => {
  const config = getTableConfig(follows);

  assert.equal(config.name, "follows");
  assert.deepEqual(
    config.columns.map((column) => column.name).sort(),
    ["created_at", "follower_id", "following_id", "id"],
  );

  const indexes = new Map(config.indexes.map((item) => [item.config.name, item.config]));
  assert.deepEqual(
    indexes.get("follows_follower_following_unique")?.columns.map((column) => column.name),
    ["follower_id", "following_id"],
  );
  assert.equal(indexes.get("follows_follower_following_unique")?.unique, true);
  assert.equal(indexes.get("follows_follower_idx")?.unique, false);
  assert.equal(indexes.get("follows_following_idx")?.unique, false);

  assert.ok(config.checks.some((item) => item.name === "follows_no_self_check"));
  assert.equal(config.foreignKeys.length, 2);
  for (const key of config.foreignKeys) {
    assert.equal(key.onDelete, "cascade");
    assert.deepEqual(key.reference().foreignColumns.map((column) => column.name), ["id"]);
  }
});

test("users.username is the only authoritative username column", () => {
  const userColumns = getTableConfig(users).columns.map((column) => column.name);
  const profileColumns = getTableConfig(profiles).columns.map((column) => column.name);

  assert.ok(userColumns.includes("username"));
  assert.ok(!profileColumns.includes("username"));
  assert.ok(profileColumns.includes("location"));
});

test("profile editing validation normalizes input and enforces limits", () => {
  const parsed = editProfileSchema.parse({
    displayName: "  Ada Lovelace  ",
    username: "  Ada.Lovelace_01  ",
    bio: "  Mathematician.  ",
    website: "  https://example.com  ",
    location: "  London  ",
  });

  assert.deepEqual(parsed, {
    displayName: "Ada Lovelace",
    username: "ada.lovelace_01",
    bio: "Mathematician.",
    website: "https://example.com",
    location: "London",
  });

  const base = {
    displayName: "Ada Lovelace",
    username: "ada.lovelace",
    bio: "",
    website: "",
    location: "",
  };

  assert.equal(
    editProfileSchema.safeParse({ ...base, bio: "x".repeat(161) }).success,
    false,
  );
  assert.equal(
    editProfileSchema.safeParse({ ...base, location: "x".repeat(101) }).success,
    false,
  );
  assert.equal(
    editProfileSchema.safeParse({ ...base, website: "javascript:alert(1)" }).success,
    false,
  );
  assert.equal(
    editProfileSchema.safeParse({ ...base, username: "bad name" }).success,
    false,
  );
});

test("follow actions reject client-supplied identity fields", () => {
  const parsed = followActionSchema.parse({
    username: "Ada.Lovelace",
    intent: "follow",
    followerId: ownerId,
    followingId: targetId,
    userId: ownerId,
  });

  assert.deepEqual(parsed, { username: "ada.lovelace", intent: "follow" });
  assert.equal(followActionSchema.safeParse({ username: "ada", intent: "block" }).success, false);
  assert.equal(followActionSchema.safeParse({ username: "a", intent: "follow" }).success, false);
});

test("user search input is bounded and rejects wildcard enumeration", () => {
  assert.equal(userSearchQuerySchema.safeParse({ q: "ad" }).success, true);
  assert.equal(userSearchQuerySchema.parse({ q: "  Ada  " }).q, "ada");
  assert.equal(userSearchQuerySchema.safeParse({ q: "a" }).success, false);
  assert.equal(userSearchQuerySchema.safeParse({ q: "%" }).success, false);
  assert.equal(userSearchQuerySchema.safeParse({ q: "ada", limit: 21 }).success, false);
  assert.equal(userSearchQuerySchema.safeParse({ q: "ada", offset: 1001 }).success, false);
  assert.equal(userSearchQuerySchema.parse({ q: "ada" }).limit, 10);
});

test("profile update statement is atomic and fully parameterized", () => {
  const statement = buildUpdateProfileStatement(ownerId, {
    displayName: "Ada Lovelace",
    username: "ada.lovelace",
    bio: "Hello",
    website: "https://example.com",
    location: "London",
  });
  const query = new PgDialect().sqlToQuery(statement);

  assert.match(query.sql, /WITH updated_user AS/);
  assert.match(query.sql, /UPDATE "users"/);
  assert.match(query.sql, /UPDATE "profiles"/);
  assert.match(query.sql, /"location"/);
  assert.deepEqual(query.params, [
    "ada.lovelace",
    ownerId,
    "Ada Lovelace",
    "Hello",
    "https://example.com",
    "London",
  ]);
  assert.ok(!query.sql.includes("ada.lovelace"));
  assert.ok(!query.sql.includes("https://example.com"));

  const empty = new PgDialect().sqlToQuery(
    buildUpdateProfileStatement(ownerId, {
      displayName: "Ada Lovelace",
      username: "ada.lovelace",
      bio: "",
      website: "",
      location: "",
    }),
  );
  assert.deepEqual(empty.params.slice(3), [null, null, null]);
  assert.equal(parseUserId(ownerId), ownerId);
  assert.equal(parseUserId("not-a-uuid"), null);
});

test("follow cursors preserve full timestamp precision", () => {
  const precise = { createdAt: "2026-11-23T10:00:00.123456Z", id: targetId };
  const legacy = { createdAt: "2026-11-23T10:00:00.000Z", id: targetId };

  assert.deepEqual(decodeFollowCursor(encodeFollowCursor(precise)), precise);
  assert.deepEqual(decodeFollowCursor(encodeFollowCursor(legacy)), legacy);
  assert.equal(decodeFollowCursor("not-base64"), null);
  assert.equal(decodeFollowCursor(undefined), null);
  assert.equal(parseListLimit("999"), 12);
  assert.equal(parseListLimit("3"), 3);
  assert.equal(parseListLimit(undefined), 12);
});

test("follow page predicate binds the exact cursor timestamp and stable order", () => {
  const cursor = { createdAt: "2026-11-23T10:00:00.123456Z", id: targetId };
  const dialect = new PgDialect();
  const condition = buildFollowPageCondition(eq(follows.followerId, ownerId), cursor);
  const query = dialect.sqlToQuery(condition);
  const order = dialect.sqlToQuery(buildFollowPageOrder());

  assert.equal(
    query.sql.includes("2026-11-23T10:00:00.123456Z"),
    false,
    "cursor values must remain parameterized",
  );
  assert.match(query.sql, /"created_at" < \$2::timestamptz/);
  assert.match(query.sql, /"created_at" = \$3::timestamptz/);
  assert.match(query.sql, /"id" < \$4/);
  assert.deepEqual(query.params, [ownerId, cursor.createdAt, cursor.createdAt, cursor.id]);
  assert.match(order.sql, /"follows"."created_at" desc/);
  assert.match(order.sql, /"follows"."id" desc/);

  const firstPage = dialect.sqlToQuery(
    buildFollowPageCondition(eq(follows.followerId, ownerId), null),
  );
  assert.deepEqual(firstPage.params, [ownerId]);
});

test("display helpers never render unsafe URLs", () => {
  assert.equal(safeHttpUrl("https://example.com/path"), "https://example.com/path");
  assert.equal(safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpUrl("//evil.example"), null);
  assert.equal(profileInitials("Ada Lovelace"), "AL");
  assert.equal(profileInitials(""), "LU");
});

test("migration is additive and contains the required constraints", () => {
  const migration = readFileSync(
    new URL("../drizzle/0001_high_quentin_quire.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE "follows"/);
  assert.match(migration, /follows_no_self_check/);
  assert.match(migration, /ADD COLUMN "location" text/);
  assert.match(migration, /CREATE UNIQUE INDEX "follows_follower_following_unique"/);
  assert.match(migration, /CREATE INDEX "follows_follower_idx"/);
  assert.match(migration, /CREATE INDEX "follows_following_idx"/);
  assert.match(migration, /ON DELETE cascade/g);
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DELETE FROM/i);
});

test("public profiles stay public while edit is optimistically protected", () => {
  assert.ok(PROTECTED_ROUTE_PREFIXES.includes("/profile/edit"));
  assert.equal(isProtectedRoute("/profile/edit"), true);
  assert.equal(isProtectedRoute("/profile/editor"), false);
  assert.equal(isProtectedRoute("/profile/alice"), false);
  assert.equal(isProtectedRoute("/profile/alice/followers"), false);
});

const integrationEnabled = Boolean(
  process.env.LUMA_DB_INTEGRATION === "1" && process.env.DATABASE_URL,
);

test(
  "real Neon follow constraints (opt-in integration)",
  { skip: integrationEnabled ? false : "Set LUMA_DB_INTEGRATION=1 and DATABASE_URL for a migrated test database" },
  async () => {
    const { neon } = await import("@neondatabase/serverless");
    const db = neon(process.env.DATABASE_URL);
    const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
    const first = randomUUID();
    const second = randomUUID();
    const firstName = `it_${suffix}a`;
    const secondName = `it_${suffix}b`;

    try {
      await db`
        INSERT INTO users (id, auth_user_id, email, username)
        VALUES (${first}, ${randomUUID()}, ${`${firstName}@example.test`}, ${firstName}),
               (${second}, ${randomUUID()}, ${`${secondName}@example.test`}, ${secondName})
      `;
      await db`
        INSERT INTO profiles (user_id, display_name)
        VALUES (${first}, ${"Integration A"}), (${second}, ${"Integration B"})
      `;

      await assert.rejects(
        db`INSERT INTO follows (follower_id, following_id) VALUES (${first}, ${first})`,
        (error) => error?.code === "23514",
      );

      await db`INSERT INTO follows (follower_id, following_id) VALUES (${first}, ${second})`;
      await assert.rejects(
        db`INSERT INTO follows (follower_id, following_id) VALUES (${first}, ${second})`,
        (error) => error?.code === "23505",
      );

      const counts = await db`
        SELECT
          (SELECT count(*)::int FROM follows WHERE follower_id = ${first}) AS following,
          (SELECT count(*)::int FROM follows WHERE following_id = ${second}) AS followers
      `;
      assert.equal(counts[0].following, 1);
      assert.equal(counts[0].followers, 1);

      const removed = await db`
        DELETE FROM follows WHERE follower_id = ${first} AND following_id = ${second} RETURNING id
      `;
      assert.equal(removed.length, 1);
      const repeated = await db`
        DELETE FROM follows WHERE follower_id = ${first} AND following_id = ${second} RETURNING id
      `;
      assert.equal(repeated.length, 0);
    } finally {
      // Only rows created by this test are removed; user deletion cascades.
      await db`DELETE FROM users WHERE id IN (${first}, ${second})`;
    }
  },
);
