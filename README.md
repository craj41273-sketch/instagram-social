# Luma

Premium, dark-first photo-sharing experience built on Next.js. **Blocks 1–3 are complete: the project foundation, design system, landing page, and frontend authentication UI are in place.** All auth is a frontend preview — no accounts, sessions, email, uploads, or social features are connected yet.

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
| `/login`, `/signup` | Frontend-only authentication forms with local validation |
| `/forgot-password`, `/reset-password`, `/verify-email` | Recovery/verification previews; token-ready, no fake success |
| `/privacy`, `/terms`, `/contact` | Honest placeholder pages so footer links resolve |

> **Auth limitation:** forms validate locally and show explicit "backend pending" states. No account is created, no email is sent, no session is stored, and Google sign-in is disabled until Supabase Auth is configured.

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
app/(site)/           Marketing shell: landing, design system, policy pages
app/(auth)/           Focused shell: login, signup, recovery, verification
app/                  Root providers, global styles, error/loading/not-found
components/landing/   Nav, hero composition, feature rows, illustrative visuals
components/auth/      Auth shell, wrappers, fields, and form logic
components/ui/        shadcn/ui primitives + app-wide wrappers
components/layout/    Header, footer, page container, info-page template
components/shared/    Brand, theme, states, media, identity components
lib/auth/             Supabase browser/server/admin clients
lib/db/               Drizzle client and schema
lib/env/              Validated environment access
lib/validations/      Zod schemas, including frontend auth validation
lib/media.ts          Centralized, replaceable landing photography
hooks/                Shared React hooks
types/                Shared TypeScript types
docs/                 Architecture, coding standards, design system
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
- [x] Frontend authentication UI with local validation and explicit backend-pending states
- [x] Typecheck, lint, build, and dev server verification
- [ ] Real authentication, sessions, domain schema, and migrations (Block 4)
- [ ] Posts, feed, likes, comments, follows, stories, messaging, notifications, search, explore (later blocks)
