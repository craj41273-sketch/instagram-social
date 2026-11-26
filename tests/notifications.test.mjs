import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { PgDialect, getTableConfig } from "drizzle-orm/pg-core";

import { notifications } from "@/lib/db/schema.ts";
import {
  buildFollowNotificationStatement,
  buildMarkAllNotificationsReadStatement,
  buildMarkNotificationReadStatement,
  buildNotificationPageCondition,
  buildPostNotificationStatement,
  buildStoryReactionNotificationStatement,
  buildUpsertNotificationStatement,
} from "@/lib/db/notification-sql.ts";
import { resolveNotificationHref } from "@/lib/notifications/navigation.ts";
import {
  notificationIdSchema,
  notificationPageQuerySchema,
} from "@/lib/validations/notifications.ts";

const recipient = "11111111-1111-4111-8111-111111111111";
const actor = "22222222-2222-4222-8222-222222222222";
const postId = "33333333-3333-4333-8333-333333333333";
const storyId = "44444444-4444-4444-8444-444444444444";
const notificationId = "55555555-5555-4555-8555-555555555555";
const dialect = new PgDialect();

test("notification validation caps paging and requires a UUID id", () => {
  assert.equal(notificationPageQuerySchema.parse({}).limit, 20);
  assert.equal(notificationPageQuerySchema.safeParse({ limit: 41 }).success, false);
  assert.equal(notificationIdSchema.safeParse(notificationId).success, true);
  assert.equal(notificationIdSchema.safeParse("not-a-uuid").success, false);
});

test("notification writes are deduped, self-excluding, and parameterized", () => {
  const query = dialect.sqlToQuery(
    buildUpsertNotificationStatement({
      recipientId: recipient,
      actorId: actor,
      type: "message",
      entityId: postId,
    }),
  );
  assert.match(query.sql, /on conflict \(recipient_id, actor_id, type, entity_id\)/);
  assert.match(query.sql, /do update set created_at = now\(\), read_at = null/);
  assert.match(query.sql, /where \$5::uuid <> \$6::uuid/);
  assert.match(query.sql, /'',/);
  assert.equal(query.sql.includes(postId), false);
  assert.deepEqual(query.params.slice(0, 4), [recipient, actor, "message", postId]);
});

test("guards prevent notices for missing or private interaction targets", () => {
  const follow = dialect.sqlToQuery(buildFollowNotificationStatement(recipient, actor));
  assert.match(follow.sql, /from users u where u\.id/);

  const like = dialect.sqlToQuery(
    buildPostNotificationStatement(recipient, actor, postId, "like"),
  );
  assert.match(like.sql, /p\.user_id = \$8::uuid/);
  assert.ok(like.params.includes(postId));
  assert.ok(like.params.includes(recipient));

  const story = dialect.sqlToQuery(
    buildStoryReactionNotificationStatement(recipient, actor, storyId),
  );
  assert.match(story.sql, /s\.expires_at > now\(\)/);
  assert.match(story.sql, /s\.user_id = \$8::uuid/);
});

test("only the recipient can mark notifications read", () => {
  const one = dialect.sqlToQuery(
    buildMarkNotificationReadStatement(recipient, notificationId),
  );
  assert.match(one.sql, /recipient_id = \$2::uuid/);
  assert.deepEqual(one.params, [notificationId, recipient]);

  const all = dialect.sqlToQuery(buildMarkAllNotificationsReadStatement(recipient));
  assert.match(all.sql, /where recipient_id = \$1::uuid/);
  assert.deepEqual(all.params, [recipient]);
});

test("notification paging is recipient-scoped and keyset bounded", () => {
  const page = dialect.sqlToQuery(
    buildNotificationPageCondition(recipient, {
      createdAt: "2026-11-26T00:00:00.000Z",
      id: notificationId,
    }),
  );
  assert.match(page.sql, /"notifications"\."recipient_id" = \$1/);
  assert.match(page.sql, /"created_at" < \$2::timestamptz/);
  assert.deepEqual(page.params, [
    recipient,
    "2026-11-26T00:00:00.000Z",
    "2026-11-26T00:00:00.000Z",
    notificationId,
  ]);
});

test("navigation links are derived only from validated targets", () => {
  const targets = {
    profiles: new Set(["ada"]),
    posts: new Set([postId]),
    stories: new Map([[storyId, recipient]]),
    conversations: new Set([postId]),
  };

  assert.equal(
    resolveNotificationHref({ type: "follow", entityId: "", actorUsername: "ada" }, targets),
    "/profile/ada",
  );
  assert.equal(
    resolveNotificationHref(
      { type: "like", entityId: postId, actorUsername: "ada" },
      targets,
    ),
    `/post/${postId}`,
  );
  assert.equal(
    resolveNotificationHref(
      { type: "comment", entityId: postId, actorUsername: "ada" },
      targets,
    ),
    `/post/${postId}`,
  );
  assert.equal(
    resolveNotificationHref(
      { type: "story_reaction", entityId: storyId, actorUsername: "ada" },
      targets,
    ),
    `/stories/${recipient}`,
  );
  assert.equal(
    resolveNotificationHref(
      { type: "message", entityId: postId, actorUsername: "ada" },
      targets,
    ),
    `/messages/${postId}`,
  );

  const missing = {
    profiles: new Set(),
    posts: new Set(),
    stories: new Map(),
    conversations: new Set(),
  };
  for (const type of ["follow", "like", "comment", "story_reaction", "message"]) {
    assert.equal(
      resolveNotificationHref(
        { type, entityId: postId, actorUsername: "ada" },
        missing,
      ),
      null,
    );
  }
});

test("schema prevents duplicate notices and stores no private payload", () => {
  const config = getTableConfig(notifications);
  assert.equal(config.name, "notifications");
  assert.ok(
    config.indexes.some(
      (index) =>
        index.config.name === "notifications_recipient_actor_type_entity_unique" &&
        index.config.unique,
    ),
  );
  assert.ok(config.checks.some((check) => check.name === "notifications_type_check"));
  assert.ok(config.checks.some((check) => check.name === "notifications_message_length_check"));
  assert.deepEqual(
    config.columns.map((column) => column.name).sort(),
    [
      "actor_id",
      "created_at",
      "entity_id",
      "id",
      "message",
      "read_at",
      "recipient_id",
      "type",
    ],
  );
  assert.equal(config.foreignKeys.length, 2);
});

test("social actions generate notices but never trust client recipients", () => {
  const follow = readFileSync("app/actions/follows.ts", "utf8");
  const engagement = readFileSync("app/actions/engagement.ts", "utf8");
  const stories = readFileSync("app/actions/stories.ts", "utf8");

  assert.match(follow, /recordFollowNotification\(target\.userId, viewerId\)/);
  assert.match(engagement, /recordPostNotification\(ownerId, current\.user\.id/);
  assert.match(stories, /recordStoryReactionNotification\(ownerId, viewerId/);
  assert.equal(/recipientId: formData/i.test(follow + engagement + stories), false);
});

const integrationEnabled = Boolean(
  process.env.LUMA_DB_INTEGRATION === "1" && process.env.DATABASE_URL,
);

test(
  "real Neon notification dedupe and owner-only reads (opt-in integration)",
  { skip: integrationEnabled ? false : "Set LUMA_DB_INTEGRATION=1 and DATABASE_URL for a migrated test database" },
  async () => {
    const { neon } = await import("@neondatabase/serverless");
    const db = neon(process.env.DATABASE_URL);
    const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
    const owner = randomUUID();
    const actor = randomUUID();
    const noticeId = randomUUID();

    try {
      await db`
        INSERT INTO users (id, auth_user_id, email, username)
        VALUES (${owner}, ${randomUUID()}, ${`${suffix}a@example.test`}, ${`it_${suffix}a`}),
               (${actor}, ${randomUUID()}, ${`${suffix}b@example.test`}, ${`it_${suffix}b`})
      `;
      await db`
        INSERT INTO notifications (id, recipient_id, actor_id, type)
        VALUES (${noticeId}, ${owner}, ${actor}, ${"follow"})
      `;
      const duplicate = await db`
        INSERT INTO notifications (recipient_id, actor_id, type)
        VALUES (${owner}, ${actor}, ${"follow"})
        ON CONFLICT (recipient_id, actor_id, type, entity_id) DO NOTHING
        RETURNING id
      `;
      assert.equal(duplicate.length, 0);

      const wrongOwner = await db`
        UPDATE notifications SET read_at = now()
        WHERE id = ${noticeId} AND recipient_id = ${actor} RETURNING id
      `;
      assert.equal(wrongOwner.length, 0);
      const rightOwner = await db`
        UPDATE notifications SET read_at = now()
        WHERE id = ${noticeId} AND recipient_id = ${owner} RETURNING id
      `;
      assert.equal(rightOwner.length, 1);

      const stored = await db`SELECT message FROM notifications WHERE id = ${noticeId}`;
      assert.equal(stored[0].message, "");
    } finally {
      await db`DELETE FROM users WHERE id IN (${owner}, ${actor})`;
    }
  },
);
