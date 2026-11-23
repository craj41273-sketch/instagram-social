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
| Application | `app/actions/`, `lib/` services | Orchestrate use cases, validation, safe errors | Data access, infrastructure |
| Data access | `lib/db/` | Drizzle schema, parameterized queries, idempotent SQL | Infrastructure config |
| Infrastructure | `lib/auth/`, `lib/env/`, `lib/security/`, `lib/storage/`, Supabase clients | External services, configuration, guardrails | Nothing from UI |
| Shared | `lib/utils.ts`, `lib/constants.ts`, `lib/errors.ts`, `lib/logging.ts`, `types/` | Cross-cutting pure/server utility code | Nothing |

Dependencies point inward: infrastructure never imports UI, and data access never imports components.

## Request flow

```text
Browser -> app/(auth) client form (Zod validation, useActionState)
        -> app/actions/auth.ts (server-side Zod, rate limit, safe errors)
        -> Supabase Auth (identity/session) + Drizzle/Neon (users/profiles)
        -> redirect or serializable AuthActionState -> updated UI
```

`proxy.ts` runs before rendering for optimistic session refresh and simple
auth-only redirects. Authoritative checks happen again in server actions and
the DAL (`lib/auth/dal.ts`), never only in the proxy.

Interactive islands stay thin client components that call server actions and
receive serializable props.

## Directory map

```text
app/(site)/           Marketing route group: landing, design system, policy pages
app/(auth)/           Auth route group: login, signup, recovery, verification
app/(social)/         Public profiles, owner editor, follower/following lists
app/actions/          Authentication, profile, and follow server actions
app/api/users/search  Authenticated username lookup foundation
app/auth/             Supabase PKCE callback and OTP confirmation handlers
app/                  Root providers, global styles, loading/error/not-found
proxy.ts              Next.js 16 session refresh and optimistic redirects
components/landing/   Marketing navigation, hero, features, illustrative visuals
components/auth/      Auth shell, form wrappers, fields, and client form logic
components/ui/        shadcn/ui generated primitives — do not edit by hand
components/layout/    Persistent shell: header, footer, page container
components/shared/    Reusable branded/composite components
lib/media.ts          Replaceable landing photography sources
lib/auth/             Supabase clients, DAL, identity mapping, constants
lib/db/               Drizzle client (`getDb`), schema, profile/follow ops, parameterized SQL
lib/profile/          Profile action state, display helpers, social list loading
lib/pagination.ts     Bounded keyset cursors for social graph lists
lib/env/              Public and server-only env schemas + getters
lib/security/         Rate-limit preparation and safe redirect helpers
lib/storage/          Planned storage buckets and storage client boundary
lib/errors.ts         Typed errors and safe user messages
lib/logging.ts        Redacted server diagnostics
lib/validations/      Zod schemas shared by client and server
tests/                Backend tests and the local TS resolve hook
hooks/                Reusable client hooks
types/                Plain shared TypeScript types
docs/                 Living architecture, backend, and standards documentation
```

## Design system layer

The UI layer is backed by a documented design system (`docs/DESIGN_SYSTEM.md`):

- **Tokens** live in `app/globals.css` as CSS variables and Tailwind `@theme` entries. Components consume semantic utilities (`bg-surface`, `text-muted-foreground`, `shadow-lift`) rather than raw colors.
- **Primitives** in `components/ui/` are either generated shadcn/ui components or thin wrappers around them (`PremiumButton`, `IconButton`, `StatusBadge`, `Spinner`, `Toast`). Generated files are not edited by hand.
- **Composite components** in `components/shared/` combine primitives into reusable patterns: `Brand`, `ThemeToggle`, `UserPreview`, `ImageContainer`, `EmptyState`, `ErrorState`, form fields, and skeletons.
- **Providers** are mounted once in the root layout: `ThemeProvider` (dark-first theme), `TooltipProvider`, and `ToastProvider`. They are client components that wrap server-rendered children.
- **Route groups** keep shells separate: `(site)` supplies marketing navigation and footer, `(auth)` supplies the focused `AuthShell`. Neither group changes the public URL.
- **Auth boundary** is server-backed: shared Zod schemas validate in the client
  forms and again in server actions; Supabase Auth owns identity/sessions and
  Neon stores the mapped `users`/`profiles` rows. No fake auth or simulated
  email remains.
- **Showcase** at `/design-system` is a client route that exercises every primitive and state without introducing product features.

## Domain plan

Block 4 implemented `users` and `profiles`; Block 5 added profile `location`
and the constrained `follows` table, with additive migrations in `drizzle/`.
Block 6 and later will add domain tables incrementally: `posts`, `post_media`,
`likes`, `comments`, `stories`, `story_views`, `conversations`, `messages`,
`notifications`, and `saved_posts`.

Neon is the only application database. Supabase Auth owns identity; its own
Postgres is not used as a second app database. Application-level authorization
uses the DAL and server-derived IDs; service-role access stays confined to
`lib/auth/server.ts`.

Supabase Realtime will be introduced only for features that need live updates
(messages, notifications, presence), behind small typed hooks in `hooks/`.
Because Neon tables are not Supabase Postgres tables, do not assume Supabase
Postgres Changes observe them — use Broadcast/Presence or a dedicated event
transport, as documented in `docs/BACKEND.md`.
