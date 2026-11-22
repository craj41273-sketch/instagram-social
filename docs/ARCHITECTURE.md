# Architecture

## Principles

1. **Server components by default.** Add `"use client"` only for state, event handlers, effects, or browser APIs.
2. **Separate concerns.** UI must not talk to databases or external SDKs directly.
3. **Lazy infrastructure.** Clients for Postgres and Supabase are created on first use so builds never require live credentials.
4. **Explicit environment access.** All environment reads go through `lib/env/`; secrets stay server-only.
5. **Small, reusable pieces.** Prefer composition over large monolithic components.

## Layers

| Layer | Location | Responsibility | May depend on |
| --- | --- | --- | --- |
| UI / routes | `app/`, `components/` | Render markup, collect intent | Application, shared types, UI primitives |
| Application | `lib/` (future actions/services) | Orchestrate use cases and validation | Data access, infrastructure |
| Data access | `lib/db/` | Drizzle schema, queries, transactions | Infrastructure config |
| Infrastructure | `lib/auth/`, `lib/env/`, Supabase clients | External services and configuration | Nothing from UI |
| Shared | `lib/utils.ts`, `lib/constants.ts`, `types/` | Cross-cutting pure code | Nothing |

Dependencies point inward: infrastructure never imports UI, and data access never imports components.

## Request flow (planned)

```text
Browser -> App Router page (server component)
        -> application action/service (Zod validation)
        -> Drizzle repository (Neon PostgreSQL) or Supabase client
        -> revalidate / redirect -> updated UI
```

Interactive islands (like buttons or composers) will be thin client components that call server actions and receive serializable props.

## Directory map

```text
app/(site)/           Marketing route group: landing, design system, policy pages
app/(auth)/           Auth route group: login, signup, recovery, verification
app/                  Root providers, global styles, loading/error/not-found
components/landing/   Marketing navigation, hero, features, illustrative visuals
components/auth/      Auth shell, form wrappers, fields, and client form logic
components/ui/        shadcn/ui generated primitives — do not edit by hand
components/layout/    Persistent shell: header, footer, page container
components/shared/    Reusable branded/composite components
lib/media.ts          Replaceable landing photography sources
lib/auth/             Browser, request-scoped server, and admin Supabase clients
lib/db/               Drizzle client (`getDb`) and schema definitions
lib/env/              Public and server-only env schemas + getters
lib/validations/      Zod schemas shared by client and server
hooks/                Reusable client hooks
types/                Plain shared TypeScript types
docs/                 Living architecture and standards documentation
```

## Design system layer

The UI layer is backed by a documented design system (`docs/DESIGN_SYSTEM.md`):

- **Tokens** live in `app/globals.css` as CSS variables and Tailwind `@theme` entries. Components consume semantic utilities (`bg-surface`, `text-muted-foreground`, `shadow-lift`) rather than raw colors.
- **Primitives** in `components/ui/` are either generated shadcn/ui components or thin wrappers around them (`PremiumButton`, `IconButton`, `StatusBadge`, `Spinner`, `Toast`). Generated files are not edited by hand.
- **Composite components** in `components/shared/` combine primitives into reusable patterns: `Brand`, `ThemeToggle`, `UserPreview`, `ImageContainer`, `EmptyState`, `ErrorState`, form fields, and skeletons.
- **Providers** are mounted once in the root layout: `ThemeProvider` (dark-first theme), `TooltipProvider`, and `ToastProvider`. They are client components that wrap server-rendered children.
- **Route groups** keep shells separate: `(site)` supplies marketing navigation and footer, `(auth)` supplies the focused `AuthShell`. Neither group changes the public URL.
- **Auth boundary** is intentionally frontend-only: Zod schemas in `lib/validations/auth.ts` validate locally, and `lib/auth-preview.ts` exists solely to demonstrate loading states. No network call, session, or email is produced.
- **Showcase** at `/design-system` is a client route that exercises every primitive and state without introducing product features.

## Domain plan (not yet implemented)

Domain tables will be added incrementally in `lib/db/schema.ts` with generated migrations in `drizzle/`: `profiles`, `posts`, `post_media`, `likes`, `comments`, `follows`, `stories`, `story_views`, `conversations`, `messages`, `notifications`, and `saved_posts`. Row level security in Supabase will complement application-level authorization; service-role access stays confined to `lib/auth/server.ts`.

Supabase Realtime will be introduced only for features that need live updates (messages, notifications, presence), behind small typed hooks in `hooks/`.
