import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
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
    // Block 11A: role is administrator-controlled and never derived from
    // professional category, hypes, reports, or risk.
    role: text("role").notNull().default("user"),
    accountStatus: text("account_status").notNull().default("active"),
    suspendedUntil: timestamp("suspended_until", { withTimezone: true }),
    bannedAt: timestamp("banned_at", { withTimezone: true }),
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
    index("users_role_idx").on(table.role),
    index("users_account_status_idx").on(table.accountStatus),
    check(
      "users_role_check",
      sql`${table.role} in ('user', 'moderator', 'admin')`,
    ),
    check(
      "users_account_status_check",
      sql`${table.accountStatus} in ('active', 'warning', 'restricted', 'suspended', 'banned')`,
    ),
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
    // Block 11A profile identity and audience defaults. Existing rows keep
    // their data and receive neutral, non-privileged values.
    isPrivate: boolean("is_private").notNull().default(false),
    accountCategory: text("account_category").notNull().default("personal"),
    professionalRoles: jsonb("professional_roles")
      .$type<string[]>()
      .notNull()
      .default([]),
    professionalDetails: jsonb("professional_details")
      .$type<Record<string, string | string[]>>()
      .notNull()
      .default({}),
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
    index("profiles_private_idx").on(table.isPrivate),
    index("profiles_account_category_idx").on(table.accountCategory),
    check(
      "profiles_account_category_check",
      sql`${table.accountCategory} in (
        'personal', 'developer', 'company', 'creator', 'marketer', 'freelancer',
        'ecommerce', 'designer', 'photographer', 'educator', 'founder',
        'professional', 'organization', 'student', 'other'
      )`,
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
    audience: text("audience").notNull().default("followers"),
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
    check(
      "stories_audience_check",
      sql`${table.audience} in ('followers', 'close_friends', 'custom')`,
    ),
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

/**
 * One-to-one conversations. `pair_key` is the sorted pair of application user
 * IDs, so the database rejects duplicate conversations even under concurrent
 * clicks. Neon remains the only application database.
 */
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pairKey: text("pair_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("conversations_pair_key_unique").on(table.pairKey),
    index("conversations_last_message_at_idx").on(table.lastMessageAt),
    check("conversations_pair_key_check", sql`${table.pairKey} like '%:%'`),
  ],
);

/** Exactly two participant rows are created per conversation by the service. */
export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    mutedAt: timestamp("muted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("conversation_participants_conversation_user_unique").on(
      table.conversationId,
      table.userId,
    ),
    index("conversation_participants_conversation_idx").on(table.conversationId),
    index("conversation_participants_user_idx").on(table.userId),
    index("conversation_participants_user_last_read_idx").on(
      table.userId,
      table.lastReadAt,
    ),
  ],
);

/**
 * Text-only messages. `client_id` is an idempotency key from the sender so a
 * retried send cannot create a duplicate. Deleted messages stay in place as a
 * tombstone and never return their content to clients.
 */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: uuid("client_id"),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("messages_sender_client_unique").on(table.senderId, table.clientId),
    index("messages_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
      table.id,
    ),
    index("messages_sender_idx").on(table.senderId),
    check("messages_content_length_check", sql`length(${table.content}) between 1 and 4000`),
  ],
);

/**
 * One row per recipient/actor/type/entity. No email addresses or message text
 * are copied here; notification text is derived from public profile fields.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    entityId: text("entity_id").notNull().default(""),
    message: text("message").notNull().default(""),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("notifications_recipient_actor_type_entity_unique").on(
      table.recipientId,
      table.actorId,
      table.type,
      table.entityId,
    ),
    index("notifications_recipient_read_created_idx").on(
      table.recipientId,
      table.readAt,
      table.createdAt,
    ),
    index("notifications_recipient_created_idx").on(
      table.recipientId,
      table.createdAt,
    ),
    index("notifications_actor_idx").on(table.actorId),
    check(
      "notifications_type_check",
      sql`${table.type} in (
        'follow', 'like', 'comment', 'story_reaction', 'message',
        'moderation', 'report_update', 'appeal_update'
      )`,
    ),
    check("notifications_message_length_check", sql`length(${table.message}) <= 200`),
  ],
);

/** Per-user privacy configuration. One row is created lazily on first edit. */
export const profilePrivacySettings = pgTable(
  "profile_privacy_settings",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    whoCanMessage: text("who_can_message").notNull().default("everyone"),
    messageRequestsEnabled: boolean("message_requests_enabled")
      .notNull()
      .default(true),
    readReceipts: boolean("read_receipts").notNull().default(true),
    activityStatus: boolean("activity_status").notNull().default(true),
    conversationPrivacy: text("conversation_privacy")
      .notNull()
      .default("participants"),
    whoCanComment: text("who_can_comment").notNull().default("everyone"),
    commentsEnabled: boolean("comments_enabled").notNull().default(true),
    mentionPermission: text("mention_permission").notNull().default("everyone"),
    tagApproval: boolean("tag_approval").notNull().default(false),
    discoverable: boolean("discoverable").notNull().default(true),
    contactVisibility: text("contact_visibility").notNull().default("followers"),
    profileInfoVisibility: text("profile_info_visibility")
      .notNull()
      .default("everyone"),
    hideLikeCounts: boolean("hide_like_counts").notNull().default(false),
    hideViewCounts: boolean("hide_view_counts").notNull().default(false),
    hiddenWords: jsonb("hidden_words").$type<string[]>().notNull().default([]),
    storyAudience: text("story_audience").notNull().default("followers"),
    storyReplies: text("story_replies").notNull().default("everyone"),
    storyInteractions: text("story_interactions").notNull().default("everyone"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "privacy_who_can_message_check",
      sql`${table.whoCanMessage} in ('everyone', 'followers', 'nobody')`,
    ),
    check(
      "privacy_conversation_privacy_check",
      sql`${table.conversationPrivacy} in ('participants', 'followers')`,
    ),
    check(
      "privacy_who_can_comment_check",
      sql`${table.whoCanComment} in ('everyone', 'followers', 'followed', 'nobody')`,
    ),
    check(
      "privacy_mention_permission_check",
      sql`${table.mentionPermission} in ('everyone', 'followed', 'nobody')`,
    ),
    check(
      "privacy_contact_visibility_check",
      sql`${table.contactVisibility} in ('everyone', 'followers', 'nobody')`,
    ),
    check(
      "privacy_profile_info_visibility_check",
      sql`${table.profileInfoVisibility} in ('everyone', 'followers')`,
    ),
    check(
      "privacy_story_audience_check",
      sql`${table.storyAudience} in ('followers', 'close_friends', 'custom')`,
    ),
    check(
      "privacy_story_controls_check",
      sql`${table.storyReplies} in ('everyone', 'followers', 'nobody')
        and ${table.storyInteractions} in ('everyone', 'followers', 'nobody')`,
    ),
  ],
);

/** Bidirectional close-friend membership: owner explicitly selects members. */
export const closeFriends = pgTable(
  "close_friends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("close_friends_owner_member_unique").on(table.ownerId, table.memberId),
    index("close_friends_owner_idx").on(table.ownerId),
    check("close_friends_no_self_check", sql`${table.ownerId} <> ${table.memberId}`),
  ],
);

/** Per-story include/exclude lists enforce custom audiences and hidden users. */
export const storyAudienceEntries = pgTable(
  "story_audience_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("story_audience_story_user_kind_unique").on(
      table.storyId,
      table.userId,
      table.kind,
    ),
    index("story_audience_story_idx").on(table.storyId),
    index("story_audience_user_idx").on(table.userId),
    check("story_audience_kind_check", sql`${table.kind} in ('include', 'exclude')`),
  ],
);

/** Block, restrict, and mute are separate actor-owned controls. */
export const userRelationships = pgTable(
  "user_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetId: uuid("target_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_relationships_actor_target_kind_unique").on(
      table.actorId,
      table.targetId,
      table.kind,
    ),
    index("user_relationships_target_idx").on(table.targetId),
    index("user_relationships_kind_idx").on(table.kind),
    check(
      "user_relationships_kind_check",
      sql`${table.kind} in ('block', 'restrict', 'mute')`,
    ),
    check("user_relationships_no_self_check", sql`${table.actorId} <> ${table.targetId}`),
  ],
);

/** Follow requests replace direct follow creation only for private accounts. */
export const followRequests = pgTable(
  "follow_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetId: uuid("target_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("follow_requests_requester_target_unique").on(
      table.requesterId,
      table.targetId,
    ),
    index("follow_requests_target_status_idx").on(table.targetId, table.status),
    index("follow_requests_requester_status_idx").on(table.requesterId, table.status),
    check(
      "follow_requests_status_check",
      sql`${table.status} in ('pending', 'accepted', 'declined', 'cancelled')`,
    ),
    check("follow_requests_no_self_check", sql`${table.requesterId} <> ${table.targetId}`),
  ],
);

/** Safe external identity links; ownership is never implied by a link row. */
export const profileLinks = pgTable(
  "profile_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    url: text("url").notNull(),
    linkType: text("link_type").notNull(),
    icon: text("icon"),
    position: integer("position").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    visibility: text("visibility").notNull().default("everyone"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("profile_links_user_position_idx").on(table.userId, table.position),
    check("profile_links_label_check", sql`length(${table.label}) between 1 and 80`),
    check("profile_links_url_check", sql`length(${table.url}) between 1 and 500`),
    check("profile_links_position_check", sql`${table.position} between 0 and 100`),
    check(
      "profile_links_visibility_check",
      sql`${table.visibility} in ('everyone', 'followers')`,
    ),
  ],
);

/** Optional category-aware portfolio entries; all URLs are validated in Zod. */
export const portfolioProjects = pgTable(
  "portfolio_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    imageUrl: text("image_url"),
    technologies: jsonb("technologies").$type<string[]>().notNull().default([]),
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    liveUrl: text("live_url"),
    repositoryUrl: text("repository_url"),
    portfolioUrl: text("portfolio_url"),
    status: text("status").notNull().default("completed"),
    position: integer("position").notNull(),
    featured: boolean("featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("portfolio_projects_user_position_idx").on(table.userId, table.position),
    index("portfolio_projects_user_featured_idx").on(table.userId, table.featured),
    check("portfolio_projects_title_check", sql`length(${table.title}) between 1 and 120`),
    check("portfolio_projects_description_check", sql`length(${table.description}) <= 2000`),
    check("portfolio_projects_position_check", sql`${table.position} between 0 and 100`),
    check(
      "portfolio_projects_status_check",
      sql`${table.status} in ('planned', 'in_progress', 'completed', 'archived')`,
    ),
  ],
);

/**
 * One durable hype per giver/target pair. Withdrawal changes state; the row
 * remains so reversal cannot be replayed into duplicate active hypes.
 */
export const trustHypes = pgTable(
  "trust_hypes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    giverId: uuid("giver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetId: uuid("target_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    state: text("state").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("trust_hypes_giver_target_unique").on(table.giverId, table.targetId),
    index("trust_hypes_target_state_idx").on(table.targetId, table.state),
    check("trust_hypes_state_check", sql`${table.state} in ('active', 'withdrawn')`),
    check("trust_hypes_no_self_check", sql`${table.giverId} <> ${table.targetId}`),
  ],
);

/** Current admin risk assessment; absence is the distinct unassessed state. */
export const riskAssessments = pgTable(
  "risk_assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    reason: text("reason").notNull(),
    evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
    assessedBy: uuid("assessed_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assessedAt: timestamp("assessed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("risk_assessments_user_id_idx").on(table.userId),
    index("risk_assessments_score_idx").on(table.score),
    check("risk_assessments_score_check", sql`${table.score} between 0 and 100`),
    check("risk_assessments_reason_check", sql`length(${table.reason}) between 1 and 1000`),
  ],
);

/** Append-only history for every admin risk set, change, and removal. */
export const riskAssessmentHistory = pgTable(
  "risk_assessment_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    previousScore: integer("previous_score"),
    score: integer("score"),
    reason: text("reason").notNull(),
    evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("risk_history_user_created_idx").on(table.userId, table.createdAt),
    check("risk_history_action_check", sql`${table.action} in ('set', 'remove')`),
    check("risk_history_reason_check", sql`length(${table.reason}) between 1 and 1000`),
  ],
);

/** Moderation queue. Reporter identity is stored but never sent to targets. */
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id")
      .references(() => users.id, { onDelete: "set null" }),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    category: text("category").notNull(),
    reason: text("reason"),
    explanation: text("explanation").notNull().default(""),
    status: text("status").notNull().default("pending"),
    priority: text("priority").notNull().default("normal"),
    assigneeId: uuid("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resolutionNotes: text("resolution_notes").notNull().default(""),
    resolvedBy: uuid("resolved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("reports_duplicate_idx").on(
      table.reporterId,
      table.targetType,
      table.targetId,
      table.category,
    ),
    index("reports_status_priority_created_idx").on(
      table.status,
      table.priority,
      table.createdAt,
    ),
    index("reports_target_idx").on(table.targetType, table.targetId),
    index("reports_assignee_idx").on(table.assigneeId),
    check(
      "reports_target_type_check",
      sql`${table.targetType} in ('user', 'post', 'comment', 'story', 'message', 'conversation')`,
    ),
    check(
      "reports_category_check",
      sql`${table.category} in (
        'spam', 'scam_fraud', 'harassment', 'bullying', 'hate_speech',
        'threats_violence', 'impersonation', 'sexual_content', 'exploitation',
        'child_safety', 'privacy_violation', 'self_harm', 'dangerous_content',
        'intellectual_property', 'other'
      )`,
    ),
    check(
      "reports_status_check",
      sql`${table.status} in ('pending', 'reviewing', 'escalated', 'resolved', 'dismissed')`,
    ),
    check(
      "reports_priority_check",
      sql`${table.priority} in ('low', 'normal', 'high', 'urgent')`,
    ),
    check("reports_explanation_check", sql`length(${table.explanation}) <= 2000`),
  ],
);

/** Immutable evidence attached to a report; no update endpoint exists. */
export const reportEvidence = pgTable(
  "report_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("report_evidence_report_idx").on(table.reportId),
    check("report_evidence_kind_check", sql`${table.kind} in ('chat_snapshot', 'target')`),
  ],
);

/** Every evidence view or private note is attributed to a staff member. */
export const reportEvidenceAccess = pgTable(
  "report_evidence_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("report_evidence_access_report_created_idx").on(table.reportId, table.createdAt),
    check("report_evidence_access_action_check", sql`${table.action} in ('view', 'note')`),
  ],
);

/** Authoritative moderation history with reasons, actor, targets, and expiry. */
export const moderationActions = pgTable(
  "moderation_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reportId: uuid("report_id").references(() => reports.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    reason: text("reason").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("moderation_actions_user_created_idx").on(table.userId, table.createdAt),
    index("moderation_actions_report_idx").on(table.reportId),
    check(
      "moderation_actions_action_check",
      sql`${table.action} in (
        'warning', 'restrict', 'suspend', 'ban', 'restore', 'remove_content',
        'dismiss_report', 'resolve_report', 'escalate_report'
      )`,
    ),
    check("moderation_actions_reason_check", sql`length(${table.reason}) between 1 and 1000`),
  ],
);

/** User appeals against a specific moderation decision. */
export const appeals = pgTable(
  "appeals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    moderationActionId: uuid("moderation_action_id").references(
      () => moderationActions.id,
      { onDelete: "set null" },
    ),
    reportId: uuid("report_id").references(() => reports.id, {
      onDelete: "set null",
    }),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("pending"),
    resolution: text("resolution").notNull().default(""),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("appeals_status_created_idx").on(table.status, table.createdAt),
    index("appeals_user_idx").on(table.userId),
    check("appeals_status_check", sql`${table.status} in ('pending', 'approved', 'rejected')`),
    check("appeals_reason_check", sql`length(${table.reason}) between 10 and 2000`),
  ],
);

/** Append-only audit trail for privileged actions; never holds chat content. */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_created_idx").on(table.createdAt),
    index("audit_logs_actor_created_idx").on(table.actorId, table.createdAt),
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    check("audit_logs_action_check", sql`length(${table.action}) between 1 and 120`),
  ],
);

/** Permission-gated conversation requests; accepted requests become normal DMs. */
export const conversationRequests = pgTable(
  "conversation_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("conversation_requests_conversation_sender_unique").on(
      table.conversationId,
      table.senderId,
    ),
    index("conversation_requests_recipient_status_idx").on(
      table.recipientId,
      table.status,
    ),
    check(
      "conversation_requests_status_check",
      sql`${table.status} in ('pending', 'accepted', 'declined')`,
    ),
    check(
      "conversation_requests_no_self_check",
      sql`${table.senderId} <> ${table.recipientId}`,
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
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type NewConversationParticipant = typeof conversationParticipants.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type ProfilePrivacySettings = typeof profilePrivacySettings.$inferSelect;
export type CloseFriend = typeof closeFriends.$inferSelect;
export type StoryAudienceEntry = typeof storyAudienceEntries.$inferSelect;
export type UserRelationship = typeof userRelationships.$inferSelect;
export type FollowRequest = typeof followRequests.$inferSelect;
export type ProfileLink = typeof profileLinks.$inferSelect;
export type PortfolioProject = typeof portfolioProjects.$inferSelect;
export type TrustHype = typeof trustHypes.$inferSelect;
export type RiskAssessment = typeof riskAssessments.$inferSelect;
export type RiskAssessmentHistory = typeof riskAssessmentHistory.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type ReportEvidence = typeof reportEvidence.$inferSelect;
export type ReportEvidenceAccess = typeof reportEvidenceAccess.$inferSelect;
export type ModerationAction = typeof moderationActions.$inferSelect;
export type Appeal = typeof appeals.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type ConversationRequest = typeof conversationRequests.$inferSelect;
