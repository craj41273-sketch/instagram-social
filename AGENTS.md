<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent instructions

You are working on a premium Instagram-inspired social application. Follow these rules for every change.

## Scope

1. Implement only the block described in `PROJECT_ROADMAP.md`. Do not build social features ahead of their block.
2. Never overwrite unrelated files or existing user work outside this repository.
3. Ask before adding a dependency that is not part of the approved stack: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Lucide, Neon PostgreSQL, Supabase Auth/Storage/Realtime, Drizzle ORM, Zod.

Current state: Blocks 1–7 are complete locally. Real profiles, follows, bounded user search, validated avatar/cover uploads, post creation/media/edit/delete, and the paginated post feed exist. Block 7 adds an authenticated self/following feed, `post_likes` and `comments` tables, engagement actions/services, like/comment UI, and a post detail conversation. Do not build stories, messaging, notifications, explore, recommendations, or save state. Backend details and credential requirements live in `docs/BACKEND.md`; Block 5 specifics live in `docs/PROFILES.md`; Block 7 behavior and limitations live in `README.md`. Migration `drizzle/0004_watery_psynapse.sql` is additive and unapplied without credentials.

## Architecture

- Server Components are the default. Add `"use client"` only for state, events, effects, or browser APIs.
- Keep UI (`app/`, `components/`) separate from business logic, data access (`lib/db/`), and infrastructure (`lib/auth/`, `lib/env/`).
- Database work goes through `getDb()` in `lib/db/index.ts`. Validate input with Zod schemas in `lib/validations/`.
- Never import server-only modules (`lib/db/index.ts`, `lib/env/server.ts`, `lib/auth/server.ts`) from client code.
- Never read `process.env` directly outside `lib/env/`. Never expose `DATABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix.
- Do not call `getServerEnv()` at module import time; use the narrow getters where possible.
- Derive identity only from the verified Supabase session through `lib/auth/dal.ts`; never trust client-supplied user IDs or auth IDs. `proxy.ts` is optimistic only — recheck authority in actions/DAL.
- Use `@/*` imports, `cn()` for class merging, and Lucide icons. Do not hand-edit generated `components/ui/` primitives; use `npx shadcn@latest add <name>` and add app-specific variants as wrappers instead.
- Follow `docs/DESIGN_SYSTEM.md`. Use semantic tokens (`bg-surface`, `text-muted-foreground`, `shadow-lift`, `ease-soft`) instead of raw colors or one-off styles.
- Compose UI from the existing library in `components/ui/` and `components/shared/`; do not duplicate utility strings or build parallel component systems.
- Keep dark mode as the default. Light mode is opt-in via `ThemeProvider`; never hard-code light-only or dark-only colors.
- Use `EmptyState`, `ErrorState`, `Skeleton`/`Spinner`, and `useToast()` for loading, failure, and feedback states. Keep all controls keyboard accessible and preserve reduced-motion behavior.
- The `/design-system` route is the living reference. Update it and `docs/DESIGN_SYSTEM.md` whenever a token or shared component changes.

## Quality bar

- Preserve TypeScript strict mode and all additional `tsconfig.json` checks.
- Run `npm run check` and `npm run build` after changes. Fix every error before reporting completion.
- Start the dev server (`npm run dev`) when verifying shell or route changes.
- Follow `docs/CODING_STANDARDS.md` and `docs/ARCHITECTURE.md`.
- Never commit `.env*` (except `.env.example`), credentials, `node_modules/`, or `.next/`.
- Update `PROJECT_ROADMAP.md` and documentation when a block is finished.

## Reporting

Report files created, dependencies added, commands run, errors fixed, and verification results. Do not claim success if checks have not passed.
