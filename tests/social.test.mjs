import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { eq, sql } from "drizzle-orm";
import { PgDialect, getTableConfig } from "drizzle-orm/pg-core";

import {
  follows,
  postHashtags,
  postMedia,
  posts,
  profiles,
  users,
} from "@/lib/db/schema.ts";
import {
  buildFollowPageCondition,
  buildFollowPageOrder,
} from "@/lib/db/follow-query.ts";
import {
  buildPostPageCondition,
  buildPostPageOrder,
} from "@/lib/db/post-query.ts";
import {
  buildUpdateProfileImageStatement,
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
  decodePageCursor,
  encodePageCursor,
  parseListLimit,
} from "@/lib/pagination.ts";
import { captionParts, formatPostTimestamp } from "@/lib/posts/format.ts";
import { extractHashtags } from "@/lib/posts/hashtags.ts";
import { profileInitials, safeHttpUrl } from "@/lib/profile/format.ts";
import { isSameOriginPost } from "@/lib/security/request-origin.ts";
import {
  assertImageBytes,
  detectImageMime,
  validateImageMetadata,
} from "@/lib/storage/image-validation.ts";
import {
  buildPostMediaPath,
  buildProfileImagePath,
  storageObjectKey,
  storagePathOwner,
} from "@/lib/storage/paths.ts";
import {
  editProfileSchema,
  followActionSchema,
  userSearchQuerySchema,
} from "@/lib/validations/profile.ts";
import {
  createPostInputSchema,
  editPostSchema,
  postFeedQuerySchema,
  postMediaMetaListSchema,
} from "@/lib/validations/post.ts";

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

test("posts and media tables enforce ownership, cascade deletes, and stable order", () => {
  const postConfig = getTableConfig(posts);
  const mediaConfig = getTableConfig(postMedia);
  const tagConfig = getTableConfig(postHashtags);

  assert.equal(postConfig.name, "posts");
  assert.ok(postConfig.columns.some((column) => column.name === "caption"));
  assert.ok(postConfig.checks.some((item) => item.name === "posts_caption_length_check"));
  assert.equal(postConfig.foreignKeys.length, 1);
  assert.equal(postConfig.foreignKeys[0].onDelete, "cascade");
  assert.ok(postConfig.indexes.some((item) => item.config.name === "posts_user_created_idx"));

  assert.equal(mediaConfig.name, "post_media");
  assert.deepEqual(
    mediaConfig.columns.map((column) => column.name).sort(),
    [
      "alt_text",
      "byte_size",
      "created_at",
      "height",
      "id",
      "mime_type",
      "position",
      "post_id",
      "public_url",
      "storage_path",
      "width",
    ],
  );
  assert.equal(mediaConfig.foreignKeys[0].onDelete, "cascade");
  const mediaIndexes = new Map(mediaConfig.indexes.map((item) => [item.config.name, item.config]));
  assert.equal(mediaIndexes.get("post_media_storage_path_unique")?.unique, true);
  assert.deepEqual(
    mediaIndexes.get("post_media_post_position_unique")?.columns.map((column) => column.name),
    ["post_id", "position"],
  );
  assert.equal(mediaIndexes.get("post_media_post_position_unique")?.unique, true);
  assert.ok(mediaConfig.checks.some((item) => item.name === "post_media_position_check"));
  assert.ok(mediaConfig.checks.some((item) => item.name === "post_media_byte_size_check"));

  assert.equal(tagConfig.name, "post_hashtags");
  assert.equal(tagConfig.foreignKeys[0].onDelete, "cascade");
  assert.ok(tagConfig.checks.some((item) => item.name === "post_hashtags_tag_format_check"));
});

test("post feed validation rejects client-supplied ownership and oversized media", () => {
  const created = createPostInputSchema.parse({
    caption: "  Sunset #Photo  ",
    userId: ownerId,
    authorId: ownerId,
    media: [
      {
        storagePath: `${ownerId}/posts/post.jpg`,
        publicUrl: "https://example.supabase.co/storage/v1/object/public/post-media/post.jpg",
        mimeType: "image/jpeg",
        byteSize: 1024,
        position: 0,
      },
    ],
  });

  assert.equal(created.caption, "Sunset #Photo");
  assert.equal(Object.hasOwn(created, "userId"), false);
  assert.equal(Object.hasOwn(created, "authorId"), false);

  assert.equal(
    createPostInputSchema.safeParse({ caption: "x", media: [] }).success,
    false,
  );
  assert.equal(
    createPostInputSchema.safeParse({
      caption: "x",
      media: [
        {
          storagePath: "a/b.jpg",
          publicUrl: "http://insecure.example/b.jpg",
          mimeType: "image/jpeg",
          byteSize: 1,
          position: 0,
        },
      ],
    }).success,
    false,
  );
  assert.equal(editPostSchema.safeParse({ postId: "bad", caption: "x" }).success, false);
});

test("hashtags are normalized, bounded, and deduplicated", () => {
  assert.deepEqual(
    extractHashtags("Hello #Sunset and #sunset, then #Luma_2026! #a #b #c #d #e #f #g #h #i #j #k"),
    ["sunset", "luma_2026", "a", "b", "c", "d", "e", "f", "g", "h"],
  );
  assert.deepEqual(extractHashtags("email me at a@b.com #nope%"), []);
});

test("post captions render only normalized hashtags", () => {
  assert.deepEqual(captionParts("Hi #Sunset!"), [
    { text: "Hi ", tag: null },
    { text: "#Sunset", tag: "sunset" },
    { text: "!", tag: null },
  ]);
  assert.equal(formatPostTimestamp("not-a-date"), "Unknown date");
  assert.match(formatPostTimestamp("2026-11-24T12:34:56Z"), /Nov 24, 2026 · 12:34 PM UTC/);
});

test("post uploads require a same-origin browser request", () => {
  assert.equal(isSameOriginPost("https://luma.example", "https://luma.example"), true);
  assert.equal(isSameOriginPost("https://luma.example:443", "https://luma.example"), true);
  assert.equal(isSameOriginPost("https://evil.example", "https://luma.example"), false);
  assert.equal(isSameOriginPost("null", "https://luma.example"), false);
  assert.equal(isSameOriginPost(null, "https://luma.example"), false);
});

test("post media hints and feed filters stay bounded", () => {
  assert.equal(
    postMediaMetaListSchema.safeParse([{ width: 1200, height: 800, altText: "Sunset" }]).success,
    true,
  );
  assert.equal(postMediaMetaListSchema.safeParse([{ width: 20_001 }]).success, false);
  assert.equal(
    postMediaMetaListSchema.safeParse(Array.from({ length: 11 }, () => ({}))).success,
    false,
  );
  assert.equal(postFeedQuerySchema.parse({ tag: "Sunset" }).tag, "sunset");
  assert.equal(postFeedQuerySchema.safeParse({ tag: "bad tag" }).success, false);
});

test("image validation checks declared type, magic bytes, and size", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);
  assert.equal(detectImageMime(png), "image/png");
  assert.equal(detectImageMime(new Uint8Array([1, 2, 3])), null);
  assert.throws(
    () => assertImageBytes(png, "image/jpeg", 10),
    /do not match/,
  );
  assert.throws(
    () => validateImageMetadata({ name: "a.png", type: "text/html", size: 10 }, 100),
    /JPEG, PNG, WebP, or GIF/,
  );
  assert.throws(
    () => validateImageMetadata({ name: "a.png", type: "image/png", size: 101 }, 100),
    /size limit/,
  );
  const valid = validateImageMetadata({ name: "a.png", type: "image/png", size: 10 }, 100);
  assert.equal(valid.extension, "png");
});

test("storage paths stay inside the authenticated owner prefix", () => {
  assert.equal(storageObjectKey(["/alice/..//b/", "c.jpg"]), "alice/b/c.jpg");
  assert.equal(buildProfileImagePath(ownerId, "avatar"), `${ownerId}/profile/avatar`);
  assert.equal(buildProfileImagePath(ownerId, "cover"), `${ownerId}/profile/cover`);
  const mediaPath = buildPostMediaPath(ownerId, targetId, 2, "abc", "png");
  assert.equal(mediaPath, `${ownerId}/posts/${targetId}/2-abc.png`);
  assert.equal(storagePathOwner(mediaPath), ownerId);
});

test("post cursors keep full timestamp precision and bind tag filters", () => {
  const cursor = { createdAt: "2026-11-23T10:00:00.123456Z", id: targetId };
  assert.deepEqual(decodePageCursor(encodePageCursor(cursor)), cursor);

  const dialect = new PgDialect();
  const condition = dialect.sqlToQuery(buildPostPageCondition(sql`true`, cursor, "sunset"));
  assert.equal(condition.sql.includes("sunset"), false);
  assert.deepEqual(condition.params, [
    "sunset",
    cursor.createdAt,
    cursor.createdAt,
    cursor.id,
  ]);
  assert.match(condition.sql, /post_hashtags/);
  const order = dialect.sqlToQuery(buildPostPageOrder());
  assert.match(order.sql, /"posts"."created_at" desc/);
  assert.match(order.sql, /"posts"."id" desc/);
});

test("profile image updates are owner-scoped and fully parameterized", () => {
  const avatar = new PgDialect().sqlToQuery(
    buildUpdateProfileImageStatement(ownerId, "avatar", "https://cdn.example/a.png"),
  );
  const cover = new PgDialect().sqlToQuery(
    buildUpdateProfileImageStatement(ownerId, "cover", "https://cdn.example/c.png"),
  );

  assert.match(avatar.sql, /"avatar_url"/);
  assert.doesNotMatch(avatar.sql, /"cover_url"/);
  assert.deepEqual(avatar.params, ["https://cdn.example/a.png", ownerId]);
  assert.match(cover.sql, /"cover_url"/);
  assert.equal(avatar.sql.includes("https://cdn.example/a.png"), false);
});

test("media migrations are additive and contain ownership constraints", () => {
  const postMigration = readFileSync(
    new URL("../drizzle/0002_posts_media.sql", import.meta.url),
    "utf8",
  );
  const tagMigration = readFileSync(
    new URL("../drizzle/0003_post_hashtags.sql", import.meta.url),
    "utf8",
  );

  for (const migration of [postMigration, tagMigration]) {
    assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DELETE FROM/i);
  }
  assert.match(postMigration, /CREATE TABLE "posts"/);
  assert.match(postMigration, /CREATE TABLE "post_media"/);
  assert.match(postMigration, /posts_user_id_users_id_fk.*ON DELETE cascade/s);
  assert.match(postMigration, /post_media_post_id_posts_id_fk.*ON DELETE cascade/s);
  assert.match(postMigration, /CREATE UNIQUE INDEX "post_media_post_position_unique"/);
  assert.match(tagMigration, /CREATE TABLE "post_hashtags"/);
  assert.match(tagMigration, /post_hashtags_post_tag_unique/);
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
