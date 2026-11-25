# Luma

Premium, dark-first photo-sharing experience built on Next.js. **Blocks 1–8 are complete locally.** Profiles include validated avatar/cover uploads, real social graph state, and a DB-backed post grid. Posts add multi-image creation, media viewing, owner-only editing/deletion, and a paginated feed. Block 7 adds a self/following social feed, database-backed likes, comments, and a post detail conversation. Block 8 adds a real-photo Explore grid, debounced global search, discover-people suggestions, and explainable trending. Remote Neon/Supabase verification still requires real credentials.

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

Open <http://localhost:3000>. Every route — the landing page, design system, auth pages, and policy placeholders — renders without any external service configured. Environment variables are only read lazily when a data/auth module is actually used.

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
| `/privacy`, `/terms`, `/contact` | Honest placeholder pages so footer links resolve |

> **Credential status:** all auth, profile, and post routes are implemented locally; real signup, data queries, uploads, follow/post mutations, and email delivery require the values in `.env.local`. No remote migration was applied from this environment. See [`docs/BACKEND.md`](docs/BACKEND.md) and [`docs/PROFILES.md`](docs/PROFILES.md).

> **Future evaluation:** an approved, not-started spike will assess a Neon-primary setup with GitDB as an offline fallback when the database is unreachable. It is not part of Block 6 and does not change the current stack. See [`docs/GITDB_MIGRATION_SPIKE.md`](docs/GITDB_MIGRATION_SPIKE.md).

> **Platform note:** `dev` and `build` deliberately pass `--webpack`. This project was initialized on Android/arm64, where Turbopack native bindings are unavailable. On a supported machine you may remove the flag.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve a production build |
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
app/(social)/         Public profiles, owner editor, social lists, post, explore, and search routes
app/actions/          Authentication, profile, media, follow, post, and engagement actions
app/api/search        Authenticated global search endpoint
app/api/users/search  Authenticated username lookup foundation
app/auth/             Supabase callback and OTP confirmation handlers
app/                  Root providers, global styles, error/loading/not-found
proxy.ts              Next.js 16 session refresh and auth-only redirects
components/landing/   Nav, hero composition, feature rows, illustrative visuals
components/auth/      Auth shell, wrappers, fields, and client form logic
components/ui/        shadcn/ui primitives + app-wide wrappers
components/layout/    Header, footer, page container, info-page template
components/shared/    Brand, theme, states, media, identity components
components/profile/   Profile header, avatar, stats, tabs, lists, forms, actions
components/discovery/ Explore grid, trending strip, debounced search experience
lib/auth/             Supabase clients, DAL, identity mapping, constants
lib/db/               Drizzle client, schema, profile/follow/post/engagement/discovery ops, parameterized SQL
lib/discovery/        Shared discovery types, LIKE escaping, explainable trending ranking
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
- [ ] Save state (not requested in Block 7)
- [ ] Stories, messaging, notifications, and recommendations (later blocks)
