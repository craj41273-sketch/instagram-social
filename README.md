# Luma

Premium, dark-first photo-sharing experience built on Next.js. **Blocks 1–4 are complete:** project foundation, design system, landing page, authentication UI, and a real backend foundation (Neon/Drizzle + Supabase Auth). Social features begin in Block 5. No uploads or social features are connected yet.

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
| `/privacy`, `/terms`, `/contact` | Honest placeholder pages so footer links resolve |

> **Credential status:** all auth routes are implemented locally; real signup, email delivery, and Neon queries require the values in `.env.local`. Google sign-in remains disabled because it is outside this block. See [`docs/BACKEND.md`](docs/BACKEND.md).

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
app/actions/          Authentication server actions
app/auth/             Supabase callback and OTP confirmation handlers
app/                  Root providers, global styles, error/loading/not-found
proxy.ts              Next.js 16 session refresh and auth-only redirects
components/landing/   Nav, hero composition, feature rows, illustrative visuals
components/auth/      Auth shell, wrappers, fields, and client form logic
components/ui/        shadcn/ui primitives + app-wide wrappers
components/layout/    Header, footer, page container, info-page template
components/shared/    Brand, theme, states, media, identity components
lib/auth/             Supabase clients, DAL, identity mapping, constants
lib/db/               Drizzle client, foundational schema, identity SQL
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
docs/                 Architecture, backend, coding standards, design system
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
- [x] Typecheck, lint, build, and dev server verification
- [ ] Remote Neon/Supabase integration verified with real credentials (deployment step)
- [ ] Posts, feed, likes, comments, follows, stories, messaging, notifications, search, explore (later blocks)
