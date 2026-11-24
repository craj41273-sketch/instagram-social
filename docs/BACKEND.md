# Backend foundation (Block 4)

This document describes the backend introduced in Block 4 and extended in Block
5. Blocks 1–3 (design system, landing page, and auth UI) are preserved. Block 4
wired those screens to Neon and Supabase; Block 5 added profile/follow data and
operations. Block 5 details live in `docs/PROFILES.md`.

## Responsibilities

| Concern | Owner | Notes |
| --- | --- | --- |
| UI | Next.js App Router, React, Tailwind | Existing Luma design system; no redesign |
| Application logic | Server actions in `app/actions/`, services in `lib/` | Zod validation, rate limiting, safe errors |
| Primary database | Neon PostgreSQL | App data: `users`, `profiles`, `follows`, `posts`, `post_media`, `post_hashtags` |
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
  (unique), `created_at`, `updated_at`.
- **profiles**: `id` (UUID PK), `user_id` (unique, FK → `users.id` on delete
  cascade), `display_name`, `bio`, `avatar_url`, `cover_url`, `website`,
  `location`, `created_at`, `updated_at`.
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

Indexes: unique indexes on `users.auth_user_id`, `users.username`,
`lower(users.username)`, `profiles.user_id`, and
`(follows.follower_id, follows.following_id)`; plain indexes on `users.email`,
`profiles.created_at`, `follows.follower_id`, `follows.following_id`, and
`follows.created_at`.

Usernames are normalized to lowercase by the shared Zod schema before any
write. The `lower(username)` unique index is defense in depth.
`users.username` is the only authoritative username column.

Like, comment, story, message, and notification tables do not exist.

### Migrations

```bash
npm run db:generate   # generate SQL from lib/db/schema.ts (no DB connection required)
npm run db:migrate    # apply generated migrations to DATABASE_URL
npm run db:studio     # inspect the database with Drizzle Studio
npm run db:push       # development-only schema push; avoid on shared/production DBs
```

Generated migrations: `drizzle/0000_nosy_zaran.sql` (Block 4),
`drizzle/0001_high_quentin_quire.sql` (Block 5: `follows` + `location`),
`drizzle/0002_posts_media.sql` (posts + media metadata), and
`drizzle/0003_post_hashtags.sql` (normalized hashtags). All were generated
locally; they have **not** been applied to a remote database because no real
Neon credentials were available. Apply them in order with `npm run db:migrate`
after setting `DATABASE_URL`. Never run a destructive migration against a
database with data without reviewing it first.

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
- In-process rate-limit preparation on signup/login/recovery/resend and Block 5
  profile/follow/search endpoints. Replace with a shared store before
  multi-instance deployment.
- Database constraints back application checks for usernames, follow uniqueness,
  self-follows, caption/media limits, and cascade deletion.
- Uploads use owner-namespaced paths, MIME allowlists, magic-byte checks, and
  request-scoped Supabase clients so Storage RLS still applies.

## Realtime architecture

Neon is the primary database, so **Supabase Postgres Changes cannot be assumed
to observe Neon tables**. For future live features (Block 8 messaging,
notifications, presence) use one of:

- Supabase **Broadcast**/**Presence** with the Realtime WebSocket transport,
  publishing events from server-side mutations;
- server-sent events or application WebSockets backed by Neon changes;
- a dedicated event/outbox table in Neon plus a publisher.

Do not enable Supabase Postgres Changes as a substitute for Neon replication.
No messaging or realtime feature is implemented in this block.

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
safe error mapping, follow constraints, cursors, and migration safety. A real
Neon constraint test is opt-in via `LUMA_DB_INTEGRATION=1` plus `DATABASE_URL`
against an already-migrated test database.

Remote integration (real Supabase signup/login/email delivery and real Neon
migration/query execution) is **not verified** without credentials. See
`docs/PROFILES.md` and the completion report for the implemented / locally
verified / pending split.
