import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { PgDialect, getTableConfig } from "drizzle-orm/pg-core";

import {
  conversations,
  conversationParticipants,
  messages,
  notifications,
  users,
} from "@/lib/db/schema.ts";
import {
  buildConversationAccessCondition,
  buildCreateConversationStatement,
  buildInboxCondition,
  buildLiveMessageCondition,
  buildMarkConversationReadStatement,
  buildMessagePageCondition,
  buildPairKey,
  buildSendMessageStatement,
  buildUnreadMessageCondition,
} from "@/lib/db/messaging-sql.ts";
import {
  conversationChannel,
  REALTIME_EVENTS,
  userChannel,
} from "@/lib/messaging/constants.ts";
import {
  inboxPageQuerySchema,
  messageContentSchema,
  messagePageQuerySchema,
  sendMessageSchema,
} from "@/lib/validations/messaging.ts";

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
const conversationId = "33333333-3333-4333-8333-333333333333";
const clientId = "44444444-4444-4444-8444-444444444444";
const dialect = new PgDialect();

test("one-to-one pair keys are stable and independent of click order", () => {
  assert.equal(buildPairKey(second, first), buildPairKey(first, second));
  assert.equal(buildPairKey(first, second), `${first}:${second}`);
  assert.equal(
    dialect.sqlToQuery(buildCreateConversationStatement(first, "  Ada ")).params[0],
    "  Ada ",
  );
});

test("message validation rejects empty, oversized, extra, and forged fields", () => {
  assert.equal(messageContentSchema.parse("  hello  "), "hello");
  assert.equal(messageContentSchema.safeParse("").success, false);
  assert.equal(messageContentSchema.safeParse("x".repeat(4001)).success, false);
  assert.equal(
    sendMessageSchema.safeParse({ content: "hi", clientId }).success,
    true,
  );
  assert.equal(
    sendMessageSchema.safeParse({ content: "hi", clientId, senderId: second }).success,
    false,
  );
  assert.equal(sendMessageSchema.safeParse({ content: "hi" }).success, false);

  assert.equal(messagePageQuerySchema.parse({}).limit, 20);
  assert.equal(messagePageQuerySchema.safeParse({ limit: 41 }).success, false);
  assert.equal(inboxPageQuerySchema.parse({}).limit, 12);
  assert.equal(inboxPageQuerySchema.safeParse({ limit: 25 }).success, false);
});

test("conversation creation is parameterized, self-excluding, and conflict-safe", () => {
  const query = dialect.sqlToQuery(buildCreateConversationStatement(first, "ada"));
  assert.match(query.sql, /lower\(u\.username\) = \$1/);
  assert.match(query.sql, /u\.id <> \$2::uuid/);
  assert.match(query.sql, /on conflict \(pair_key\) do nothing/);
  assert.match(query.sql, /on conflict \(conversation_id, user_id\) do nothing/);
  assert.match(query.sql, /least\(\$3::text/);
  assert.equal(query.sql.includes("ada"), false);
  assert.deepEqual(query.params.slice(0, 2), ["ada", first]);
});

test("message reads require membership and stable keyset paging", () => {
  const access = dialect.sqlToQuery(
    buildConversationAccessCondition(first, conversationId),
  );
  assert.match(access.sql, /conversation_participants/);
  assert.match(access.sql, /cp\.user_id = \$2/);
  assert.deepEqual(access.params, [conversationId, first]);

  const inbox = dialect.sqlToQuery(
    buildInboxCondition(first, {
      createdAt: "2026-11-26T00:00:00.000Z",
      id: conversationId,
    }),
  );
  assert.match(inbox.sql, /"last_message_at" < \$1::timestamptz/);
  assert.deepEqual(inbox.params[0], "2026-11-26T00:00:00.000Z");

  const page = dialect.sqlToQuery(
    buildMessagePageCondition(conversationId, first, null),
  );
  assert.match(page.sql, /m\.conversation_id = \$1/);
  assert.match(page.sql, /cp\.user_id = \$2/);
  assert.deepEqual(page.params, [conversationId, first]);
});

test("unread counts exclude own and deleted messages after the read mark", () => {
  const query = dialect.sqlToQuery(buildUnreadMessageCondition(first));
  assert.match(query.sql, /m\.deleted_at is null/);
  assert.match(query.sql, /m\.sender_id <> \$1/);
  assert.match(query.sql, /coalesce\(cp\.last_read_at, cp\.joined_at\)/);
  assert.deepEqual(query.params, [first]);

  const live = dialect.sqlToQuery(buildLiveMessageCondition());
  assert.match(live.sql, /"deleted_at" is null/);
});

test("send is one atomic statement with idempotency, membership, and no notice text", () => {
  const content = "private message text";
  const query = dialect.sqlToQuery(
    buildSendMessageStatement({
      conversationId,
      senderId: first,
      clientId,
      content,
    }),
  );
  assert.match(query.sql, /on conflict \(sender_id, client_id\) do nothing/);
  assert.match(query.sql, /where cp\.conversation_id = \$1/);
  assert.match(query.sql, /insert into notifications/);
  assert.match(query.sql, /other\.user_id <> \$13::uuid/);
  assert.match(query.sql, /'message'/);
  assert.match(query.sql, /entity_id/);
  assert.match(query.sql, /greatest\(c\.last_message_at, m\.created_at\)/);
  assert.match(query.sql, /cross join inserted m/);
  assert.equal(query.sql.includes("exists (select 1 from notified)"), false);
  assert.equal(query.sql.includes(content), false);
  assert.equal(query.sql.includes("'',"), true);
  assert.ok(query.params.includes(content));
  assert.ok(query.params.includes(clientId));
});

test("read updates only the caller's participant row and clears their notice", () => {
  const query = dialect.sqlToQuery(
    buildMarkConversationReadStatement(first, conversationId),
  );
  assert.match(query.sql, /set last_read_at = now\(\)/);
  assert.match(query.sql, /where conversation_id = \$1::uuid/);
  assert.match(query.sql, /and user_id = \$2::uuid/);
  assert.match(query.sql, /recipient_id = \$3::uuid/);
  assert.match(query.sql, /type = 'message'/);
  assert.deepEqual(query.params.slice(0, 3), [conversationId, first, first]);
});

test("Block 10 schema enforces uniqueness, length, and cascading ownership", () => {
  const conversationConfig = getTableConfig(conversations);
  const participantConfig = getTableConfig(conversationParticipants);
  const messageConfig = getTableConfig(messages);
  const notificationConfig = getTableConfig(notifications);

  assert.ok(
    conversationConfig.indexes.some(
      (index) => index.config.name === "conversations_pair_key_unique" && index.config.unique,
    ),
  );
  assert.ok(
    participantConfig.indexes.some(
      (index) => index.config.name === "conversation_participants_conversation_user_unique" && index.config.unique,
    ),
  );
  assert.ok(
    messageConfig.indexes.some(
      (index) => index.config.name === "messages_sender_client_unique" && index.config.unique,
    ),
  );
  assert.ok(
    notificationConfig.indexes.some(
      (index) => index.config.name === "notifications_recipient_actor_type_entity_unique" && index.config.unique,
    ),
  );
  assert.ok(
    messageConfig.checks.some((check) => check.name === "messages_content_length_check"),
  );
  assert.ok(
    notificationConfig.checks.some((check) => check.name === "notifications_type_check"),
  );
  assert.equal(messageConfig.foreignKeys.length, 2);
  assert.equal(notificationConfig.foreignKeys.length, 2);
  assert.equal(getTableConfig(users).name, "users");
});

test("realtime channels carry opaque identifiers only", () => {
  assert.equal(conversationChannel(conversationId), `conversation:${conversationId}`);
  assert.equal(userChannel(first), `user:${first}`);
  assert.deepEqual(REALTIME_EVENTS, { message: "message", notification: "notification" });
});

test("generated Block 10 migration is additive only", () => {
  const sql = readFileSync("drizzle/0007_short_korg.sql", "utf8");
  assert.match(sql, /CREATE TABLE "conversations"/);
  assert.match(sql, /CREATE TABLE "conversation_participants"/);
  assert.match(sql, /CREATE TABLE "messages"/);
  assert.match(sql, /CREATE TABLE "notifications"/);
  assert.match(sql, /ADD CONSTRAINT/);
  assert.equal(
    /DROP TABLE|TRUNCATE|DELETE FROM|DROP COLUMN|DROP CONSTRAINT|ALTER COLUMN/i.test(sql),
    false,
  );
});

const integrationEnabled = Boolean(
  process.env.LUMA_DB_INTEGRATION === "1" && process.env.DATABASE_URL,
);

test(
  "real Neon messaging constraints and read state (opt-in integration)",
  { skip: integrationEnabled ? false : "Set LUMA_DB_INTEGRATION=1 and DATABASE_URL for a migrated test database" },
  async () => {
    const { neon } = await import("@neondatabase/serverless");
    const db = neon(process.env.DATABASE_URL);
    const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
    const alice = randomUUID();
    const bob = randomUUID();
    const chatId = randomUUID();
    const messageId = randomUUID();
    const key = [alice, bob].sort().join(":");

    try {
      await db`
        INSERT INTO users (id, auth_user_id, email, username)
        VALUES (${alice}, ${randomUUID()}, ${`${suffix}a@example.test`}, ${`it_${suffix}a`}),
               (${bob}, ${randomUUID()}, ${`${suffix}b@example.test`}, ${`it_${suffix}b`})
      `;
      await db`INSERT INTO conversations (id, pair_key) VALUES (${chatId}, ${key})`;
      await assert.rejects(
        db`INSERT INTO conversations (pair_key) VALUES (${key})`,
        (error) => error?.code === "23505",
      );
      await db`
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES (${chatId}, ${alice}), (${chatId}, ${bob})
      `;
      await db`
        INSERT INTO messages (id, conversation_id, sender_id, client_id, content)
        VALUES (${messageId}, ${chatId}, ${alice}, ${randomUUID()}, ${"integration hello"})
      `;
      await assert.rejects(
        db`INSERT INTO messages (conversation_id, sender_id, content) VALUES (${chatId}, ${alice}, ${""})`,
        (error) => error?.code === "23514",
      );
      await db`
        UPDATE conversation_participants SET last_read_at = now()
        WHERE conversation_id = ${chatId} AND user_id = ${bob}
      `;
      const unread = await db`
        SELECT count(*)::int AS count
        FROM messages m
        JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
        WHERE m.conversation_id = ${chatId}
          AND cp.user_id = ${bob}
          AND m.sender_id <> ${bob}
          AND m.deleted_at IS NULL
          AND m.created_at > coalesce(cp.last_read_at, cp.joined_at)
      `;
      assert.equal(unread[0].count, 0);

      const notice = await db`
        SELECT entity_id, message FROM notifications
        WHERE recipient_id = ${bob} AND type = ${"message"}
      `;
      assert.equal(notice.length, 0);
    } finally {
      await db`DELETE FROM users WHERE id IN (${alice}, ${bob})`;
    }
  },
);
