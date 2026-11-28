import { sql, type SQL } from "drizzle-orm";
import { conversationRequests, conversations, messages } from "@/lib/db/schema";
import type { PageCursor } from "@/lib/pagination";

/**
 * Pure SQL builders for Block 10. All untrusted values are parameters; only
 * fixed schema identifiers appear in the templates. The Neon HTTP driver has no
 * interactive transactions, so multi-step writes use one statement with CTEs.
 */

/** Application user IDs sorted lexically; never derived from a client payload. */
export function buildPairKey(firstId: string, secondId: string): string {
  return [firstId, secondId].sort().join(":");
}

function conversationCursorCondition(cursor: PageCursor | null): SQL {
  if (!cursor) return sql`true`;
  return sql`
    (
      ${conversations.lastMessageAt} < ${cursor.createdAt}::timestamptz
      or (
        ${conversations.lastMessageAt} = ${cursor.createdAt}::timestamptz
        and ${conversations.id} < ${cursor.id}
      )
    )
  `;
}

function messageCursorCondition(cursor: PageCursor | null): SQL {
  if (!cursor) return sql`true`;
  return sql`
    (
      m.created_at < ${cursor.createdAt}::timestamptz
      or (m.created_at = ${cursor.createdAt}::timestamptz and m.id < ${cursor.id})
    )
  `;
}

/**
 * Creates the conversation and both participant rows in one statement. The
 * unique pair_key and participant index absorb concurrent Message clicks; the
 * username lookup and self-check stay server-side.
 */
export function buildCreateConversationStatement(
  viewerId: string,
  username: string,
): SQL {
  const pair = sql`concat(least(${viewerId}::text, t.id::text), ':', greatest(${viewerId}::text, t.id::text))`;

  return sql`
    with target as (
      select u.id
      from users u
      where lower(u.username) = ${username}
        and u.id <> ${viewerId}::uuid
    ),
    inserted as (
      insert into conversations (pair_key)
      select ${pair}
      from target
      on conflict (pair_key) do nothing
      returning id
    ),
    conversation as (
      select id from inserted
      union all
      select c.id
      from conversations c, target t
      where c.pair_key = ${pair}
        and not exists (select 1 from inserted)
    ),
    participants as (
      insert into conversation_participants (conversation_id, user_id)
      select c.id, p.user_id
      from conversation c
      cross join target t
      cross join lateral (values (${viewerId}::uuid), (t.id)) as p(user_id)
      on conflict (conversation_id, user_id) do nothing
      returning id
    )
    select c.id
    from conversation c
    where exists (select 1 from target)
      and (select count(*) from participants) >= 0
    limit 1
  `;
}

/** Every message read/write rechecks membership inside the SQL statement. */
export function buildConversationAccessCondition(
  viewerId: string,
  conversationId: string,
): SQL {
  return sql`
    ${conversations.id} = ${conversationId}
    and exists (
      select 1
      from conversation_participants cp
      where cp.conversation_id = conversations.id
        and cp.user_id = ${viewerId}
    )
  `;
}

/**
 * Request state is role-aware: recipients are blocked while pending or declined;
 * request senders stay open while pending but lose access once declined.
 */
export function buildConversationRequestAccessCondition(
  viewerId: string,
  conversationId: SQL | string = sql`${conversations.id}`,
): SQL {
  return sql`
    not exists (
      select 1 from ${conversationRequests} cr
      where cr.conversation_id = ${conversationId}
        and (
          (cr.recipient_id = ${viewerId} and cr.status in ('pending', 'declined'))
          or (cr.sender_id = ${viewerId} and cr.status = 'declined')
        )
    )
  `;
}

/** Inbox rows hide declined requests; pending rows remain safe, respondable cards. */
export function buildInboxRequestCondition(viewerId: string): SQL {
  return sql`
    not exists (
      select 1 from ${conversationRequests} cr
      where cr.conversation_id = ${conversations.id}
        and cr.status = 'declined'
        and (cr.recipient_id = ${viewerId} or cr.sender_id = ${viewerId})
    )
  `;
}

/** Unread rows are other participants' live messages after this user's read mark. */
export function buildUnreadMessageCondition(viewerId: string): SQL {
  return sql`
    m.deleted_at is null
    and m.sender_id <> ${viewerId}
    and m.created_at > coalesce(cp.last_read_at, cp.joined_at)
  `;
}

/** Inbox ordering uses a stable (last_message_at, id) keyset. */
export function buildInboxCondition(
  viewerId: string,
  cursor: PageCursor | null,
): SQL {
  return sql`
    ${conversationCursorCondition(cursor)}
    and exists (
      select 1
      from conversation_participants cp
      where cp.conversation_id = conversations.id
        and cp.user_id = ${viewerId}
    )
  `;
}

export function buildMessagePageCondition(
  conversationId: string,
  viewerId: string,
  cursor: PageCursor | null,
): SQL {
  return sql`
    m.conversation_id = ${conversationId}
    and exists (
      select 1
      from conversation_participants cp
      where cp.conversation_id = m.conversation_id
        and cp.user_id = ${viewerId}
    )
    and ${messageCursorCondition(cursor)}
  `;
}

/**
 * One statement enforces membership, idempotency by (sender_id, client_id),
 * conversation ordering, and a content-free message notification. Broadcast is
 * published by the caller only after this statement succeeds.
 */
export function buildSendMessageStatement(input: {
  conversationId: string;
  senderId: string;
  clientId: string;
  content: string;
}): SQL {
  const { conversationId, senderId, clientId, content } = input;

  return sql`
    with member as (
      select cp.user_id
      from conversation_participants cp
      where cp.conversation_id = ${conversationId}
        and cp.user_id = ${senderId}
    ),
    inserted as (
      insert into messages (conversation_id, sender_id, client_id, content)
      select ${conversationId}::uuid, ${senderId}::uuid, ${clientId}::uuid, ${content}
      from member
      on conflict (sender_id, client_id) do nothing
      returning id, created_at, conversation_id
    ),
    existing as (
      select m.id, m.created_at, m.conversation_id
      from messages m, member
      where m.sender_id = ${senderId}::uuid
        and m.client_id = ${clientId}::uuid
    ),
    message as (
      select id, created_at, conversation_id from inserted
      union all
      select id, created_at, conversation_id from existing
      where not exists (select 1 from inserted)
    ),
    touched as (
      update conversations c
      set last_message_at = greatest(c.last_message_at, m.created_at), updated_at = now()
      from message m
      where c.id = ${conversationId}::uuid
        and m.conversation_id = ${conversationId}::uuid
      returning c.id
    ),
    -- Retries reuse the existing message without re-announcing it.
    notified as (
      insert into notifications (
        recipient_id, actor_id, type, entity_id, message, created_at
      )
      select other.user_id, ${senderId}::uuid, 'message', ${conversationId}::uuid, '', m.created_at
      from member other
      cross join inserted m
      where other.user_id <> ${senderId}::uuid
        and not exists (
          select 1 from conversation_requests cr
          where cr.conversation_id = ${conversationId}::uuid
            and cr.recipient_id = other.user_id
            and cr.status in ('pending', 'declined')
        )
      on conflict (recipient_id, actor_id, type, entity_id)
      do update set created_at = excluded.created_at, read_at = null
      returning id
    )
    select m.id, m.created_at
    from message m
    where exists (select 1 from touched)
    limit 1
  `;
}

/** Only the participant whose read state is changed can update last_read_at. */
export function buildMarkConversationReadStatement(
  viewerId: string,
  conversationId: string,
): SQL {
  return sql`
    with updated as (
      update conversation_participants
      set last_read_at = now()
      where conversation_id = ${conversationId}::uuid
        and user_id = ${viewerId}::uuid
      returning user_id
    ),
    cleared as (
      update notifications
      set read_at = now()
      where recipient_id = ${viewerId}::uuid
        and type = 'message'
        and entity_id = ${conversationId}::uuid
        and read_at is null
        and exists (select 1 from updated)
      returning id
    )
    select (select count(*) from updated)::int as read_count
  `;
}

/** Used by tests to prove deleted content can never be selected into a DTO. */
export function buildLiveMessageCondition(): SQL {
  return sql`${messages.deletedAt} is null`;
}
