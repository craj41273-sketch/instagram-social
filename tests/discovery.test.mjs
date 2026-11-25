import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { PgDialect, getTableConfig } from "drizzle-orm/pg-core";

import {
  buildPeopleSearchCondition,
  buildPostSearchCondition,
  buildSuggestedUsersCondition,
  buildTrendingCondition,
} from "@/lib/db/discovery-query.ts";
import { posts, profiles, users } from "@/lib/db/schema.ts";
import { containsPattern, escapeLike } from "@/lib/discovery/search.ts";
import { rankTrendingPosts, scoreTrendingPost } from "@/lib/discovery/ranking.ts";
import {
  discoveryQuerySchema,
  searchRequestSchema,
} from "@/lib/validations/discovery.ts";

const ownerId = "11111111-1111-4111-8111-111111111111";
const targetId = "22222222-2222-4222-8222-222222222222";
const now = Date.parse("2026-11-25T12:00:00.000Z");

test("global search validation normalizes input and caps abuse", () => {
  assert.deepEqual(discoveryQuerySchema.parse({ q: "  Ada Lovelace  " }), {
    q: "ada lovelace",
    limit: 12,
    offset: 0,
  });
  assert.equal(discoveryQuerySchema.safeParse({ q: "a" }).success, false);
  assert.equal(discoveryQuerySchema.safeParse({ q: "%ada%" }).success, false);
  assert.equal(discoveryQuerySchema.safeParse({ q: "a'b" }).success, true);
  assert.equal(discoveryQuerySchema.safeParse({ q: "ada", limit: 21 }).success, false);
  assert.equal(discoveryQuerySchema.safeParse({ q: "ada", offset: 1_001 }).success, false);
  assert.equal(discoveryQuerySchema.safeParse({ q: "x".repeat(51) }).success, false);

  assert.deepEqual(searchRequestSchema.parse({ q: "sunset" }).tab, "all");
  assert.equal(searchRequestSchema.parse({ q: "sunset", tab: "posts" }).tab, "posts");
  assert.equal(searchRequestSchema.safeParse({ q: "sunset", tab: "stories" }).success, false);
});

test("LIKE wildcards stay literal and search text stays parameterized", () => {
  assert.equal(escapeLike("a%b_c\\d"), "a\\%b\\_c\\\\d");
  assert.equal(containsPattern("a_b"), "%a\\_b%");

  const dialect = new PgDialect();
  const people = dialect.sqlToQuery(buildPeopleSearchCondition("ada lovelace"));
  assert.match(people.sql, /"users"\."username"/);
  assert.match(people.sql, /"profiles"\."display_name"/);
  assert.match(people.sql, /ESCAPE E'\\\\'/);
  assert.equal(people.sql.includes("ada lovelace"), false);
  assert.deepEqual(people.params, ["%ada lovelace%", "%ada lovelace%"]);

  const postsQuery = dialect.sqlToQuery(buildPostSearchCondition("a_b"));
  assert.match(postsQuery.sql, /"posts"\."caption"/);
  assert.equal(postsQuery.sql.includes("a_b"), false);
  assert.deepEqual(postsQuery.params, ["%a\\_b%"]);

  const trending = dialect.sqlToQuery(buildTrendingCondition());
  assert.match(trending.sql, /"posts"\."created_at"/);
  assert.equal(trending.sql.includes("30"), false);
  assert.deepEqual(trending.params, [30]);
});

test("discover people excludes the current user and existing follows", () => {
  const query = new PgDialect().sqlToQuery(buildSuggestedUsersCondition(ownerId));
  assert.match(query.sql, /"users"\."id" <>/);
  assert.match(query.sql, /not exists/);
  assert.match(query.sql, /"follows"/);
  assert.equal(query.sql.includes(ownerId), false);
  assert.deepEqual(query.params, [ownerId, ownerId]);
});

test("trending ranks recent real engagement above older high totals", () => {
  const fresh = {
    postId: ownerId,
    likeCount: 5,
    commentCount: 2,
    createdAt: "2026-11-25T11:00:00.000Z",
  };
  const stale = {
    postId: targetId,
    likeCount: 100,
    commentCount: 0,
    createdAt: "2026-10-26T12:00:00.000Z",
  };

  assert.equal(scoreTrendingPost(fresh, now)?.rawScore, 19 / 3);
  const ranked = rankTrendingPosts([stale, fresh], 2, now);
  assert.deepEqual(
    ranked.map((item) => item.postId),
    [ownerId, targetId],
  );
  assert.equal(ranked[0]?.score, 6.33);
  assert.equal(ranked[0]?.ageHours, 1);
});

test("trending excludes zero engagement, future posts, and over-limit rows", () => {
  const candidates = Array.from({ length: 5 }, (_, index) => ({
    postId: `${index}-1111-4111-8111-111111111111`,
    likeCount: index + 1,
    commentCount: 0,
    createdAt: "2026-11-25T11:00:00.000Z",
  }));

  assert.equal(
    rankTrendingPosts(
      [{ postId: ownerId, likeCount: 0, commentCount: 0, createdAt: "2026-11-25T11:00:00.000Z" }],
      6,
      now,
    ).length,
    0,
  );
  assert.equal(
    rankTrendingPosts(
      [{ postId: ownerId, likeCount: 4, commentCount: 0, createdAt: "2026-11-26T11:00:00.000Z" }],
      6,
      now,
    ).length,
    0,
  );
  assert.equal(rankTrendingPosts(candidates, 2, now).length, 2);
});

test("search indexes are additive trigram indexes on real text columns", () => {
  const expectations = [
    [users, "users_username_trgm_idx"],
    [profiles, "profiles_display_name_trgm_idx"],
    [posts, "posts_caption_trgm_idx"],
  ];

  for (const [table, name] of expectations) {
    const index = getTableConfig(table).indexes.find((item) => item.config.name === name);
    assert.ok(index, `${name} must exist`);
    assert.equal(index.config.method, "gin");
  }

  const migration = readFileSync(
    new URL("../drizzle/0005_spooky_mach_iv.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /CREATE EXTENSION IF NOT EXISTS pg_trgm/);
  assert.match(migration, /users_username_trgm_idx/);
  assert.match(migration, /profiles_display_name_trgm_idx/);
  assert.match(migration, /posts_caption_trgm_idx/);
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DELETE FROM|ALTER COLUMN/i);
});

test("discovery views reuse existing post access and secure follow actions", () => {
  const grid = readFileSync(
    new URL("../components/discovery/explore-grid.tsx", import.meta.url),
    "utf8",
  );
  const detail = readFileSync(
    new URL("../app/(social)/post/[postId]/page.tsx", import.meta.url),
    "utf8",
  );
  const search = readFileSync(
    new URL("../components/discovery/search-experience.tsx", import.meta.url),
    "utf8",
  );

  assert.ok(grid.includes('href={`/post/${post.id}`}'));
  assert.match(grid, /page\.nextCursor/);
  assert.match(detail, /getPublicPostById/);
  assert.match(search, /FollowButton/);
  assert.match(search, /targetUsername=\{person\.username\}/);
  assert.match(search, /DEBOUNCE_MS = 300/);
});
