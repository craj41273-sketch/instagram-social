import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
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
    index("users_username_trgm_idx").using(
      "gin",
      sql`lower(${table.username}) gin_trgm_ops`,
    ),
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
    index("profiles_display_name_trgm_idx").using(
      "gin",
      sql`lower(${table.displayName}) gin_trgm_ops`,
    ),
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

/**
 * A post is owned by an application user. Caption text and media metadata live
 * in Neon; image bytes never do. Stable (created_at, id) ordering supports
 * cursor pagination for both the profile grid and the shared feed.
 */
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    caption: text("caption").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("posts_user_id_idx").on(table.userId),
    index("posts_user_created_idx").on(table.userId, table.createdAt),
    index("posts_created_at_idx").on(table.createdAt),
    index("posts_caption_trgm_idx").using(
      "gin",
      sql`lower(${table.caption}) gin_trgm_ops`,
    ),
    check("posts_caption_length_check", sql`length(${table.caption}) <= 2200`),
  ],
);

/** Supabase Storage metadata; `storage_path` is unique and owner-namespaced. */
export const postMedia = pgTable(
  "post_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    publicUrl: text("public_url").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    altText: text("alt_text"),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("post_media_storage_path_unique").on(table.storagePath),
    uniqueIndex("post_media_post_position_unique").on(table.postId, table.position),
    index("post_media_post_idx").on(table.postId),
    check("post_media_position_check", sql`${table.position} >= 0`),
    check("post_media_byte_size_check", sql`${table.byteSize} > 0`),
  ],
);

/** Normalized hashtags extracted from a post caption; metadata only. */
export const postHashtags = pgTable(
  "post_hashtags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("post_hashtags_post_tag_unique").on(table.postId, table.tag),
    uniqueIndex("post_hashtags_post_position_unique").on(table.postId, table.position),
    index("post_hashtags_tag_idx").on(table.tag),
    index("post_hashtags_post_idx").on(table.postId),
    check("post_hashtags_tag_format_check", sql`${table.tag} ~ '^[a-z0-9_]{1,30}$'`),
    check("post_hashtags_position_check", sql`${table.position} >= 0`),
  ],
);

/** One real like per (user, post) pair; counts are always derived from rows. */
export const postLikes = pgTable(
  "post_likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("post_likes_user_post_unique").on(table.userId, table.postId),
    index("post_likes_post_idx").on(table.postId),
    index("post_likes_user_idx").on(table.userId),
  ],
);

/** Text-only comments; React renders content as plain text, never as HTML. */
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("comments_post_created_idx").on(table.postId, table.createdAt, table.id),
    index("comments_user_idx").on(table.userId),
    check("comments_content_length_check", sql`length(${table.content}) between 1 and 1000`),
  ],
);

/**
 * A story is one short-lived image owned by an application user. Bytes live in
 * Supabase Storage; Neon stores the validated URL, owner-scoped object key,
 * optional overlay, and a server-generated 24-hour expiration.
 */
export const stories = pgTable(
  "stories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaUrl: text("media_url").notNull(),
    storagePath: text("storage_path").notNull(),
    mediaType: text("media_type").notNull().default("image"),
    byteSize: integer("byte_size").notNull(),
    caption: text("caption").notNull().default(""),
    textOverlay: text("text_overlay"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '24 hours'`),
  },
  (table) => [
    uniqueIndex("stories_storage_path_unique").on(table.storagePath),
    index("stories_user_id_idx").on(table.userId),
    index("stories_created_at_idx").on(table.createdAt),
    index("stories_expires_at_idx").on(table.expiresAt),
    index("stories_user_expires_created_idx").on(
      table.userId,
      table.expiresAt,
      table.createdAt,
    ),
    check("stories_media_type_check", sql`${table.mediaType} = 'image'`),
    check("stories_byte_size_check", sql`${table.byteSize} > 0`),
    check("stories_caption_length_check", sql`length(${table.caption}) <= 500`),
    check(
      "stories_text_overlay_length_check",
      sql`length(${table.textOverlay}) <= 120`,
    ),
    check("stories_expires_after_created_check", sql`${table.expiresAt} > ${table.createdAt}`),
  ],
);

/** One view per (story, viewer); duplicate reads are idempotent. */
export const storyViews = pgTable(
  "story_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    viewerId: uuid("viewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("story_views_story_viewer_unique").on(table.storyId, table.viewerId),
    index("story_views_story_idx").on(table.storyId),
    index("story_views_viewer_idx").on(table.viewerId),
    index("story_views_viewed_at_idx").on(table.viewedAt),
  ],
);

/** One mutable reaction per (story, user); emoji values are fixed in the DB. */
export const storyReactions = pgTable(
  "story_reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("story_reactions_story_user_unique").on(table.storyId, table.userId),
    index("story_reactions_story_idx").on(table.storyId),
    index("story_reactions_user_idx").on(table.userId),
    check(
      "story_reactions_emoji_check",
      sql`${table.emoji} in ('❤️', '😂', '😮', '🔥', '👏')`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Follow = typeof follows.$inferSelect;
export type NewFollow = typeof follows.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type PostMedia = typeof postMedia.$inferSelect;
export type NewPostMedia = typeof postMedia.$inferInsert;
export type PostHashtag = typeof postHashtags.$inferSelect;
export type NewPostHashtag = typeof postHashtags.$inferInsert;
export type PostLike = typeof postLikes.$inferSelect;
export type NewPostLike = typeof postLikes.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;
export type StoryView = typeof storyViews.$inferSelect;
export type NewStoryView = typeof storyViews.$inferInsert;
export type StoryReaction = typeof storyReactions.$inferSelect;
export type NewStoryReaction = typeof storyReactions.$inferInsert;
