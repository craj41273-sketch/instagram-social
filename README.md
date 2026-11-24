# Luma

Premium, dark-first photo-sharing experience built on Next.js. **Blocks 1–5 are complete:** project foundation, design system, landing page, authentication UI, backend foundation, and real user profiles with a secure follow graph. Block 6 (feed/posts) is next. Uploads and post content are not implemented yet.

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
| `/profile/[username]` | Public profile with real counts, follow/edit actions, and empty content tabs |
| `/profile/[username]/followers`, `/following` | Cursor-paginated social graph lists |
| `/profile/edit` | Authenticated, owner-only profile editor |
| `/api/users/search` | Authenticated, rate-limited username lookup foundation |
| `/privacy`, `/terms`, `/contact` | Honest placeholder pages so footer links resolve |

> **Credential status:** all auth and profile routes are implemented locally; real signup, profile queries, follow mutations, and email delivery require the values in `.env.local`. No remote migration was applied from this environment. See [`docs/BACKEND.md`](docs/BACKEND.md) and [`docs/PROFILES.md`](docs/PROFILES.md).

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
app/(social)/         Public profiles, owner editor, follower/following lists
app/actions/          Authentication, profile, and follow server actions
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
lib/auth/             Supabase clients, DAL, identity mapping, constants
lib/db/               Drizzle client, schema, profile/follow ops, parameterized SQL
lib/profile/          Profile action state, display helpers, list loading
lib/pagination.ts     Bounded cursors for social graph lists
lib/env/              Validated public/server-only environment access
lib/security/         Rate-limit preparation and safe redirect helpers
lib/storage/          Planned bucket names and storage boundary
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
- [x] Typecheck, lint, build, and dev server verification
- [ ] Remote Neon/Supabase integration verified with real credentials (deployment step)
- [ ] Posts, feed, likes, comments, stories, messaging, notifications, explore, recommendations (later blocks)
