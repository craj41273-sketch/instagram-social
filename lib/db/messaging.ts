import "server-only";
import { and, desc, eq, ne, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/lib/db";
import {
  conversationParticipants,
  conversationRequests,
  conversations,
  follows,
  messages,
  profilePrivacySettings,
  profiles,
  userRelationships,
  users,
} from "@/lib/db/schema";
import { findUserByUsername } from "@/lib/db/users";
import { parseUserId } from "@/lib/db/profile-sql";
import {
  canMessage,
  containsHiddenWord,
  filterHiddenWords,
  getPrivacyContext,
  getPrivacySettings,
  requiresMessageRequest,
} from "@/lib/privacy/service";
import {
  buildConversationAccessCondition,
  buildConversationRequestAccessCondition,
  buildCreateConversationStatement,
  buildInboxCondition,
  buildInboxRequestCondition,
  buildMarkConversationReadStatement,
  buildMessagePageCondition,
  buildSendMessageStatement,
  buildUnreadMessageCondition,
} from "@/lib/db/messaging-sql";
import { AuthorizationError, DatabaseError, ValidationError } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { decodePageCursor, encodePageCursor } from "@/lib/pagination";
import type {
  ConversationHeader,
  InboxItem,
  InboxPage,
  MessageItem,
  MessagePage,
  UnreadCounts,
} from "@/lib/messaging/types";

/** Server-only messaging services: Neon is the only source of truth. */

interface RawRow {
  [key: string]: unknown;
}

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    return Array.isArray(rows) ? (rows as T[]) : [];
  }
  return [];
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date(0).toISOString();
}

function numeric(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function requestStatus(value: unknown): InboxItem["requestStatus"] {
  return value === "pending" || value === "accepted" || value === "declined"
    ? value
    : "none";
}

function validateConversationInput(conversationId: string, viewerId: string): void {
  if (!parseUserId(conversationId) || !parseUserId(viewerId)) {
    throw new ValidationError("Invalid conversation identity.");
  }
}

/** SQL form of canMessage for batched reads such as the inbox. */
function canMessagePeerCondition(viewerId: string): SQL {
  return sql`
    exists (
      select 1 from ${users} peer
      where peer.id = ${users.id} and peer.account_status <> 'banned'
    )
    and not exists (
      select 1 from ${userRelationships} rel
      where rel.kind = 'block'
        and (
          (rel.actor_id = ${viewerId} and rel.target_id = ${users.id})
          or (rel.actor_id = ${users.id} and rel.target_id = ${viewerId})
        )
    )
    and not exists (
      select 1 from ${userRelationships} rel
      where rel.kind = 'restrict'
        and rel.actor_id = ${users.id} and rel.target_id = ${viewerId}
    )
    and coalesce((
      select settings.who_can_message
      from ${profilePrivacySettings} settings
      where settings.user_id = ${users.id}
    ), 'everyone') <> 'nobody'
    and (
      coalesce((
        select settings.who_can_message
        from ${profilePrivacySettings} settings
        where settings.user_id = ${users.id}
      ), 'everyone') <> 'followers'
      or exists (
        select 1 from ${follows} f
        where f.follower_id = ${viewerId} and f.following_id = ${users.id}
      )
    )
  `;
}

/** Reuses an existing one-to-one conversation; duplicate clicks are idempotent. */
export async function createConversation(
  viewerId: string,
  username: string,
): Promise<string | null> {
  if (!parseUserId(viewerId)) throw new ValidationError("Invalid account identity.");

  try {
    const target = await findUserByUsername(username.toLowerCase());
    if (!target || target.id === viewerId) return null;
    const context = await getPrivacyContext(viewerId, target.id);
    if (!canMessage(context)) return null;

    const result = await getDb().execute(
      buildCreateConversationStatement(viewerId, username),
    );
    const conversationId = extractRows<RawRow>(result)[0]?.id as string | undefined ?? null;
    if (!conversationId) return null;

    if (requiresMessageRequest(context)) {
      await getDb()
        .insert(conversationRequests)
        .values({
          conversationId,
          senderId: viewerId,
          recipientId: target.id,
          status: "pending",
        })
        .onConflictDoNothing();
    }
    return conversationId;
  } catch (error) {
    logServerError("db.createConversation", error);
    throw new DatabaseError();
  }
}

/** Returns peer details only when the viewer is a participant. */
export async function getConversationHeader(
  conversationId: string,
  viewerId: string,
): Promise<ConversationHeader | null> {
  validateConversationInput(conversationId, viewerId);
  const other = alias(conversationParticipants, "other");

  try {
    const rows = await getDb()
      .select({
        id: conversations.id,
        userId: users.id,
        username: users.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      })
      .from(conversations)
      .innerJoin(
        other,
        and(
          eq(other.conversationId, conversations.id),
          ne(other.userId, viewerId),
        ),
      )
      .innerJoin(users, eq(users.id, other.userId))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          buildConversationAccessCondition(viewerId, conversationId),
          buildConversationRequestAccessCondition(viewerId),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    // No read state is projected; if one is added later, gate it on the peer's
    // readReceipts setting before exposing it.
    const context = await getPrivacyContext(viewerId, row.userId);
    if (!canMessage(context)) return null;
    return { ...row, displayName: row.displayName ?? row.username };
  } catch (error) {
    logServerError("db.getConversationHeader", error, { conversationId });
    throw new DatabaseError();
  }
}

/** Most-recent-first inbox with DB-derived unread counts and safe previews. */
export async function listInbox(
  viewerId: string,
  options: { limit: number; cursor?: string | null },
): Promise<InboxPage> {
  if (!parseUserId(viewerId)) throw new ValidationError("Invalid account identity.");
  const cursor = decodePageCursor(options.cursor);
  const other = alias(conversationParticipants, "other");

  const unreadCount = sql<number>`(
    select least(count(*), 100)::int
    from messages m
    inner join conversation_participants cp
      on cp.conversation_id = m.conversation_id and cp.user_id = ${viewerId}
    where m.conversation_id = ${conversations.id}
      and ${buildUnreadMessageCondition(viewerId)}
      and ${buildConversationRequestAccessCondition(viewerId, sql`m.conversation_id`)}
  )`;

  // The CASE prevents deleted content from ever leaving the database.
  const preview = sql<string | null>`(
    select case when m.deleted_at is not null then 'Message deleted' else m.content end
    from messages m
    where m.conversation_id = ${conversations.id}
    order by m.created_at desc, m.id desc
    limit 1
  )`;

  const previewDeleted = sql<boolean>`(
    select coalesce(m.deleted_at is not null, false)
    from messages m
    where m.conversation_id = ${conversations.id}
    order by m.created_at desc, m.id desc
    limit 1
  )`;

  try {
    const rows = await getDb()
      .select({
        conversationId: conversations.id,
        lastMessageAt: conversations.lastMessageAt,
        userId: users.id,
        username: users.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        unreadCount,
        preview,
        previewDeleted,
        requestStatus: conversationRequests.status,
        requestRecipientId: conversationRequests.recipientId,
      })
      .from(conversationParticipants)
      .innerJoin(
        conversations,
        eq(conversationParticipants.conversationId, conversations.id),
      )
      .innerJoin(
        other,
        and(
          eq(other.conversationId, conversations.id),
          ne(other.userId, viewerId),
        ),
      )
      .innerJoin(users, eq(users.id, other.userId))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .leftJoin(
        conversationRequests,
        eq(conversationRequests.conversationId, conversations.id),
      )
      .where(
        and(
          eq(conversationParticipants.userId, viewerId),
          buildInboxCondition(viewerId, cursor),
          buildInboxRequestCondition(viewerId),
          canMessagePeerCondition(viewerId),
        ),
      )
      .orderBy(desc(conversations.lastMessageAt), desc(conversations.id))
      .limit(options.limit + 1);

    const hasMore = rows.length > options.limit;
    const visible = hasMore ? rows.slice(0, options.limit) : rows;
    const hiddenWords = (await getPrivacySettings(viewerId)).hiddenWords;
    const items: InboxItem[] = visible.map((row) => {
      const status = requestStatus(row.requestStatus);
      const canRespondToRequest = row.requestRecipientId === viewerId && status === "pending";
      const previewText = row.preview ?? "No messages yet";
      const preview = canRespondToRequest
        ? "Message request — accept to view messages"
        : containsHiddenWord(previewText, hiddenWords)
          ? "Message hidden by your filters"
          : previewText;
      return {
        conversationId: row.conversationId,
        userId: row.userId,
        username: row.username,
        displayName: row.displayName ?? row.username,
        avatarUrl: row.avatarUrl,
        lastMessageAt: toIso(row.lastMessageAt),
        lastMessagePreview: preview,
        lastMessageDeleted: canRespondToRequest ? false : row.previewDeleted,
        unreadCount: canRespondToRequest ? 0 : numeric(row.unreadCount),
        requestStatus: status,
        canRespondToRequest,
      };
    });
    const last = visible.at(-1);

    return {
      items,
      nextCursor: hasMore && last
        ? encodePageCursor({
            createdAt: toIso(last.lastMessageAt),
            id: last.conversationId,
          })
        : null,
    };
  } catch (error) {
    logServerError("db.listInbox", error);
    throw new DatabaseError();
  }
}

/** Newest-first keyset page reversed into chronological chat order. */
export async function listMessages(
  conversationId: string,
  viewerId: string,
  options: { limit: number; cursor?: string | null },
): Promise<MessagePage> {
  validateConversationInput(conversationId, viewerId);
  const cursor = decodePageCursor(options.cursor);
  const header = await getConversationHeader(conversationId, viewerId);
  if (!header) return { items: [], nextCursor: null };

  try {
    const rows = await getDb()
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        content: messages.content,
        createdAt: messages.createdAt,
        deletedAt: messages.deletedAt,
      })
      .from(messages)
      .where(
        and(
          buildMessagePageCondition(conversationId, viewerId, cursor),
          buildConversationRequestAccessCondition(viewerId, conversationId),
        ),
      )
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(options.limit + 1);

    const hasMore = rows.length > options.limit;
    const visible = hasMore ? rows.slice(0, options.limit) : rows;
    const items: MessageItem[] = (
      await filterHiddenWords(
        viewerId,
        visible.map((row) => ({
          id: row.id,
          conversationId: row.conversationId,
          senderId: row.senderId,
          content: row.deletedAt ? "" : row.content,
          createdAt: toIso(row.createdAt),
          deleted: row.deletedAt !== null,
        })),
      )
    ).reverse();
    const oldest = visible.at(-1);

    return {
      items,
      nextCursor: hasMore && oldest
        ? encodePageCursor({ createdAt: toIso(oldest.createdAt), id: oldest.id })
        : null,
    };
  } catch (error) {
    logServerError("db.listMessages", error, { conversationId });
    throw new DatabaseError();
  }
}

export interface SentMessageResult {
  message: MessageItem;
  recipientUserId: string;
}

/**
 * Atomic single-statement send: participant check, client_id idempotency,
 * conversation ordering, and notification upsert. No broadcast happens here.
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  input: { content: string; clientId: string },
): Promise<SentMessageResult> {
  validateConversationInput(conversationId, senderId);
  if (!parseUserId(input.clientId)) throw new ValidationError("Invalid message identity.");

  try {
    const header = await getConversationHeader(conversationId, senderId);
    if (!header) throw new AuthorizationError();

    const result = await getDb().execute(
      buildSendMessageStatement({
        conversationId,
        senderId,
        clientId: input.clientId,
        content: input.content,
      }),
    );
    const row = extractRows<RawRow>(result)[0];
    if (!row) throw new ValidationError("That message could not be sent.");

    return {
      message: {
        id: String(row.id),
        conversationId,
        senderId,
        content: input.content,
        createdAt: toIso(row.created_at),
        deleted: false,
      },
      recipientUserId: header.userId,
    };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthorizationError) throw error;
    logServerError("db.sendMessage", error, { conversationId });
    throw new DatabaseError();
  }
}

/** Updates only the caller's participant row and clears their message notice. */
export async function markConversationRead(
  conversationId: string,
  viewerId: string,
): Promise<boolean> {
  validateConversationInput(conversationId, viewerId);

  try {
    const header = await getConversationHeader(conversationId, viewerId);
    if (!header) return false;

    const result = await getDb().execute(
      buildMarkConversationReadStatement(viewerId, conversationId),
    );
    const row = extractRows<RawRow>(result)[0];
    return numeric(row?.read_count) > 0;
  } catch (error) {
    logServerError("db.markConversationRead", error, { conversationId });
    throw new DatabaseError();
  }
}

/** Only the recipient can answer, and only while the row is still pending. */
export async function respondToConversationRequest(
  conversationId: string,
  recipientId: string,
  action: "accept" | "decline",
): Promise<boolean> {
  validateConversationInput(conversationId, recipientId);

  try {
    const rows = await getDb()
      .update(conversationRequests)
      .set({
        status: action === "accept" ? "accepted" : "declined",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(conversationRequests.conversationId, conversationId),
          eq(conversationRequests.recipientId, recipientId),
          eq(conversationRequests.status, "pending"),
        ),
      )
      .returning({ id: conversationRequests.id });
    return rows.length > 0;
  } catch (error) {
    logServerError("db.respondToConversationRequest", error, { conversationId });
    throw new DatabaseError();
  }
}

export async function getUnreadMessageCount(viewerId: string): Promise<number> {
  if (!parseUserId(viewerId)) return 0;

  try {
    const result = await getDb().execute(sql`
      select least(count(*), 100)::int as count
      from messages m
      inner join conversation_participants cp
        on cp.conversation_id = m.conversation_id and cp.user_id = ${viewerId}
      where ${buildUnreadMessageCondition(viewerId)}
        and ${buildConversationRequestAccessCondition(viewerId, sql`m.conversation_id`)}
    `);
    return numeric(extractRows<RawRow>(result)[0]?.count);
  } catch (error) {
    logServerError("db.getUnreadMessageCount", error);
    throw new DatabaseError();
  }
}

/** One combined endpoint prevents duplicate badge queries in the shell. */
export async function getUnreadCounts(viewerId: string): Promise<UnreadCounts> {
  if (!parseUserId(viewerId)) return { messages: 0, notifications: 0 };

  try {
    const result = await getDb().execute(sql`
      select
        (
          select least(count(*), 100)::int
          from messages m
          inner join conversation_participants cp
            on cp.conversation_id = m.conversation_id and cp.user_id = ${viewerId}
          where ${buildUnreadMessageCondition(viewerId)}
            and ${buildConversationRequestAccessCondition(viewerId, sql`m.conversation_id`)}
        ) as messages,
        (
          select count(*)::int
          from notifications n
          where n.recipient_id = ${viewerId}::uuid and n.read_at is null
        ) as notifications
    `);
    const row = extractRows<RawRow>(result)[0];
    return {
      messages: numeric(row?.messages),
      notifications: numeric(row?.notifications),
    };
  } catch (error) {
    logServerError("db.getUnreadCounts", error);
    throw new DatabaseError();
  }
}
