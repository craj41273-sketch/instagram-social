import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Application schema. Supabase Auth owns credentials and identities; Neon owns
 * these records. `users.username` is the single authoritative username source;
 * profiles never duplicate it. Block 5 adds profile location and the social
 * graph edge table `follows`.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Logical (not database-level) reference to supabase.auth.users.id.
    authUserId: uuid("auth_user_id").notNull().unique(),
    email: text("email").notNull(),
    // Always normalized to lowercase by the shared Zod schema.
    username: text("username").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_auth_user_id_idx").on(table.authUserId),
    uniqueIndex("users_username_idx").on(table.username),
    // Defense in depth: case-insensitive uniqueness even if a future writer
    // bypasses the shared normalization schema.
    uniqueIndex("users_username_ci_idx").on(sql`lower(${table.username})`),
    index("users_email_idx").on(table.email),
  ],
);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    coverUrl: text("cover_url"),
    website: text("website"),
    location: text("location"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("profiles_user_id_idx").on(table.userId),
    index("profiles_created_at_idx").on(table.createdAt),
  ],
);

/**
 * Directed social graph edge: `follower_id -> following_id`. Both sides point
 * at application users (not Supabase auth IDs), so deletion cascades with the
 * user row. The database enforces uniqueness and self-follow prevention.
 */
export const follows = pgTable(
  "follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("follows_follower_following_unique").on(
      table.followerId,
      table.followingId,
    ),
    index("follows_follower_idx").on(table.followerId),
    index("follows_following_idx").on(table.followingId),
    index("follows_created_at_idx").on(table.createdAt),
    check("follows_no_self_check", sql`${table.followerId} <> ${table.followingId}`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Follow = typeof follows.$inferSelect;
export type NewFollow = typeof follows.$inferInsert;
