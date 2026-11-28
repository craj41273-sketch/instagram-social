# Luma

Premium, dark-first photo-sharing experience built on Next.js. **Blocks 1–10 and Block 11A are complete locally.** Profiles include validated avatar/cover uploads, real social graph state, and a DB-backed post grid. Posts add multi-image creation, media viewing, owner-only editing/deletion, and a paginated feed. Block 7 adds a self/following social feed, database-backed likes, comments, and a post detail conversation. Block 8 adds a real-photo Explore grid, debounced global search, discover-people suggestions, and explainable trending. Block 9 adds 24-hour photo stories with a feed tray, full-screen viewer, unique view tracking, reactions, and owner-only deletion. Block 10 adds one-to-one messages, a notification center, unread badges, and optional realtime refresh signals. Block 11A adds privacy controls, professional identities, community trust, authenticated reporting with bounded chat evidence, admin risk/moderation/appeals, and real safety metrics. Remote Neon/Supabase verification still requires real credentials.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React Server Components) |
| Language | TypeScript (strict + extra checks) |
| Styling | Tailwind CSS v4 |
| UI | shadcn/ui (Radix primitives) + custom design-system wrappers |
| Icons | Lucide |
| Database | Neon PostgreSQL |
| ORM | Drizzle ORM + Drizzle Kit |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Storage / Realtime | Supabase Storage, Supabase Realtime |
| Validation | Zod |
| Package manager | npm |
| Source control | Git / GitHub |

## Design system

The original **Luma** identity uses a prism mark, near-black surfaces, violet accents, Geist + Instrument Serif typography, and subtle motion. Dark mode is the default; light mode is an optional toggle in the header.

- Live showcase: [`/design-system`](http://localhost:3000/design-system)
- Tokens and component reference: [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)
- Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Prerequisites

- Node.js 20.9+ (verified on Node.js 26)
- npm 10+
- Git
- A Neon PostgreSQL database and a Supabase project (needed from Block 4 onward)

## Getting started

```bash
cd projects/instagram-social
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. Every route — the landing page, design system, auth pages, and policy placeholders — renders without any external service configured. Environment variables are only read lazily when a data/auth module is actually used. `npm run build` writes a GitHub Pages-ready static export to `out/`; see [GitHub Pages hosting](#github-pages-hosting).

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Premium landing page with responsive navigation, hero, features, and illustrative social proof |
| `/design-system` | Living token and component showcase |
| `/login`, `/signup` | Real Supabase-backed authentication forms with shared Zod validation |
| `/forgot-password`, `/reset-password`, `/verify-email` | Real recovery/verification flows; no simulated success |
| `/auth/callback`, `/auth/confirm` | Supabase PKCE and OTP confirmation endpoints |
| `/profile/[username]` | Public profile with real counts, follow/edit actions, social dialogs, suggestions, and a DB-backed post grid |
| `/profile/[username]/followers`, `/following` | Cursor-paginated social graph lists |
| `/profile/edit` | Authenticated, owner-only profile editor with avatar/cover uploads |
| `/api/users/search` | Authenticated, rate-limited username lookup foundation |
| `/posts` | Authenticated self/following feed (public recent posts when signed out), hashtag filter, cursor Load More, and follow/create empty state |
| `/explore` | Public photo grid with real hashtag filters, cursor pagination, explainable trending, and discover-people suggestions |
| `/search` | Authenticated people/caption search with debouncing, tabs, bounded results, and retry states |
| `/api/search` | Authenticated, rate-limited combined/person/post search JSON endpoint |
| `/post/[postId]` | Post detail with like state, paginated comments, owner-only comment deletion, and loading/error states |
| `/stories/create` | Authenticated single-image story composer with real upload progress |
| `/stories/[userId]` | Full-screen story viewer with progression, pause/resume, keyboard/tap navigation, views, reactions, and owner deletion |
| `/stories/viewers/[storyId]` | Owner-only list of unique story viewers |
| `/api/stories` | Authenticated, same-origin multipart story upload endpoint |
| `/messages`, `/messages/[conversationId]` | Participant-only one-to-one inbox and chat with cursor paging |
| `/notifications`, `/api/unread` | Recipient-only notices and DB-derived navigation badges |
| `/settings/**` | Privacy, professional category, links, projects, and trust controls |
| `/report`, `/report/[reportId]` | Authenticated reporting with consent disclosure and content-free status |
| `/appeals` | User appeal form and report/appeal history |
| `/admin`, `/admin/reports/**`, `/admin/users/**`, `/admin/appeals`, `/admin/moderation`, `/admin/audit-logs` | Staff-only queues, risk, moderation, appeals, and audit trail with real metrics |
| `/privacy`, `/terms`, `/contact` | Honest placeholder pages so footer links resolve |

> **Credential status:** all auth, profile, and post routes are implemented locally; real signup, data queries, uploads, follow/post mutations, and email delivery require the values in `.env.local`. No remote migration was applied from this environment. See [`docs/BACKEND.md`](docs/BACKEND.md) and [`docs/PROFILES.md`](docs/PROFILES.md).

> **Future evaluation:** an approved, not-started spike will assess a Neon-primary setup with GitDB as an offline fallback when the database is unreachable. It is not part of Block 6 and does not change the current stack. See [`docs/GITDB_MIGRATION_SPIKE.md`](docs/GITDB_MIGRATION_SPIKE.md).

> **Platform note:** `dev` and `build` deliberately pass `--webpack`. This project was initialized on Android/arm64, where Turbopack native bindings are unavailable. On a supported machine you may remove the flag.

## GitHub Pages hosting

GitHub Pages is the permanent and only website host. The project site is published at <https://craj41273-sketch.github.io/instagram-social/>.

- `next.config.ts` sets `output: "export"`, `basePath: "/instagram-social"`, `trailingSlash: true`, and unoptimized images. No `assetPrefix` is needed: generated CSS/JS/font references already use `/instagram-social/`.
- `npm run build` writes the deployable site to `out/` (including `index.html`, `404.html`, and `.nojekyll`). `.github/workflows/pages.yml` uploads only `out/` on pushes to `main` or manual dispatch, after `npm run check` and `npm test`.
- Dynamic routes are prebuilt for a `demo` parameter with `dynamicParams = false`. Static hosting cannot resolve arbitrary profile/post/story IDs; direct links to unknown IDs return the 404 page.
- API routes, Server Actions, `proxy.ts`, `cookies()`, `headers()`, and server `searchParams` cannot run on Pages. Their Node source is preserved but excluded from the static graph via `pageExtensions`; browser imports use `lib/static/actions.ts`, which rejects mutations loudly instead of faking success.
- Sign-out uses the Supabase browser client and works with `NEXT_PUBLIC_*` values supplied at build time. Sign-up, login, password recovery, email confirmation, and OAuth callbacks still depend on Node Server Actions/route handlers (and Neon profile provisioning), so their UI is preserved but submission fails loudly on Pages — no simulated success. If a trusted backend is added, register the Pages URL in Supabase allowed redirect URLs. Never put `DATABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_*` variables or in `out/`.
- Neon-backed reads/writes, Storage uploads, Realtime publishing, DMs, notifications, moderation persistence, reports/appeals, and admin data are **unavailable on the static site**. Their UI is preserved as static shells; restoring them needs a trusted backend with RLS/ownership checks. See [`docs/BLOCK_12_REPORT.md`](docs/BLOCK_12_REPORT.md).
- Redeploy by pushing to `main` or running the `Deploy Luma to GitHub Pages` workflow manually. Validate locally with `npm run check && npm test && npm run build`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Static export to `out/` (GitHub Pages artifact) |
| `npm run start` | Serve a Node build locally (not used by Pages) |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm run check` | Typecheck and lint |
| `npm test` | Backend foundation tests (Node built-in test runner) |
| `npm run db:generate` | Generate a Drizzle migration |
| `npm run db:migrate` | Apply generated migrations |
| `npm run db:push` | Push schema directly (development only) |
| `npm run db:studio` | Open Drizzle Studio |

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values. `.env*` files are ignored by Git; `.env.example` is committed as the documented template.

- `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are server-only; never prefix them with `NEXT_PUBLIC_`.
- Only `NEXT_PUBLIC_*` variables may be read in client code.
- Variables are validated on demand in `lib/env/` and fail with a descriptive error when missing or malformed.
- Public routes still render without credentials; auth/data actions fail safely with a configuration message.
- Credential sources: Neon Console → Connection details (`DATABASE_URL`) and Supabase → Project Settings → API (URL, anon key, service role key).

## Structure

```text
app/(site)/           Marketing shell: landing, design system, policy pages
app/(auth)/           Focused shell: login, signup, recovery, verification
app/(social)/         Public profiles, owner editor, social lists, post, explore, search, and story routes
app/actions/          Authentication, profile, media, follow, post, engagement, and story actions
app/api/search        Authenticated global search endpoint
app/api/stories       Authenticated multipart story upload endpoint
app/api/users/search  Authenticated username lookup foundation
app/auth/             Supabase callback and OTP confirmation handlers
app/                  Root providers, global styles, error/loading/not-found
proxy.ts              Next.js 16 session refresh, redirects, and baseline security headers
components/landing/   Nav, hero composition, feature rows, illustrative visuals
components/auth/      Auth shell, wrappers, fields, and client form logic
components/ui/        shadcn/ui primitives + app-wide wrappers
components/layout/    Header, footer, page container, info-page template
components/shared/    Brand, theme, states, media, identity components
components/profile/   Profile header, avatar, stats, tabs, lists, forms, actions
components/discovery/ Explore grid, trending strip, debounced search experience
components/stories/   Feed tray, composer, and full-screen viewer
lib/auth/             Supabase clients, DAL, identity mapping, constants
lib/db/               Drizzle client, schema, profile/follow/post/engagement/discovery/story ops, parameterized SQL
lib/discovery/        Shared discovery types, LIKE escaping, explainable trending ranking
lib/stories/          Story constants, expiry, action state, and safe DTOs
lib/profile/          Profile action state, display helpers, list loading
lib/posts/            Pure caption/hashtag helpers
lib/pagination.ts     Bounded cursors for social graph and post lists
lib/env/              Validated public/server-only environment access
lib/security/         Rate-limit preparation and safe redirect helpers
lib/storage/          Buckets, validated uploads, image checks, safe object keys
lib/errors.ts         Typed errors and user-safe messages
lib/logging.ts        Redacted server diagnostics
lib/validations/      Zod schemas shared by UI and server actions
lib/media.ts          Centralized, replaceable landing photography
drizzle/              Generated migrations
tests/                Backend tests and the local TS resolve hook
hooks/                Shared React hooks
types/                Shared TypeScript types
docs/                 Architecture, backend, profiles, coding standards, design system
public/               Static assets
```

## Block 7 behavior

- **Feed:** `/posts` shows the signed-in user's posts plus posts from followed accounts, newest first (`created_at`, `id` keyset). Anonymous visitors keep the public recent-post feed. Both pages use the same reusable `PostCard` with author/media/caption/timestamp, likes, comment counts, up to two comment previews, and profile/detail links.
- **Likes:** `post_likes` has a unique `(user_id, post_id)` index and cascading foreign keys. Actions derive identity from the Supabase session, check post existence, insert idempotently, and return DB-derived like state. The client applies a reversible optimistic update and rolls back on failure; duplicate requests are blocked while pending.
- **Comments:** `comments` stores bounded text with cascading foreign keys, indexes for post paging, and a DB length check. Creation is Zod-validated (1–1000 trimmed characters), rendered as plain text, and deletion is owner-only. Detail comments are newest-first and cursor-paginated via a Load More link.
- **Security:** no client user IDs are trusted; inputs are validated with Zod, SQL values are parameterized, actions are rate-limited, and failures return safe generic messages. The rate limiter is per-process only.
- **Migrations:** `drizzle/0004_watery_psynapse.sql` is additive and was reviewed but **not applied** from this environment because Neon credentials are unavailable. Remote integration tests are opt-in via `LUMA_DB_INTEGRATION=1` and `DATABASE_URL`; unit tests run with `npm test`.

## Block 8 behavior

- **Explore:** `/explore` is public and uses `listRecentPosts` for a square, lazy-loaded media grid with cursor Load More, real hashtag filters from `post_hashtags`, skeletons, and honest empty/error states. Every tile opens the existing `/post/[postId]` detail route.
- **Search:** `/search` debounces input by 300 ms, validates 2–50 character terms client and server side, and calls the authenticated `/api/search` endpoint. Tabs switch between All, People, and Posts; each section is capped at 12 rows per request with bounded offset pagination.
- **Discover people:** the existing `getSuggestedUsers` service excludes the current user and already-followed users; rows reuse `UserList` and the existing `FollowButton` action, so no second social graph exists.
- **Trending:** a bounded 200-post/30-day candidate set is ranked in JS by `(3 × likes + 2 × comments) / (age in hours + 2)`. Posts with zero real engagement are excluded; the formula and per-post counts are visible in the UI. No AI, fabricated activity, or paid signals are used.
- **Indexes:** `drizzle/0005_spooky_mach_iv.sql` adds `pg_trgm` GIN indexes on lowercased username, display name, and caption. It is additive and was reviewed but **not applied** from this environment because Neon credentials are unavailable.
- **Security:** identity comes from the Supabase DAL, no client user IDs are accepted, search text is normalized/validated with Zod and bound as SQL parameters with explicit `ESCAPE`, and requests are rate-limited per authenticated user. The limiter is still per-process; a shared store is needed for multi-instance deployments.
- **Not included:** recent-search persistence, AI recommendations, and browser-driven responsive screenshots. Search state is shareable through `/search?q=...`; responsive behavior was checked structurally with Tailwind breakpoints, not via screenshots.
- **Verification:** unit/structural tests cover validation, escaping, parameterized conditions, exclusion logic, ranking, indexes, and reuse of existing post/follow paths.

## Block 9 behavior

- **Data:** three additive tables — `stories`, `story_views`, `story_reactions` — with UUID keys, cascading foreign keys, unique `(story_id, viewer_id)` / `(story_id, user_id)` pairs, length/MIME/emoji checks, and indexes for owner, expiry, and paging. Bytes stay in Supabase Storage; Neon stores only metadata.
- **Creation:** `/stories/create` uploads one JPEG/PNG/WebP/GIF up to 10 MB through `/api/stories` with real XHR progress. The route requires a verified session and same-origin `Origin`, revalidates MIME/magic bytes/size on the server, and rejects missing configuration with a 503. On any failure after upload it removes the object.
- **Expiration:** `expires_at` is generated server-side as `now() + interval '24 hours'` (also the DB default) and is never accepted from a form. Every tray, detail, view, and reaction query filters `expires_at > now()`, so expired stories disappear from reads and writes without a background job.
- **Visibility:** stories follow the existing feed rule — the owner's own stories plus stories from accepted follows. There is no private-account flag in the current schema, so this is the strongest rule available; document any future private account setting before changing queries.
- **Viewer:** `/stories/[userId]` starts at the requested author and can navigate across all visible groups. Each story displays for 6 seconds with progress bars, tap/keyboard navigation, and pause/resume that also pauses when the tab is hidden. Viewers are recorded once per story by the session-derived user; owners do not view their own stories. `/stories/viewers/[storyId]` returns unique viewers only to the owner.
- **Reactions:** one mutable reaction per `(story_id, user_id)` from `❤️`, `😂`, `😮`, `🔥`, `👏`; setting a new emoji replaces the old one and sending `null` removes it. Counts and the viewer's current choice come from one bounded aggregate query.
- **Deletion:** owner-only action; the DB row is deleted first, then the owner-namespaced object is removed from the `stories` bucket only when the stored path belongs to the authenticated Supabase user. Failed storage cleanup is reported to the user instead of being called success.
- **Migration:** `drizzle/0006_stories.sql` is additive and was reviewed but **not applied** from this environment because Neon credentials are unavailable. Apply `0004`, `0005`, and `0006` before using stories remotely; the `stories` Supabase Storage bucket must exist and allow the documented owner-prefixed paths.
- **Security:** no client identity or expiry is trusted; Zod validates payloads, SQL values are parameterized, visibility is rechecked inside view/reaction writes, uploads are rate-limited per user, and the rate limiter remains per-process only. Story images use the existing validated image helpers and safe path builder; the `**.supabase.co` Next Image remote pattern was added.
- **Limitations:** images only (no video), no scheduled hard-delete of expired rows/objects — they are filtered from all reads and cleaned only on explicit owner deletion, no Realtime presence, no story-specific notifications in Block 9 (Block 10 adds story reactions to the notification center), and no browser screenshots at 320/375/430/768/1024/1440 px. Responsive layout was reviewed structurally and live uploads/views need real credentials.

## Block 10 behavior

- **Data:** `drizzle/0007_short_korg.sql` adds `conversations`, `conversation_participants`, `messages`, and `notifications`. Unique `pair_key` prevents duplicate one-to-one chats under concurrent clicks; unique `(sender_id, client_id)` makes retries idempotent; `deleted_at` tombstones never return content. All four tables use cascading FKs, checks, and indexes for inbox/history/unread paging. The migration is additive and reviewed but **not applied** from this environment.
- **Inbox and chat:** `/messages` shows peer identity, safe previews, real unread counts, and cursor paging. `/messages/[conversationId]` scopes every read/write to participant rows, hides deleted content, stores text only (1–4,000 trimmed characters), marks the caller's participant row read, and keeps older messages when refreshing newer pages. Message entry points reuse the existing profile header, follower/following/discover lists, and search results.
- **Notifications:** real `follow`, `like`, `comment`, `story_reaction`, and `message` rows are generated only after the underlying interaction succeeds and only for another user's owned content. One row per `(recipient, actor, type, entity)` prevents duplicates; no message text, email, or private content is copied. `/notifications` is recipient-only, supports mark-one/mark-all, and only renders links after target existence/expiry/conversation membership is revalidated.
- **Realtime and fallback:** Neon is the single source of truth. After persistence the server may publish opaque Broadcast signals (`conversation:<id>` / `user:<id>`) using the service-role key confined to `lib/realtime/publish.ts`. The browser subscribes once per user in the social shell and once per open conversation, dispatches refresh-only signals, and always refetches authorized data. Missing service config disables publishing; bounded polling with hidden-tab pausing remains the fallback. No client receives service-role credentials or private message payloads.
- **Unread badges:** one `/api/unread` query feeds Messages/Notifications navigation badges; DB counts exclude own and deleted messages and respect each participant's read mark.
- **Security:** Zod validates every payload/page parameter, identity comes from the verified Supabase session, writes require same-origin `Origin`, all SQL values are parameterized, and unsafe errors become generic messages. Per-user rate-limit preparation covers conversation start, send, read, and notification writes/reads. The limiter is still per-process; a shared store is required for multi-instance deployments.
- **Tests:** structural/unit tests cover schema constraints, validation, SQL parameterization, idempotency, participant checks, soft deletion, read/unread, notification dedupe/guards, target validation, privacy, and additive migration. Real Neon/Supabase integration tests are opt-in with `LUMA_DB_INTEGRATION=1` and `DATABASE_URL`; they are skipped locally. No live Broadcast or browser screenshots were verified without credentials/automation.
- **Not included:** group chat, attachments, voice/video, E2E encryption, disappearing messages, typing indicators, presence, AI/chatbots, and scheduled cleanup. Responsive layouts were checked structurally at Tailwind breakpoints, not by screenshots.

## Block 11A behavior

- **Privacy:** `/settings/privacy` controls private account state, story/message/comment/mention audiences, read receipts, activity status, discoverability, hidden words, and block/restrict/mute/close-friend relationships. Backend reads and writes recheck visibility; private accounts expose a profile shell but hide posts/media from non-followers. Missing setting rows use neutral defaults and are not written on read.
- **Professional identity:** category and role fields are self-described only. `/settings/professional`, `/settings/links`, and `/settings/projects` accept bounded category-aware details, absolute HTTP(S) links, and portfolio projects; links/projects have visibility controls and ordering. No verification badge, privilege, search boost, or admin authority is granted by any professional field.
- **Trust:** one authenticated hype per giver/target pair can be toggled; withdrawal keeps a durable row to prevent replay. Trust is recomputed from real eligible accounts as `MIN(100, (Valid Trust Hypes / (Eligible Total Users × 0.20)) × 100)` with no admin writer, no stored percentage, and no heart/star symbols. Unassessed means zero valid hypes.
- **Risk:** admin-only 0–100 score plus a distinct `Unassessed` state. Reasons, evidence references, actor, history, and audit trail are required; moderators cannot set or remove risk, and report volume never changes it.
- **Reporting:** authenticated reports cover users, profiles/posts, comments, stories, messages, and conversations. Zod validation, duplicate detection, per-user rate limiting, and anonymous target-facing notices are enforced. Priority is derived from category alone; volume never triggers punishment. Decisions require resolution notes.
- **Chat evidence:** message/conversation reports capture a bounded both-sided snapshot of the selected message plus up to seven messages on each side (20 total), with conversation/participants/sender IDs/timestamps/content/media refs at report time, category, explanation, and capture time. The reporter sees a consent disclosure; authorized access is audited, and no chat text is copied into notifications or audit logs.
- **Admin:** `/admin/**` is gated by server session role on every page/action. Queues, filters, evidence viewer, risk forms, moderation actions, appeals, and audit logs use real rows only. High-impact forms require explicit confirmation; moderation never auto-deletes user data and no automated volume-based punishment exists.
- **Screenshots:** private/professional/report surfaces discourage casual copy, context menus, and dragging, but browsers cannot prevent OS screenshots or screen recording. This is not a confidentiality boundary.
- **Migration:** `drizzle/0008_chubby_the_call.sql` is additive and reviewed but **not applied** from this environment. It widens one notification CHECK to include safety notices and adds columns/tables/constraints without deleting data; apply `0004`–`0008` in order when Neon credentials are available.
- **Tests:** 76 passing structural tests cover Block 11A schema, additive migration, the exact trust formula, validation, and separation of trust/risk/reporting inputs. Real Neon/Supabase flows and browser screenshots at 320/375/430/768/1024/1440 px were not run without credentials or browser automation.

## Block 11B behavior

- **Active-account boundary:** `isActiveUser()`/`getActiveProfile()` block writes and mutation APIs for banned/suspended accounts while leaving read-only self views and `/appeals` reachable. Suspend/ban/restore additionally require an admin, and all staff authority is rechecked from the session plus Neon role.
- **Message requests:** pending requests stay in a safe inbox card with placeholder preview and Accept/Decline; recipients cannot open or mark pending/declined threads read, senders lose declined threads, and message notices are suppressed while a request is unresolved. Global unread badges exclude inaccessible threads.
- **Privacy enforcement:** people-search bios are gated by `profileInfoVisibility` or a follow edge, hidden words mask inbox previews, counts are capped at 100, story views no longer require reply permission, and banned accounts are excluded from follow lists/counts.
- **Recovery and headers:** password reset requires a recovery token and consumes a bounded token-prefix budget. Every proxy response gets baseline security headers and a **report-only** CSP; enforced CSP is not claimed because Next.js and the theme script need inline code.
- **UI/performance:** notification and inbox refresh merge into loaded pages instead of resetting pagination; mobile links have larger touch targets and a secondary-links disclosure; settings navigation is bounded on small screens; above-fold tiles request image priority; the story viewer traps focus and locks body scroll; independent server reads are batched.
- **CI/config:** the broken GitHub Pages workflow was removed and replaced with validation-only CI (`npm ci`, `npm run check`, `npm test`, `npm run build`). Block 12 replaces the deploy step with a static-export Pages workflow; no other host was introduced.
- **Limits:** rate limiting is still per-process, not distributed. Screenshot/screen-recording controls remain web-level deterrence only and cannot prevent OS capture. Migration `0008` remains unapplied; see `docs/BLOCK_11B_REPORT.md` for its residual risks.

## Block 12 behavior

- **Static host only:** `out/` is the deployable artifact; no Vercel, Netlify, Cloudflare Pages, VPS, or other app host is configured. `basePath` is `/instagram-social` and `assetPrefix` is intentionally absent.
- **Preserved UI:** landing, design system, auth, policy, feed, explore, search, profile/post/story/message/notification, settings, reporting, and admin shells are prerendered. Dynamic detail routes are prebuilt with a `demo` param and a custom `404.html`.
- **Backend boundary:** Supabase browser auth/session flows can run with public env at build time. Neon Drizzle queries, Server Actions, API routes, proxy headers, Storage uploads, Realtime, and all persistence-backed features are documented as unavailable, not simulated.
- **Validation:** `npm run check`, `npm test` (94 tests, 90 pass, 4 expected integration skips), and `npm run build` pass locally; exported assets use `/instagram-social/` paths and contain no server credentials. Live deployment status is recorded in `docs/BLOCK_12_REPORT.md`.

## Current status

- [x] Next.js App Router + TypeScript strict mode
- [x] Tailwind CSS, shadcn/ui, Lucide, PostCSS/Webpack setup
- [x] Clean layered folder structure and reusable utilities
- [x] Lazy, typed Drizzle/Neon and Supabase clients
- [x] Environment validation and `.env.example`
- [x] Original Luma brand, dark-first tokens, optional light theme
- [x] Complete reusable component library and state components
- [x] Responsive design-system showcase at `/design-system`
- [x] Premium landing page with responsive nav, photography hero, features, and honest illustrative content
- [x] Frontend authentication UI with shared validation and real action states
- [x] Real Supabase Auth flows, session handling, and server-derived identity mapping
- [x] Foundational Neon schema, generated migrations, and backend tests
- [x] Real profiles, follow/unfollow, DB-backed counts, follower/following lists, and bounded user lookup
- [x] Validated avatar/cover uploads, social dialogs, suggestions, optimistic follow updates, and a real profile post grid/count
- [x] Typecheck, lint, build, and dev server verification
- [ ] Remote Neon/Supabase integration verified with real credentials (deployment step)
- [x] Multi-image post creation, media viewer, owner-only editing/deletion, and paginated feed (Block 6 posts/media)
- [x] Self/following social feed, reusable post cards with like/comment counts and previews (Block 7)
- [x] DB-backed likes/unlikes with unique pairs, session-derived identity, and rollback-safe optimistic UI
- [x] DB-backed comments with validation, pagination, counts, and owner-only deletion
- [x] Loading, empty, error, and post-detail states for feed and engagement
- [x] Explore grid, hashtag filters, cursor pagination, discover people, and explainable trending (Block 8)
- [x] Debounced authenticated search with People/Posts tabs, bounded offsets, and safe projections (Block 8)
- [x] Additive trigram index migration and discovery unit/structural tests (Block 8)
- [x] 24-hour stories with server-derived expiry, owner/follow visibility, and an authenticated upload route (Block 9)
- [x] Stories tray, full-screen viewer with progression/pause/navigation, unique views, reactions, viewer list, and owner deletion (Block 9)
- [x] Additive story migration, image validation, parameterized SQL, and structural tests (Block 9)
- [x] One-to-one messages, inbox, conversation paging, read state, and unread badges (Block 10)
- [x] Real notification center, dedupe, owner-only reads, and validated navigation (Block 10)
- [x] Optional Broadcast refresh signals with polling fallback and structural tests (Block 10)
- [x] Privacy settings, requests, relationship controls, and backend visibility enforcement (Block 11A)
- [x] Self-described professional categories, safe external links, and portfolio projects (Block 11A)
- [x] Authenticated hypes, exact community trust formula, and independent admin-only risk state (Block 11A)
- [x] Reports, bounded chat evidence snapshots, appeals, and audited authorized access (Block 11A)
- [x] Staff-only admin dashboard, moderation, audit logs, and real metrics (Block 11A)
- [x] Shared active-account mutation guard, request enforcement, redacted logging, report-only CSP, and validation-only CI (Block 11B)
- [x] 90 structural/unit tests with typecheck, lint, and build verified locally (Block 11B)
- [x] GitHub Pages static export, base path, 404 page, and deploy workflow (Block 12)
- [x] 94 structural/unit tests with typecheck, lint, and static build verified locally (Block 12)
- [ ] Save state and recommendations (later blocks)
