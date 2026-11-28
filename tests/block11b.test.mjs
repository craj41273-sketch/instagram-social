import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { PgDialect } from "drizzle-orm/pg-core";

import { isActiveUser } from "@/lib/auth/account-status.ts";
import { buildProfileInfoVisibilityCondition } from "@/lib/db/discovery-query.ts";
import {
  buildConversationRequestAccessCondition,
  buildInboxRequestCondition,
  buildSendMessageStatement,
} from "@/lib/db/messaging-sql.ts";
import { conversationRequestActionSchema } from "@/lib/validations/messaging.ts";

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
const conversationId = "33333333-3333-4333-8333-333333333333";
const clientId = "44444444-4444-4444-8444-444444444444";
const dialect = new PgDialect();

test("inactive accounts fail the shared mutation guard", () => {
  const active = { accountStatus: "active", bannedAt: null, suspendedUntil: null };
  assert.equal(isActiveUser(active), true);
  assert.equal(isActiveUser({ ...active, accountStatus: "banned" }), false);
  assert.equal(isActiveUser({ ...active, accountStatus: "suspended" }), false);
  assert.equal(isActiveUser({ ...active, bannedAt: new Date("2026-01-01T00:00:00Z") }), false);
  // suspendedUntil is advisory; the explicit status is authoritative.
  assert.equal(
    isActiveUser({ ...active, suspendedUntil: new Date("2099-01-01T00:00:00Z") }),
    true,
  );
});

test("request access is role-aware and declined threads stay hidden", () => {
  const access = dialect.sqlToQuery(
    buildConversationRequestAccessCondition(first, conversationId),
  );
  assert.match(access.sql, /cr\.recipient_id = \$2 and cr\.status in \('pending', 'declined'\)/);
  assert.match(access.sql, /cr\.sender_id = \$3 and cr\.status = 'declined'/);
  assert.deepEqual(access.params, [conversationId, first, first]);

  const inbox = dialect.sqlToQuery(buildInboxRequestCondition(first));
  assert.match(inbox.sql, /cr\.status = 'declined'/);
  assert.match(inbox.sql, /cr\.recipient_id = \$1 or cr\.sender_id = \$2/);
  assert.deepEqual(inbox.params, [first, first]);
});

test("message notices are suppressed for pending or declined requests", () => {
  const send = dialect.sqlToQuery(
    buildSendMessageStatement({
      conversationId,
      senderId: first,
      clientId,
      content: "private message text",
    }),
  );
  assert.match(send.sql, /on conflict \(sender_id, client_id\) do nothing/);
  assert.match(send.sql, /cr\.status in \('pending', 'declined'\)/);
  assert.equal(send.sql.includes("private message text"), false);
  assert.ok(send.params.includes("private message text"));
});

test("people-search bios require public visibility or a follow edge", () => {
  const bio = dialect.sqlToQuery(buildProfileInfoVisibilityCondition(first));
  assert.match(bio.sql, /profile_info_visibility/);
  assert.match(bio.sql, /f\.follower_id = \$2 and f\.following_id = "users"\."id"/);
  assert.deepEqual(bio.params, [first, first]);
});

test("request responses accept only explicit accept or decline actions", () => {
  assert.equal(conversationRequestActionSchema.safeParse({ action: "accept" }).success, true);
  assert.equal(conversationRequestActionSchema.safeParse({ action: "decline" }).success, true);
  assert.equal(conversationRequestActionSchema.safeParse({ action: "pending" }).success, false);
  assert.equal(
    conversationRequestActionSchema.safeParse({ action: "accept", actorId: second }).success,
    false,
  );
});

test("inbox previews mask hidden words and unread badges are capped", () => {
  const messaging = readFileSync("lib/db/messaging.ts", "utf8");
  assert.match(messaging, /containsHiddenWord\(previewText, hiddenWords\)/);
  assert.match(messaging, /Message hidden by your filters/);
  assert.match(messaging, /Message request — accept to view messages/);
  assert.ok((messaging.match(/least\(count\(\*\), 100\)/g) ?? []).length >= 3);

  const unreadSection = messaging.slice(messaging.indexOf("export async function getUnreadMessageCount"));
  assert.match(unreadSection, /buildConversationRequestAccessCondition\(viewerId, sql`m\.conversation_id`\)/);
});

test("mutation identity checks and high-impact staff checks are wired at the boundary", () => {
  const dal = readFileSync("lib/auth/dal.ts", "utf8");
  assert.match(dal, /isActiveUser\(current\.user\)/);

  for (const file of [
    "app/actions/engagement.ts",
    "app/actions/follows.ts",
    "app/actions/trust.ts",
    "app/api/posts/route.ts",
    "app/api/stories/route.ts",
    "lib/admin/authorization.ts",
  ]) {
    assert.match(readFileSync(file, "utf8"), /getActiveProfile\(\)/, file);
  }

  const admin = readFileSync("app/actions/admin.ts", "utf8");
  assert.match(admin, /parsed\.data\.action === "suspend"/);
  assert.match(admin, /requireStaff\(true\)/);

  const auth = readFileSync("app/actions/auth.ts", "utf8");
  assert.match(auth, /if \(!token\)/);
  assert.match(auth, /reset:\$\{token\.slice\(0, 64\)\}/);
});

test("baseline security headers and report-only CSP are used on every proxy path", () => {
  const proxy = readFileSync("proxy.ts", "utf8");
  for (const header of [
    "X-Content-Type-Options",
    "Referrer-Policy",
    "X-Frame-Options",
    "Permissions-Policy",
    "Content-Security-Policy-Report-Only",
  ]) {
    assert.match(proxy, new RegExp(`"${header}"`), header);
  }
  assert.equal(/"Content-Security-Policy":/.test(proxy), false);
  assert.equal((proxy.match(/withSecurityHeaders\(/g) ?? []).length >= 5, true);
});

test("CI validates the Node app and migration 0008 stays additive", () => {
  const ci = readFileSync(".github/workflows/ci.yml", "utf8");
  for (const command of ["npm ci", "npm run check", "npm test", "npm run build"]) {
    assert.match(ci, new RegExp(command.replace(".", "\\.")), command);
  }
  assert.equal(existsSync(".github/workflows/static.yml"), false);

  const migration = readFileSync("drizzle/0008_chubby_the_call.sql", "utf8");
  assert.match(migration, /CREATE TABLE/i);
  assert.equal(/\b(DROP TABLE|TRUNCATE|DELETE FROM)\b/i.test(migration), false);
});

test("story views no longer require reply permission", () => {
  const stories = readFileSync("lib/db/stories.ts", "utf8");
  const viewSection = stories.slice(stories.indexOf("export async function recordStoryView"));
  assert.equal(viewSection.slice(0, 2000).includes("canReplyToStory"), false);
  assert.match(viewSection.slice(0, 2000), /getVisibleStoryOwner/);
});
