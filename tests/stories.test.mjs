import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { PgDialect, getTableConfig } from "drizzle-orm/pg-core";

import {
  stories,
  storyReactions,
  storyViews,
} from "@/lib/db/schema.ts";
import {
  buildOwnedStoryCondition,
  buildStoryVisibilityCondition,
} from "@/lib/db/story-query.ts";
import {
  buildRecordStoryViewStatement,
  buildRemoveStoryReactionStatement,
  buildSetStoryReactionStatement,
} from "@/lib/db/story-sql.ts";
import {
  nextStoryExpiration,
  STORY_TTL_MS,
  STORY_REACTIONS,
} from "@/lib/stories/constants.ts";
import { buildStoryMediaPath, storagePathOwner } from "@/lib/storage/paths.ts";
import {
  assertImageBytes,
  detectImageMime,
} from "@/lib/storage/image-validation.ts";
import {
  storyCreateInputSchema,
  storyReactionSchema,
} from "@/lib/validations/story.ts";

const storyId = "11111111-1111-4111-8111-111111111111";
const viewerId = "22222222-2222-4222-8222-222222222222";
const ownerAuthId = "33333333-3333-4333-8333-333333333333";
const nowIso = "2026-11-26T00:00:00.000Z";
const dialect = new PgDialect();

test("Block 9 story schema is additive, indexed, and ownership-safe", () => {
  const config = getTableConfig(stories);
  assert.equal(config.name, "stories");

  assert.deepEqual(
    config.columns.map((column) => column.name).sort(),
    [
      "byte_size",
      "caption",
      "created_at",
      "expires_at",
      "id",
      "media_type",
      "media_url",
      "storage_path",
      "text_overlay",
      "user_id",
    ],
  );

  const indexes = new Map(config.indexes.map((item) => [item.config.name, item.config]));
  assert.equal(indexes.get("stories_storage_path_unique")?.unique, true);
  assert.equal(indexes.get("stories_user_id_idx")?.unique, false);
  assert.equal(indexes.get("stories_created_at_idx")?.unique, false);
  assert.equal(indexes.get("stories_expires_at_idx")?.unique, false);
  assert.deepEqual(
    indexes.get("stories_user_expires_created_idx")?.columns.map((column) => column.name),
    ["user_id", "expires_at", "created_at"],
  );

  const checks = new Set(config.checks.map((item) => item.name));
  for (const name of [
    "stories_media_type_check",
    "stories_byte_size_check",
    "stories_caption_length_check",
    "stories_text_overlay_length_check",
    "stories_expires_after_created_check",
  ]) {
    assert.ok(checks.has(name), name);
  }

  assert.equal(config.foreignKeys.length, 1);
  assert.equal(config.foreignKeys[0]?.onDelete, "cascade");
});

test("story views and reactions enforce unique viewer/reactor relationships", () => {
  const viewConfig = getTableConfig(storyViews);
  const reactionConfig = getTableConfig(storyReactions);

  const viewIndexes = new Map(
    viewConfig.indexes.map((item) => [item.config.name, item.config]),
  );
  assert.deepEqual(
    viewIndexes.get("story_views_story_viewer_unique")?.columns.map((column) => column.name),
    ["story_id", "viewer_id"],
  );
  assert.equal(viewIndexes.get("story_views_story_viewer_unique")?.unique, true);
  assert.equal(viewIndexes.get("story_views_story_idx")?.unique, false);
  assert.equal(viewIndexes.get("story_views_viewer_idx")?.unique, false);
  assert.equal(viewConfig.foreignKeys.length, 2);

  const reactionIndexes = new Map(
    reactionConfig.indexes.map((item) => [item.config.name, item.config]),
  );
  assert.deepEqual(
    reactionIndexes
      .get("story_reactions_story_user_unique")
      ?.columns.map((column) => column.name),
    ["story_id", "user_id"],
  );
  assert.equal(reactionIndexes.get("story_reactions_story_user_unique")?.unique, true);
  assert.ok(
    reactionConfig.checks.some((item) => item.name === "story_reactions_emoji_check"),
  );
  assert.equal(reactionConfig.foreignKeys.length, 2);
  for (const key of reactionConfig.foreignKeys) assert.equal(key.onDelete, "cascade");
});

test("story input rejects client identity, expiry, and invalid reactions", () => {
  const parsed = storyCreateInputSchema.parse({
    caption: "  A quiet evening  ",
    textOverlay: "  Golden hour  ",
    mediaMeta: { width: 1080, height: 1920 },
    mimeType: "image/jpeg",
    userId: viewerId,
    expiresAt: "2099-01-01T00:00:00.000Z",
  });

  assert.deepEqual(parsed, {
    caption: "A quiet evening",
    textOverlay: "Golden hour",
    mediaMeta: { width: 1080, height: 1920 },
    mimeType: "image/jpeg",
  });
  assert.equal("userId" in parsed, false);
  assert.equal("expiresAt" in parsed, false);

  assert.equal(storyCreateInputSchema.safeParse({ mimeType: "video/mp4" }).success, false);
  assert.equal(
    storyCreateInputSchema.safeParse({ mimeType: "image/png", caption: "x".repeat(501) })
      .success,
    false,
  );
  assert.equal(
    storyCreateInputSchema.safeParse({ mimeType: "image/png", textOverlay: "x".repeat(121) })
      .success,
    false,
  );

  assert.deepEqual(
    storyReactionSchema.parse({ storyId, emoji: "🔥", userId: ownerAuthId }),
    { storyId, emoji: "🔥" },
  );
  assert.equal(storyReactionSchema.safeParse({ storyId, emoji: "💩" }).success, false);
  assert.equal(storyReactionSchema.safeParse({ storyId, emoji: null }).success, true);
  assert.deepEqual(STORY_REACTIONS, ["❤️", "😂", "😮", "🔥", "👏"]);
});

test("expiration is always server-derived at exactly 24 hours", () => {
  const now = new Date("2026-11-26T00:00:00.000Z");
  const expires = nextStoryExpiration(now);

  assert.equal(STORY_TTL_MS, 86_400_000);
  assert.equal(expires.toISOString(), "2026-11-27T00:00:00.000Z");
  assert.ok(expires.getTime() > now.getTime());
});

test("active story visibility filters expiry and requires own/followed access", () => {
  const condition = buildStoryVisibilityCondition(viewerId, nowIso);
  const query = dialect.sqlToQuery(condition);

  assert.match(query.sql, /"stories"\."expires_at" > \$1::timestamptz/);
  assert.match(query.sql, /"stories"\."user_id" = \$2/);
  assert.match(query.sql, /"follows"\."follower_id" = \$3/);
  assert.deepEqual(query.params.slice(0, 3), [nowIso, viewerId, viewerId]);
  assert.equal(query.sql.includes(nowIso), false, "expiry must be parameterized");
  assert.match(query.sql, /EXISTS/);

  const targeted = dialect.sqlToQuery(
    buildStoryVisibilityCondition(viewerId, nowIso, storyId),
  );
  assert.ok(targeted.params.includes(storyId));
  assert.match(targeted.sql, /"stories"\."user_id" = \$4/);
});

test("owned-story predicate prevents viewer-list and delete access by other users", () => {
  const query = dialect.sqlToQuery(buildOwnedStoryCondition(storyId, viewerId));
  assert.match(query.sql, /"stories"\."id" = \$1/);
  assert.match(query.sql, /"stories"\."user_id" = \$2/);
  assert.deepEqual(query.params, [storyId, viewerId]);
});

test("view write is unique, owner-excluding, and rechecks active visibility", () => {
  const query = dialect.sqlToQuery(
    buildRecordStoryViewStatement(storyId, viewerId, nowIso),
  );

  assert.match(query.sql, /INSERT INTO "story_views"/);
  assert.match(query.sql, /"stories"\."expires_at" > \$4::timestamptz/);
  assert.match(query.sql, /"stories"\."user_id" <> \$7/);
  assert.match(query.sql, /ON CONFLICT \(story_id, viewer_id\) DO NOTHING/);
  assert.match(query.sql, /EXISTS/);
  assert.equal(query.sql.includes(viewerId), false, "identity must be parameterized");
});

test("reaction upsert validates visibility and removal is scoped to the reactor", () => {
  const setQuery = dialect.sqlToQuery(
    buildSetStoryReactionStatement(storyId, viewerId, "🔥", nowIso),
  );
  assert.match(setQuery.sql, /ON CONFLICT \(story_id, user_id\) DO UPDATE/);
  assert.match(setQuery.sql, /SET emoji = excluded\.emoji/);
  assert.match(setQuery.sql, /"stories"\."expires_at" > \$6::timestamptz/);
  assert.equal(setQuery.params.includes("🔥"), true);

  const removeQuery = dialect.sqlToQuery(
    buildRemoveStoryReactionStatement(storyId, viewerId),
  );
  assert.match(removeQuery.sql, /DELETE FROM "story_reactions"/);
  assert.match(removeQuery.sql, /story_id = \$1 AND user_id = \$2/);
  assert.deepEqual(removeQuery.params, [storyId, viewerId]);
});

test("story storage keys stay under the authenticated owner prefix", () => {
  const path = buildStoryMediaPath(ownerAuthId, storyId, "png");
  assert.equal(path, `${ownerAuthId}/stories/${storyId}.png`);
  assert.equal(storagePathOwner(path), ownerAuthId);

  const malicious = buildStoryMediaPath(`${ownerAuthId}/../../other`, storyId, "jpg");
  assert.equal(storagePathOwner(malicious), ownerAuthId);
  assert.ok(!malicious.includes(".."));
});

test("story image validation rejects forged or oversized files", () => {
  const png = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
  ]);
  assert.equal(detectImageMime(png), "image/png");
  assert.doesNotThrow(() => assertImageBytes(png, "image/png", 10 * 1024 * 1024));
  assert.throws(() => assertImageBytes(png, "image/jpeg", 10 * 1024 * 1024));
  assert.throws(() => assertImageBytes(png, "image/png", 4));
});

test("story routes use session identity and never accept expiry from a form", () => {
  const uploadRoute = readFileSync("app/api/stories/route.ts", "utf8");
  const createForm = readFileSync("components/stories/story-create-form.tsx", "utf8");
  const actions = readFileSync("app/actions/stories.ts", "utf8");
  const migration = readFileSync("drizzle/0006_stories.sql", "utf8");

  assert.match(uploadRoute, /getCurrentProfile\(\)/);
  assert.match(uploadRoute, /isSameOriginPost\(/);
  assert.equal(uploadRoute.includes('formData.get("expiresAt")'), false);
  assert.equal(uploadRoute.includes("SUPABASE_SERVICE_ROLE_KEY"), false);

  assert.match(createForm, /new XMLHttpRequest\(\)/);
  assert.match(createForm, /\/api\/stories/);
  assert.equal(createForm.includes('formData.set("expiresAt"'), false);
  assert.equal(createForm.includes('formData.set("userId"'), false);

  assert.match(actions, /deleteOwnedStory\(/);
  assert.match(actions, /storagePathOwner\(storagePath\)/);

  assert.match(migration, /DEFAULT now\(\) \+ interval '24 hours'/);
  assert.match(migration, /story_views_story_viewer_unique/);
  assert.match(migration, /story_reactions_story_user_unique/);
  assert.equal(migration.includes("DROP TABLE"), false);
});
