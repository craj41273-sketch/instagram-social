import assert from "node:assert/strict";
import test from "node:test";

import { PgDialect, getTableConfig } from "drizzle-orm/pg-core";

import {
  emailSchema,
  passwordSchema,
  usernameSchema,
} from "../lib/validations/auth.ts";
import { profiles, users } from "../lib/db/schema.ts";
import {
  buildInitializeUserStatement,
  initializeUserInputSchema,
} from "../lib/db/identity-sql.ts";
import { consumeRateLimit, resetRateLimiter } from "../lib/security/rate-limit.ts";
import { safeRedirectPath } from "../lib/security/redirects.ts";
import { mapAuthError } from "../lib/auth/error-messages.ts";

const validAuthUserId = "11111111-1111-4111-8111-111111111111";

test("username validation normalizes and enforces format", () => {
  assert.equal(usernameSchema.parse("  Alice.Jane_99  "), "alice.jane_99");
  for (const value of ["ab", "a".repeat(21), "bad name", "has..dots", ".starts", "ends."]) {
    assert.equal(usernameSchema.safeParse(value).success, false, value);
  }
  assert.equal(usernameSchema.safeParse("valid_name").success, true);
});

test("email and password validation", () => {
  assert.equal(emailSchema.safeParse("not-an-email").success, false);
  assert.equal(emailSchema.safeParse("person@example.com").success, true);
  assert.equal(passwordSchema.safeParse("short1").success, false);
  assert.equal(passwordSchema.safeParse("lettersOnly").success, false);
  assert.equal(passwordSchema.safeParse("longenough1").success, true);
});

test("foundational users and profiles retain expected columns", () => {
  const userConfig = getTableConfig(users);
  const profileConfig = getTableConfig(profiles);

  assert.equal(userConfig.name, "users");
  assert.deepEqual(
    userConfig.columns.map((column) => column.name).sort(),
    [
      "account_status",
      "auth_user_id",
      "banned_at",
      "created_at",
      "email",
      "id",
      "role",
      "suspended_until",
      "updated_at",
      "username",
    ],
  );

  assert.equal(profileConfig.name, "profiles");
  assert.deepEqual(
    profileConfig.columns.map((column) => column.name).sort(),
    [
      "account_category",
      "avatar_url",
      "bio",
      "cover_url",
      "created_at",
      "display_name",
      "id",
      "is_private",
      "location",
      "professional_details",
      "professional_roles",
      "updated_at",
      "user_id",
      "website",
    ],
  );

  const userColumns = new Map(userConfig.columns.map((column) => [column.name, column]));
  const profileColumns = new Map(profileConfig.columns.map((column) => [column.name, column]));

  assert.equal(userColumns.get("auth_user_id")?.isUnique, true);
  assert.equal(userColumns.get("username")?.isUnique, true);
  assert.equal(profileColumns.get("user_id")?.isUnique, true);
  assert.ok(
    userConfig.indexes.some(
      (item) => item.config.name === "users_username_ci_idx" && item.config.unique,
    ),
  );
  assert.equal(profileConfig.foreignKeys.length, 1);
});

test("identity input rejects client-supplied or malformed auth IDs", () => {
  const base = {
    email: "person@example.com",
    username: "person.name",
    displayName: "Person Name",
  };

  assert.equal(
    initializeUserInputSchema.safeParse({ ...base, authUserId: "not-a-uuid" }).success,
    false,
  );
  assert.equal(
    initializeUserInputSchema.safeParse({ ...base, authUserId: validAuthUserId }).success,
    true,
  );
});

test("profile initialization is atomic, idempotent, and parameterized", () => {
  const input = {
    authUserId: validAuthUserId,
    email: "person@example.com",
    username: "person.name",
    displayName: "Person Name",
  };
  const statement = buildInitializeUserStatement(initializeUserInputSchema.parse(input));
  const query = new PgDialect().sqlToQuery(statement);

  assert.match(query.sql, /INSERT INTO users/);
  assert.match(query.sql, /ON CONFLICT \(auth_user_id\) DO UPDATE/);
  assert.match(query.sql, /INSERT INTO profiles/);
  assert.match(query.sql, /ON CONFLICT \(user_id\) DO NOTHING/);
  assert.deepEqual(query.params, [
    validAuthUserId,
    "person@example.com",
    "person.name",
    "Person Name",
  ]);
  assert.ok(!query.sql.includes("person@example.com"));
});

test("rate limiter blocks bursts and resets cleanly", () => {
  resetRateLimiter();
  assert.equal(consumeRateLimit("login:test", 2, 60_000).allowed, true);
  assert.equal(consumeRateLimit("login:test", 2, 60_000).allowed, true);
  assert.equal(consumeRateLimit("login:test", 2, 60_000).allowed, false);
  resetRateLimiter();
  assert.equal(consumeRateLimit("login:test", 2, 60_000).allowed, true);
});

test("redirect helper rejects protocol-relative and external destinations", () => {
  assert.equal(safeRedirectPath("//evil.example"), "/");
  assert.equal(safeRedirectPath("/\\evil.example"), "/");
  assert.equal(safeRedirectPath("https://evil.example"), "/");
  assert.equal(safeRedirectPath("/account?tab=profile"), "/account?tab=profile");
});

test("auth errors are mapped to safe user messages", () => {
  assert.equal(
    mapAuthError(new Error("Invalid login credentials"), "login"),
    "Email or password is incorrect. Please try again.",
  );
  assert.equal(
    mapAuthError(new Error("Database URL: postgres://secret@host"), "login"),
    "We could not sign you in. Please try again.",
  );
});
