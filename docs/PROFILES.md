# Profiles and social graph (Block 5, expanded)

Block 5 provides real public profiles, a secure directed social graph, validated
avatar/cover uploads, a database-backed post grid/count, social dialogs, and
suggested accounts. Blocks 1–4 are preserved. Block 7 adds the social feed,
likes, and comments; stories, messaging, notifications, and save state remain
out of scope.

## Username authority

`users.username` is the **single authoritative username source**. It is stored
lowercase by the shared Zod schema and protected by a unique constraint plus a
case-insensitive `lower(username)` index. `profiles` has no duplicate username
column. Profile links, lookup, search, edits, follow actions, and storage paths
resolve through session-derived IDs or this one field.

## Schema

```text
users (existing)
  id, auth_user_id, email, username, created_at, updated_at

profiles (existing + location)
  id, user_id -> users.id (unique, cascade), display_name,
  bio, avatar_url, cover_url, website, location, created_at, updated_at

follows (Block 5)
  id uuid PK default gen_random_uuid()
  follower_id   -> users.id ON DELETE CASCADE
  following_id  -> users.id ON DELETE CASCADE
  created_at timestamptz default now()
  UNIQUE (follower_id, following_id)
  INDEX (follower_id), INDEX (following_id), INDEX (created_at)
  CHECK (follower_id <> following_id)

posts (Block 5 grid foundation; completed in Block 6)
  id uuid PK, user_id -> users.id ON DELETE CASCADE,
  caption text, created_at, updated_at
  INDEX (user_id), INDEX (user_id, created_at), INDEX (created_at)
  CHECK (length(caption) <= 2200)

post_media (metadata only)
  id uuid PK, post_id -> posts.id ON DELETE CASCADE,
  storage_path text UNIQUE, public_url text, mime_type text,
  byte_size int, width int, height int, alt_text text,
  position int, created_at
  UNIQUE (post_id, position)
  CHECK (position >= 0), CHECK (byte_size > 0)

post_hashtags
  id uuid PK, post_id -> posts.id ON DELETE CASCADE,
  tag text, position int, created_at
  UNIQUE (post_id, tag), UNIQUE (post_id, position), INDEX (tag)
  CHECK (tag ~ '^[a-z0-9_]{1,30}$')
```

Migrations are additive:

- `drizzle/0001_high_quentin_quire.sql` — follows + profile location.
- `drizzle/0002_posts_media.sql` — posts + post_media metadata.
- `drizzle/0003_post_hashtags.sql` — normalized hashtag metadata.

No remote migration was applied from this environment. Apply with
`npm run db:migrate` after reviewing generated SQL with real credentials.
`db:push` is not part of the safe migration workflow.

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/profile/[username]` | Public | Header, DB-backed counts, follow/edit action, real post grid, dialogs, suggestions |
| `/profile/[username]/followers` | Public | Cursor-paginated fallback page for follower list |
| `/profile/[username]/following` | Public | Cursor-paginated fallback page for following list |
| `/profile/edit` | Authenticated owner | Avatar/cover uploads plus public detail editing |
| `/api/users/search?q=…` | Authenticated | Bounded, rate-limited username prefix lookup |
| `/posts`, `/post/[postId]` | Public | Completed in Block 6 |

Public profiles remain reachable without a Supabase session. `proxy.ts`
performs optimistic protection for `/profile/edit` with exact-or-child matching;
the DAL rechecks the verified session in every action and protected route.

Loading, not-found, empty, and failure states are explicit. Data failures render
`ErrorState` with a retry link rather than an invented empty result.

## Server operations

- `lib/db/profiles.ts`: public profile lookups, username availability, owner
  profile update, and `updateProfileImage` for avatar/cover URLs.
- `lib/db/follows.ts`: follow/unfollow, viewer status, counts, and cursor lists.
- `lib/db/users.ts`: bounded search and real suggested users excluding the
  viewer and accounts they already follow.
- `lib/db/posts.ts`: post count, profile grid, detail/feed projections,
  owner-scoped mutation helpers, and media/hashtag metadata inserts.
- `lib/db/post-query.ts`: keyset order/predicate helpers that bind full-precision
  PostgreSQL timestamps and parameterized hashtag filters.
- `lib/pagination.ts`: opaque cursor helpers and bounded page sizes.
- `lib/storage/image-validation.ts`: MIME allowlist, byte-size limits, and magic
  byte sniffing. No browser value is trusted.
- `lib/storage/paths.ts`: owner-namespaced object keys with traversal stripping.
- `lib/storage/upload.ts`: server-only Supabase Storage upload/remove helpers.

Follower/following and post pages use keyset cursors from `created_at` plus the
row UUID. Full microsecond timestamps are preserved so same-millisecond rows
are not skipped. Counts come from indexed scalar queries, not constants.

## Actions and ownership

- `app/actions/profile.ts` derives the owner from `getCurrentProfile()`. It
  accepts no user ID, profile ID, or target username.
- `app/actions/profile-media.ts` derives both the database owner and the storage
  prefix from the verified session. The client sends only `kind` and `image`.
- `app/actions/follows.ts` derives the follower from the session. The client
  sends only a validated target username and intent. Self-follows are rejected
  and duplicate follows are absorbed by the database unique constraint.
- `app/actions/social.ts` loads additional public follow pages for dialogs.
- `app/api/posts/route.ts` accepts authenticated multipart uploads. It requires a
  same-origin `Origin`, derives identity from the session, revalidates every
  image, and rolls back both storage objects and DB rows if metadata writes fail.
- `app/actions/posts.ts` edits and deletes only posts owned by the session user;
  no owner ID is accepted from the client.
- Follow buttons use `useOptimistic` for instant feedback; the server result is
  the source of truth and failures restore the confirmed state.

## Storage configuration

Buckets must be created before uploads work:

```sql
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('post-media', 'post-media', true)
on conflict (id) do nothing;
```

Paths begin with the Supabase auth user UUID:
`<auth_user_id>/profile/avatar`, `<auth_user_id>/profile/cover`, and
`<auth_user_id>/posts/<post_id>/...`. Public read is required for profile images;
write policies must restrict the first path segment to `auth.uid()`:

```sql
create policy "owners manage own avatar objects"
on storage.objects for all to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

Use the same policy for `post-media`, with public `select` for rendered media.
The app uploads through the request-scoped Supabase client, so RLS still applies;
the service-role key is not used for uploads.

## Security notes

- Mutable inputs pass through Zod in `lib/validations/profile.ts` and
  `lib/validations/post.ts`.
- Database constraints back validation for uniqueness, self-follows, caption
  size, media order, and referential integrity.
- SQL values are parameterized; identifiers are fixed schema constants.
- Public projections never include email, auth IDs, tokens, or service config.
- Uploads are limited to JPEG/PNG/WebP/GIF with server-side magic-byte checks.
- Object keys are namespaced by the verified auth user and stripped of `..`.
- Sensitive operations use the existing in-process rate limiter; a shared store
  is required for multi-instance production.

## Tests and limitations

`npm test` covers schema constraints, validation, SQL parameterization, cursors,
storage path safety, image sniffing, hashtag normalization, caption rendering,
same-origin writes, post media hints, migration safety, route protection, and
safe display helpers. A real Neon integration test is skipped unless
`LUMA_DB_INTEGRATION=1` and `DATABASE_URL` point to an already-migrated test
database.

Known limitations:

- No remote Neon migration or live authenticated browser flow was executed here.
- Supabase buckets/policies must be created before real uploads work.
- The in-memory rate limiter is per process.
- Tagged media remains an honest empty state until tagging exists.
- Likes and comments are implemented in Block 7 (`post_likes`, `comments`); save state and comment replies remain out of scope.
