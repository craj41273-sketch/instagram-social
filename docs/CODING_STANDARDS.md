# Coding standards

## TypeScript

- Strict mode is mandatory; do not weaken `tsconfig.json`.
- Prefer `type` for unions/intersections and `interface` for object shapes that may be extended.
- Avoid `any`. Use `unknown` and narrow, or define a precise type.
- Do not disable checks with `@ts-ignore`; prefer a narrow, documented cast.
- Export types from `types/` or beside the module that owns them.

## Components

- Server components by default; `"use client"` only when required.
- Keep components small and single-purpose. Place cross-page UI in `components/shared/` and shell UI in `components/layout/`.
- Generated shadcn primitives in `components/ui/` are owned by the shadcn CLI; add components with `npx shadcn@latest add <name>` instead of editing them manually.
- Use `cn()` from `@/lib/utils` for conditional class names.
- Use Lucide icons; do not add another icon library.
- Provide accessible labels for icon-only controls.

## Data and business logic

- All database access goes through `getDb()` in `lib/db/`.
- Add domain logic in application-level modules under `lib/`, not inside route handlers or components.
- Validate all external input with a Zod schema from `lib/validations/`.
- Never import `lib/db/index.ts`, `lib/env/server.ts`, or `lib/auth/server.ts` into client code; they use the `server-only` guard.
- Never call `getServerEnv()` at module scope; prefer the narrower env getters.
- Session/user reads go through `lib/auth/dal.ts`. Derive identity only from the verified Supabase session; never trust a client-supplied user ID or auth ID.
- Server actions validate `FormData` with Zod, return serializable safe state, and never forward raw SDK/database errors to the browser.
- `proxy.ts` is an optimistic layer only; authorization must be rechecked in actions or the DAL.

## Styling

- Tailwind utility classes only; no CSS modules or styled-components.
- Use theme tokens (`bg-background`, `text-muted-foreground`, etc.) rather than hard-coded colors so dark mode remains consistent.
- Keep responsive behavior mobile-first.

## Naming and files

- Files and directories: `kebab-case.ts(x)` (e.g., `site-header.tsx`).
- Components and types: `PascalCase`. Functions/variables: `camelCase`. Constants: `SCREAMING_SNAKE_CASE`.
- Use the `@/*` import alias instead of long relative paths.

## Design system

- Follow `docs/DESIGN_SYSTEM.md` for tokens, components, and usage rules.
- Use semantic Tailwind tokens; avoid raw hex colors and bespoke shadows.
- Compose from existing UI/shared components before creating new ones.
- Keep dark mode as the default; light mode is an opt-in class managed by `ThemeProvider`.
- Preserve keyboard focus styles, `aria-label`s on icon-only controls, and reduced-motion behavior.

## Commits and changes

- One logical change per commit; imperative commit subjects (e.g., `Add auth callback route`).
- Run `npm run check` before committing. Run `npm run build` when changing configuration or routing.
- Never commit `.env*`, credentials, generated `.next/` output, or `node_modules/`.
- Update `PROJECT_ROADMAP.md` and the relevant docs when a block is completed.
- AI agents must follow `AGENTS.md` in addition to this document.
