# Profiles and social graph (Block 5)

Block 5 adds real public profiles and a secure directed social graph on the
existing Next.js 16 / Neon / Drizzle / Supabase foundation. Blocks 1–4 are
preserved; no posts, feed, likes, stories, messaging, notifications, Explore,
or recommendations were added.

## Username authority

`users.username` is the **single authoritative username source**. It is stored
lowercase by the shared Zod schema and protected by a unique constraint plus a
case-insensitive `lower(username)` index. `profiles` has no duplicate username
column. Profile links, lookup, search, and edits all resolve through this one
field. Changing a username updates `users.username` and the profile in one
parameterized SQL statement.

## Schema

```text
users (existing)
  id, auth_user_id, email, username, created_at, updated_at

profiles (existing + location)
  id, user_id -> users.id (unique, cascade), display_name,
  bio, avatar_url, cover_url, website, location, created_at, updated_at

follows (new)
  id uuid PK default gen_random_uuid()
  follower_id   -> users.id ON DELETE CASCADE
  following_id  -> users.id ON DELETE CASCADE
  created_at timestamptz default now()
  UNIQUE (follower_id, following_id)
  INDEX (follower_id)
  INDEX (following_id)
  INDEX (created_at)
  CHECK (follower_id <> following_id)
```

The follow edge means “`follower_id` follows `following_id`”. Both sides point
to application user UUIDs, never Supabase auth IDs. Uniqueness prevents
duplicate edges, the check constraint prevents self-follows even if application
validation is bypassed, and cascades keep the graph consistent when a user is
deleted.

Migration: `drizzle/0001_high_quentin_quire.sql`. It only creates `follows` and
adds the nullable `location` column; the Block 4 migration
`drizzle/0000_nosy_zaran.sql` is untouched. No database was reset and no remote
migration was applied from this environment.

### Applying migrations

With real credentials in `.env.local`:

```bash
npm run db:generate # only when schema changes; no connection needed
npm run db:migrate  # applies pending generated migrations to Neon
```

Review generated SQL before applying. `db:push` is not part of the safe
migration workflow.

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/profile/[username]` | Public | Profile header, DB-backed counts, follow/edit action, Posts/Tagged empty states |
| `/profile/[username]/followers` | Public | Cursor-paginated follower list with follow status/actions |
| `/profile/[username]/following` | Public | Cursor-paginated following list with follow status/actions |
| `/profile/edit` | Authenticated owner | Edit display name, username, bio, website, location |
| `/api/users/search?q=…` | Authenticated | Bounded, rate-limited username prefix lookup foundation |

Public profiles remain reachable without a Supabase session. `proxy.ts`
performs optimistic protection for `/profile/edit` using exact-or-child
matching, so a username such as `editor` is not accidentally protected. The DAL
rechecks the verified session on the server; `proxy.ts` is never the only
authorization boundary.

Loading and not-found states exist for profile, follower, following, and edit
routes. Data failures render `ErrorState` with a retry link rather than an
invented empty result.

## Server operations

Reusable server-only modules:

- `lib/db/profiles.ts`: `getPublicProfileByUsername`, `getPublicProfileByUserId`,
  `isUsernameAvailableForUser`, `updateOwnProfile`
- `lib/db/follows.ts`: `followUser`, `unfollowUser`, `isFollowing`,
  `getFollowCounts`, `listFollowers`, `listFollowing`
- `lib/db/follow-query.ts`: keyset order/predicate helpers that bind the exact
  microsecond timestamp from PostgreSQL into follow cursors
- `lib/db/users.ts`: `findUserById`, `searchUsersByUsername`
- `lib/db/profile-sql.ts`: parameterized atomic profile update statement
- `lib/pagination.ts`: opaque cursor encode/decode and bounded page size

Follower/following pages use keyset cursors built from `created_at` and the
follow row UUID. Each page performs one list query plus one batched status
query for the viewer; there is no per-row N+1 lookup. Counts come from indexed
scalar subqueries, not constants.

## Actions and ownership

- `app/actions/profile.ts` derives the owner from `getCurrentProfile()`. It
  accepts no user ID, profile ID, or target username from the client. A changing
  username is checked for availability, then both tables are updated atomically.
- `app/actions/follows.ts` derives the follower from the session. The only
  client inputs are a validated target username and an intent. It rejects
  self-follows, validates the target, rate-limits mutations, and revalidates
  affected profile/list paths.
- Unfollow deletes only `(viewer, target)` and is idempotent: a repeated delete
  is a successful no-op.
- Follow status is read from `follows`; the UI never treats a local toggle as
  source of truth.

## Security notes

- All mutable inputs pass through Zod schemas in `lib/validations/profile.ts`.
- Database constraints back validation for uniqueness, self-follows, and
  referential integrity.
- SQL values are parameterized; identifiers are fixed schema constants.
- Only safe public fields are selected for profile/search projections: no
  email, auth user ID, tokens, or service-role configuration.
- Sensitive operations use the existing in-process rate limiter. A shared store
  is still required for multi-instance production deployments.
- `SUPABASE_SERVICE_ROLE_KEY` remains confined to the existing admin client
  boundary and is not used by Block 5.
- Uploads are not implemented. `avatar_url` and `cover_url` are rendered only
  for absolute HTTP(S) values; otherwise a polished fallback is shown.

## Tests and limitations

`npm test` runs structural tests for schema constraints, validation, SQL
parameterization, cursors, migration safety, route protection, and safe display
helpers. A real Neon integration test is included but skipped unless both
`LUMA_DB_INTEGRATION=1` and `DATABASE_URL` are set against an already-migrated
**test** database; it only creates and then removes its own uniquely named rows.

Known limitations:

- No remote Neon migration or live query was executed here; credentials are not
  configured.
- No real Supabase signup/login was executed, so authenticated browser flows
  were not exercised end-to-end.
- The rate limiter is in-memory and per process.
- Supabase Storage buckets and upload policies are still unconfigured. Image
  fields and rendering are ready; no upload is faked.
- Posts/tagged tabs are intentionally honest empty states. Block 6 introduces
  real media content.
