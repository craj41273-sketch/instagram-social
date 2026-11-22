# Instagram Social

Premium Instagram-inspired social media web application. **Block 1 is complete: the repository contains only the project foundation and application shell.** No social features (posts, likes, comments, messaging, etc.) have been implemented yet.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React Server Components) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| UI | shadcn/ui (Radix primitives) |
| Icons | Lucide |
| Database | Neon PostgreSQL |
| ORM | Drizzle ORM + Drizzle Kit |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Storage / Realtime | Supabase Storage, Supabase Realtime |
| Validation | Zod |
| Package manager | npm |
| Source control | Git / GitHub |

## Prerequisites

- Node.js 20.9+ (verified on Node.js 26)
- npm 10+
- Git
- A Neon PostgreSQL database and a Supabase project (needed from Block 2 onward)

## Getting started

```bash
cd projects/instagram-social
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. The foundation page renders without any external service configured; the environment variables are only read lazily when a data/auth module is actually used.

> **Platform note:** `dev` and `build` deliberately pass `--webpack`. This repository was initialized on Android/arm64, where Turbopack native bindings are unavailable. On macOS, Windows, or Linux you may remove the flag to use Turbopack (also remove the PostCSS setup only if you reconfigure Tailwind for Turbopack).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve a production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm run check` | Typecheck and lint |
| `npm run db:generate` | Generate a Drizzle migration |
| `npm run db:migrate` | Apply generated migrations |
| `npm run db:push` | Push schema directly (development only) |
| `npm run db:studio` | Open Drizzle Studio |

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values. `.env*` files are ignored by Git; `.env.example` is committed as the documented template.

- `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are server-only.
- Only `NEXT_PUBLIC_*` variables may be read in client code.
- Variables are validated on demand in `lib/env/` and fail with a descriptive error when missing or malformed.

## Structure

```text
app/                 App Router routes and global styles
components/ui/       Generated shadcn/ui primitives
components/layout/   Header, footer, page container
components/shared/   Reusable cross-cutting UI (brand, etc.)
lib/auth/            Supabase browser/server/admin clients
lib/db/              Drizzle client and schema
lib/env/             Validated environment access
lib/validations/     Zod schemas
hooks/               Shared React hooks
types/               Shared TypeScript types
docs/                Architecture and coding standards
public/              Static assets
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/CODING_STANDARDS.md`](docs/CODING_STANDARDS.md), [`PROJECT_ROADMAP.md`](PROJECT_ROADMAP.md), and [`AGENTS.md`](AGENTS.md) before contributing.

## Current status

- [x] Next.js App Router + TypeScript strict mode
- [x] Tailwind CSS and shadcn/ui (Radix, Lucide)
- [x] Clean layered folder structure
- [x] Lazy, typed Drizzle/Neon and Supabase clients
- [x] Environment validation and `.env.example`
- [x] Application shell, loading/error/not-found states
- [x] Typecheck, lint, build, and dev server verification
- [ ] Authentication flows (Block 2)
- [ ] Domain schema and migrations (Block 2)
- [ ] Posts, feed, likes, comments, follows, stories, messaging, notifications, search, explore (later blocks)
