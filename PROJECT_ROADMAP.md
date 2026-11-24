# Project roadmap

Status legend: `[x]` complete, `[~]` in progress, `[ ]` planned.

## Block 1 — Project foundation (complete)

- [x] Inspect workspace; preserve unrelated existing projects
- [x] Verify Node.js, npm, Git, and dependencies
- [x] Initialize Next.js App Router project with TypeScript strict mode
- [x] Configure Tailwind CSS, shadcn/ui, and Lucide icons
- [x] Install Neon/Drizzle, Supabase Auth/Storage/Realtime, and Zod dependencies
- [x] Establish layered folder structure and reusable utilities
- [x] Add `.env.example`, `.gitignore`, README, coding standards, and agent instructions
- [x] Build the basic application shell (no social features)
- [x] Verify dev server, typecheck, lint, and production build

## Block 2 — Premium social app design system (complete)

- [x] Original Luma brand identity (name, prism mark, favicon)
- [x] Color, typography, spacing, radius, shadow, and motion tokens
- [x] Dark-first theme with optional light mode and reduced-motion support
- [x] Button, icon button, input, textarea, avatar, badge, card, modal, dropdown, tooltip, tabs
- [x] Skeleton, spinner, toast, image container, and user preview components
- [x] Empty states, error states, and accessible form field wrapper
- [x] Responsive validation across mobile, tablet, desktop, and wide screens
- [x] `/design-system` living showcase page
- [x] `docs/DESIGN_SYSTEM.md` documentation
- [x] Verify dev server, typecheck, lint, and production build

## Block 3 — Landing page and authentication UI (complete)

- [x] Inspect existing code before making changes (instructions, structure, deps, tokens, components, styles, routes)
- [x] Reuse the Block 2 design system; no parallel component system introduced
- [x] Responsive landing navigation with accessible mobile menu
- [x] Editorial hero with layered social photography preview and subtle float motion
- [x] Feature sections: share moments, discover people, build communities, stay connected
- [x] Honest, clearly labelled illustrative-only social proof section
- [x] Full footer: brand, navigation, About/Privacy/Terms/Contact, copyright
- [x] Routes: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`
- [x] Reusable auth shell, form wrapper, alerts, checkbox, password input, strength meter, submit button, divider, social login UI
- [x] Local Zod validation, password visibility toggles, strength feedback, and password matching
- [x] Loading, validation-error, and backend-pending states without fake authentication
- [x] Token-ready reset-password and verify-email screens; no simulated success
- [x] Google sign-in UI prepared but disabled pending Supabase configuration
- [x] Legal placeholder pages so every footer link resolves
- [x] Semantic markup, labelled controls, keyboard navigation, focus states, reduced-motion support
- [x] Verify every route over HTTP, exercise validation rules directly, run typecheck, lint, and production build

## Block 4 — Identity and data foundation (complete)

- [x] Neon/Drizzle client setup, validated env layer, and generated migration workflow
- [x] Foundational `users` and `profiles` schema (no social domain tables)
- [x] Real Supabase Auth sign up, sign in, sign out, email verification, recovery, and password update
- [x] PKCE callback and OTP confirmation route handlers with an allowlisted OTP type
- [x] Next.js 16 `proxy.ts` session refresh and auth-only/public redirect rules
- [x] Server-derived identity mapping with idempotent, duplicate-safe user/profile initialization and retry paths
- [x] Server action boundaries, DAL helpers, safe errors, shared Zod validation, and rate-limit preparation
- [x] Storage bucket constants and a documented Neon/Realtime architecture note
- [x] Backend tests, typecheck, lint, and production build verification

> Remote Neon migration/query execution and live Supabase signup/login/email delivery still require real credentials in `.env.local`; they were not claimed as verified. See `docs/BACKEND.md` and the completion report.

## Block 5 — User profiles and social graph (expanded scope, complete)

- [x] Inspect existing rules, schema, auth, DB config, protection, UI, tokens, Git state, and profile routes
- [x] Add `location` to profiles and a constrained `follows` table; `users.username` remains authoritative
- [x] Generate an additive Drizzle migration with UUID PK, FKs, unique pair, indexes, cascade delete, and self-follow CHECK
- [x] Public `/profile/[username]` pages with avatar, cover, bio, website, location, and empty Posts/Tagged tabs
- [x] DB-backed follower/following counts and an honest posts placeholder
- [x] Owner-only `/profile/edit` with server-derived identity, Zod validation, availability checks, and atomic updates
- [x] Real follow/unfollow actions with authentication, self-follow prevention, duplicate-safe inserts, and idempotent deletes
- [x] Cursor-prepared follower/following pages with batched follow-status queries
- [x] Authenticated, rate-limited username lookup foundation (`/api/users/search`)
- [x] Supabase Storage rendering boundary with safe URLs and polished fallbacks
- [x] Reusable profile/follow operations, actions, components, structural tests, and opt-in DB integration tests
- [x] Documentation for schema, routes, security, migration steps, and known limitations
- [x] Add validated avatar/cover uploads backed by Supabase Storage and update profile image fields
- [x] Add real `posts`/media metadata tables, DB-backed profile post count, and profile posts grid with honest empty state
- [x] Add followers/following dialogs with cursor pagination and working load-more controls
- [x] Add suggested users from real DB records with working follow buttons
- [x] Add optimistic follow/unfollow feedback plus loading, empty, and error feedback
- [x] Expand automated tests for profile editing, media validation, follow mutations, and authorization
- [x] Re-run lint, TypeScript, production build, and dev-server route checks

> Remote Neon migration/query execution and live Supabase authenticated tests still require real credentials; they were not claimed as verified. See `docs/PROFILES.md`.

## Block 6 — Posts and media system (in progress)

- [ ] Multi-image post creation with previews, removal, reordering, captions, and hashtags
- [ ] Supabase Storage upload validation: MIME types, size limits, secure paths, permissions, and progress
- [x] Database metadata for posts and media; never store image bytes in Neon
- [ ] Create, edit, delete, detail, and multiple-media post operations with owner-only authorization
- [ ] Create-post modal, upload area, preview carousel, caption editor, post card, detail page, and media viewer
- [ ] Drag-and-drop, loading, empty, error, and mobile-friendly states
- [ ] Real upload/post lifecycle tests when credentials are available
- [ ] Feed queries with pagination and optimistic UI
- [ ] Likes and save state
- [ ] Comments and replies

## Block 7 — Stories and notifications

- [ ] Story creation, expiry, and viewer tracking
- [ ] Story ring and viewer UI
- [ ] Notification generation and inbox

## Block 8 — Messaging and realtime

- [ ] Conversation and message schema
- [ ] Realtime message delivery
- [ ] Typing indicators and presence
- [ ] Unread counts

## Block 9 — Polish and hardening

- [ ] Dark/light refinements and responsive audit
- [ ] Image optimization and accessibility audit
- [ ] Rate limiting and authorization review
- [ ] Error monitoring and structured logging
- [ ] Automated tests and CI

## Block 10 — Launch

- [ ] Production environment configuration
- [ ] Performance budget and build verification
- [ ] Deployment and smoke tests

## Deferred spike — GitDB migration evaluation (approved, not started)

Scope and decision gate live in [`docs/GITDB_MIGRATION_SPIKE.md`](docs/GITDB_MIGRATION_SPIKE.md).

- [ ] Decide integration architecture (Go sidecar service vs. in-process bridge)
- [ ] Define Neon-primary/GitDB offline fallback, stale-data signalling, and reconnect reconciliation
- [ ] Map current users, profiles, and follows to GitDB models and invariants
- [ ] Prototype a server-only compatibility layer for current data operations
- [ ] Port correctness/security tests, including concurrency and cursor pagination
- [ ] Define Neon export, GitDB import, parity check, cutover, and rollback
- [ ] Assess persistent storage, remote sync, deployment, and service isolation
- [ ] Record decision: proceed with migration or retain Neon
