# Backend foundation (Blocks 4–11A)

This document describes the backend introduced in Block 4 and extended through
Block 10. Blocks 1–3 (design system, landing page, and auth UI) are preserved.
Block 4 wired those screens to Neon and Supabase; Block 5 added profile/follow
data, Blocks 7–9 added posts/engagement/stories, and Block 10 added one-to-one
messaging and notifications. Block 5 details live in `docs/PROFILES.md`.

## Responsibilities

| Concern | Owner | Notes |
| --- | --- | --- |
| UI | Next.js App Router, React, Tailwind | Existing Luma design system; no redesign |
| Application logic | Server actions in `app/actions/`, services in `lib/` | Zod validation, rate limiting, safe errors |
| Primary database | Neon PostgreSQL | App data: profiles, social graph, posts, engagement, stories, conversations, messages, and notifications |
| ORM | Drizzle via `getDb()` | Lazy, cached `neon-http` client |
| Identity provider | Supabase Auth | Sessions in HttpOnly-ish cookies via `@supabase/ssr` |
| Storage | Supabase Storage | Validated owner-scoped uploads for avatars, covers, and post media |
| Session refresh | `proxy.ts` (Next.js 16 name for middleware) | Optimistic refresh + auth-only redirects |

Neon is the **only application database**. Supabase's own Postgres is not used
as a second application database. Supabase Auth is the only source of identity.

## Environment variables

Copy `.env.example` to `.env.local`:

| Variable | Scope | Source | Used by |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | public | Your dev/deployment URL | Email redirect URLs |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase → Project Settings → API | Browser + server + proxy |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase → Project Settings → API | Browser + server + proxy |
| `DATABASE_URL` | **server only** | Neon Console → Connection details (pooled string) | Drizzle/Neon client, migrations |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Supabase → Project Settings → API → `service_role` | Admin client only |

Rules:

- Only `NEXT_PUBLIC_*` values may be read in client code, and all reads go
  through `lib/env/index.ts`.
- `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are never prefixed with
  `NEXT_PUBLIC_` and are never returned to the browser.
- Env vars are validated on demand, never at module import time.
- `.env*` is gitignored; only `.env.example` is committed.

## Database

### Schema

`lib/db/schema.ts` contains the application tables below. Media bytes stay in
Supabase Storage; Neon stores metadata URLs and constraints only.

- **users**: `id` (UUID PK), `auth_user_id` (UUID, unique), `email`, `username`
  (unique), admin-controlled `role`/`account_status` with suspension/ban times,
  `created_at`, `updated_at`.
- **profiles**: `id` (UUID PK), `user_id` (unique, FK → `users.id` on delete
  cascade), `display_name`, `bio`, `avatar_url`, `cover_url`, `website`,
  `location`, `is_private`, self-described `account_category`,
  `professional_roles`, `professional_details`, `created_at`, `updated_at`.
- **follows**: `id` (UUID PK), `follower_id`/`following_id` (FK → `users.id`,
  cascade), `created_at`, unique pair, self-follow CHECK.
- **posts**: `id` (UUID PK), `user_id` (FK → `users.id`, cascade), `caption`,
  `created_at`, `updated_at`, caption-length CHECK.
- **post_media**: `id` (UUID PK), `post_id` (FK → `posts.id`, cascade),
  `storage_path` (unique), `public_url`, `mime_type`, `byte_size`, optional
  `width`/`height`/`alt_text`, `position`, `created_at`; unique
  `(post_id, position)` plus positive-size/position CHECKs.
- **post_hashtags**: `id` (UUID PK), `post_id` (FK → `posts.id`, cascade),
  normalized `tag`, `position`, `created_at`; unique `(post_id, tag)`.
- **post_likes**: `id` (UUID PK), `user_id` (FK → `users.id`, cascade),
  `post_id` (FK → `posts.id`, cascade), `created_at`; unique `(user_id, post_id)`
  prevents duplicate likes.
- **comments**: `id` (UUID PK), `post_id` (FK → `posts.id`, cascade), `user_id`
  (FK → `users.id`, cascade), `content`, `created_at`, `updated_at`; length
  CHECK (1–1000), `(post_id, created_at, id)` index for cursor paging.
- **stories / story_views / story_reactions**: 24-hour photo stories with a
  server-generated `expires_at`, unique view/reaction pairs, allowed-emoji CHECK,
  and cascading FKs. Every read filters `expires_at > now()`.
- **conversations / conversation_participants**: one-to-one chats keyed by a
  unique sorted user-ID `pair_key`; exactly two participant rows carry per-user
  `last_read_at`. No group-chat state exists.
- **messages**: text-only rows with cascading conversation/sender FKs, unique
  `(sender_id, client_id)` idempotency key, `deleted_at` tombstone, 1–4000
  character CHECK, and `(conversation_id, created_at, id)` paging index.
- **notifications**: one row per `(recipient_id, actor_id, type, entity_id)`
  with recipient/actor FKs, allowed-type CHECK (including `moderation`,
  `report_update`, `appeal_update`), `read_at`, and no message text or email
  copied into the row.
- **privacy/graph**: `profile_privacy_settings`, `close_friends`,
  `story_audience_entries`, `user_relationships`, `follow_requests`, and
  `conversation_requests` hold owner-controlled audiences, block/restrict/mute,
  private-account requests, and permission-gated DMs with uniqueness/self-checks.
- **professional**: `profile_links` and `portfolio_projects` store safe HTTP(S)
  URLs, ordering, visibility, and optional category-aware portfolio metadata;
  professional fields grant no verification or authority.
- **trust/risk**: `trust_hypes` has one durable row per giver/target pair and is
  the only source for community trust; `risk_assessments` and
  `risk_assessment_history` are admin-only, with absence meaning unassessed.
- **safety**: `reports`, immutable `report_evidence`, `report_evidence_access`,
  `moderation_actions`, `appeals`, and `audit_logs` carry duplicate detection,
  category-derived priority, bounded chat snapshots, authorized-access records,
  reasons, actor identity, and append-only history. No automatic deletion or
  volume-based punishment exists.

Indexes cover all authorization and paging paths, including unique user,
follow, like, story view/reaction, conversation pair, participant pair, message
idempotency, and notification dedupe keys, plus composite cursor/read-state
indexes. Usernames are normalized to lowercase by the shared Zod schema before
any write; `users.username` is the only authoritative username column and the
`lower(username)` unique index is defense in depth. Saved posts are still
deferred.

### Migrations

```bash
npm run db:generate   # generate SQL from lib/db/schema.ts (no DB connection required)
npm run db:migrate    # apply generated migrations to DATABASE_URL
npm run db:studio     # inspect the database with Drizzle Studio
npm run db:push       # development-only schema push; avoid on shared/production DBs
```

Generated migrations: `0000_nosy_zaran.sql` (Block 4),
`0001_high_quentin_quire.sql` (Block 5: follows + location),
`0002_posts_media.sql`, `0003_post_hashtags.sql`,
`0004_watery_psynapse.sql` (likes + comments),
`0005_spooky_mach_iv.sql`, `0006_stories.sql` (Block 9),
`0007_short_korg.sql` (Block 10 conversations/messages/notifications), and
`0008_chubby_the_call.sql` (Block 11A privacy/professional/trust/safety). All were
generated locally and reviewed; they do not delete application data and have
**not** been applied to a remote database because no real Neon credentials were
available. `0008` widens the notification type CHECK and adds defaulted columns
plus new tables/constraints. Apply them in order with `npm run db:migrate` after
setting `DATABASE_URL`. Never run a destructive migration against a database
with data without reviewing it first.

## Identity mapping

```text
Supabase Auth user.id  →  users.auth_user_id  →  profiles.user_id
```

1. `signupAction` validates the form with the shared Zod schema, checks
   username availability in Neon, and calls `supabase.auth.signUp`.
2. The `auth_user_id` written to Neon comes only from Supabase's server
   response. Client-supplied IDs are never accepted.
3. `initializeAppUser` uses one parameterized SQL statement with CTEs:
   - `INSERT users ... ON CONFLICT (auth_user_id) DO UPDATE`;
   - `INSERT profiles ... ON CONFLICT (user_id) DO NOTHING`.
   This is idempotent, prevents duplicate profiles, and is atomic within the
   statement (safe on the `neon-http` driver, which has no interactive
   transactions).
4. A username race surfaces as a field error. Other database failures are
   logged server-side and returned as a `needs-retry` state — never silently
   ignored.
5. Login always calls `ensureAppUserForAuthenticatedUser`, which retries the
   mapping using the verified session user ID. `retryProfileSetupAction` is an
   explicit retry path shown on `/verify-email`.

## Auth flows

| Flow | Entry point | Backend |
| --- | --- | --- |
| Signup | `SignupForm` → `signupAction` | Supabase `signUp`, Neon user/profile init |
| Login | `LoginForm` → `loginAction` | Supabase `signInWithPassword`, mapping recovery |
| Logout | `LogoutButton` → `logoutAction` | Supabase `signOut`, cookie clearing |
| Email verification | `/auth/confirm?token_hash=...&type=...` | Supabase `verifyOtp` (type allowlist) |
| PKCE callback | `/auth/callback?code=...` | Supabase `exchangeCodeForSession` |
| Resend verification | `VerifyEmailForm` → `resendVerificationAction` | Supabase `resend` |
| Forgot password | `ForgotPasswordForm` → `forgotPasswordAction` | Supabase `resetPasswordForEmail` |
| Reset password | `ResetPasswordForm` → `resetPasswordAction` | Token exchange / `updateUser` |

`proxy.ts` refreshes the session with `supabase.auth.getUser()` and redirects
authenticated visitors away from `/login` and `/signup`. Unauthenticated access
to protected prefixes redirects to `/login?next=...`. Block 5 protects
`/profile/edit` with exact-or-child matching; public profile pages remain
public. `isProtectedRoute()` in `lib/auth/constants.ts` avoids accidental
matches such as `/profile/editor`.

### Email template setup

In Supabase → Authentication → email templates, use URLs that point back to
this app:

- Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
- Recovery: `{{ .SiteURL }}/reset-password` (implicit tokens are handled by the
  browser client) or the `/auth/confirm` pattern with `type=recovery`.

Set the project Site URL to `NEXT_PUBLIC_APP_URL`. Do not disable email
confirmation in production unless you intentionally accept instant sessions;
the app handles both cases.

## Route protection data layer

`lib/auth/dal.ts` exposes:

- `getCurrentUser()` — cached, server-verified Supabase user or `null`.
- `requireAuthenticatedUser()` — redirects to `/login` when absent.
- `getCurrentProfile()` — joins the server-derived identity to Neon.
- `requireProfile()` — fails closed for owner-only features such as `/profile/edit`.

These are server-only and are not imported by client components. Proxy checks
are optimistic; server actions and the DAL perform the authoritative checks.

## Security measures

- Zod validation on client **and** server, including normalized usernames.
- Server-derived identity only; no frontend user IDs or auth IDs trusted.
- Parameterized Drizzle SQL; no string interpolation of user input.
- Service-role key and Neon URL never sent to the browser.
- Safe, curated error messages; raw SDK/database errors logged server-side.
- Redirect destinations restricted to same-origin paths.
- In-process rate-limit preparation on auth, profile/follow/search, story,
  conversation/message, notification, report, and appeal endpoints. Replace with
  a shared store before multi-instance deployment.
- Database constraints back application checks for usernames, follow uniqueness,
  self-follows, caption/media limits, pair/idempotency/notification dedupe,
  message/notifications length and type checks, and cascade deletion.
- Messaging and notification APIs derive sender/recipient identity only from the
  verified session, require conversation membership or recipient ownership,
  revalidate navigation targets, and never return private message text in a
  notification or Broadcast payload.
- Uploads use owner-namespaced paths, MIME allowlists, magic-byte checks, and
  request-scoped Supabase clients so Storage RLS still applies.
- Block 11A derives all staff authority from the verified session plus the Neon
  role; admin-only risk writes and staff report reads are rechecked in services.
  Reporter identity is hidden from targets and non-admin staff, evidence is
  immutable and access-audited, and moderation notices carry no private content.
- Privacy decisions are rechecked in every post/feed/comment/like/story/search/
  message read or write. Private account visibility, block/restrict/mute,
  hidden words, and audience rules are enforced server-side, not only in UI.
- Professional category, hypes, reports, and risk never grant role, verification,
  or privilege. Report priority comes from category alone; volume never changes
  risk or triggers punishment. No moderation action deletes user content.

## Realtime architecture

Neon is the authoritative application database, so **Supabase Postgres Changes
cannot observe Neon tables**. Block 10 uses Supabase Broadcast only as an
optional refresh signal:

- Server services persist to Neon first, then `lib/realtime/publish.ts` sends
  opaque `message`/`notification` signals to `conversation:<id>` and
  `user:<id>` channels with `httpSend` and the server-only service-role key.
- Missing Supabase service configuration disables publishing; writes and
  polling still work. Failed broadcasts are logged and never fail a mutation.
- The social shell owns one user-channel subscription per signed-in tab; one
  additional subscription exists only while a conversation is open. Signals
  contain no message text and only cause authenticated API refetches.
- Bounded polling with hidden-tab pausing is the fallback, not a second source
  of truth. Typing indicators and presence are deliberately not implemented.

Do not enable Supabase Postgres Changes as a substitute for Neon replication.

## Storage

`lib/storage/index.ts` defines bucket names (`avatars`, `post-media`, `stories`,
`message-attachments`). `lib/storage/upload.ts` uploads validated bytes with the
request-scoped Supabase client; `lib/storage/paths.ts` keeps every object under
the verified auth user's prefix. Upload size limits are enforced in application
code and by `experimental.serverActions.bodySizeLimit` in `next.config.ts`.

Buckets and owner-write policies must be created in Supabase before uploads
work; `docs/PROFILES.md` includes the SQL. The service-role key is not used for
uploads. Image bytes are never written to Neon.

## Testing and status

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

`npm test` uses Node's built-in test runner with a tiny local TS resolve hook;
no new dependency was added. It covers validation, schema shape, identity
input rejection, atomic/idempotent SQL generation, rate limiting, redirects,
safe error mapping, social constraints, cursors, messaging idempotency and
read state, notification dedupe/guards/navigation, Block 11A schema/trust
formula/validation/separation, and migration safety. Real
Neon integration tests are opt-in via `LUMA_DB_INTEGRATION=1` plus
`DATABASE_URL` against an already-migrated test database and are skipped by
default.

Remote integration (real Supabase signup/login/email delivery and real Neon
migration/query/Broadcast execution) is **not verified** without credentials.
See `docs/PROFILES.md` and the completion report for the implemented / locally
verified / pending split.
