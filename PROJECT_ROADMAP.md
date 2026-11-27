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

## Block 6 — Posts and media system (posts/media complete; engagement later)

- [x] Multi-image post creation with previews, removal, reordering, captions, and hashtags
- [x] Supabase Storage upload validation: MIME types, size limits, secure paths, permissions, and progress
- [x] Database metadata for posts and media; never store image bytes in Neon
- [x] Create, edit, delete, detail, and multiple-media post operations with owner-only authorization
- [x] Create-post modal, upload area, preview carousel, caption editor, post card, detail page, and media viewer
- [x] Drag-and-drop, loading, empty, error, and mobile-friendly states
- [x] Automated structural tests for upload/post validation, caption rendering, and same-origin writes
- [ ] Real upload/post lifecycle tests when credentials are available
- [x] Cursor-paginated feed with hashtag filters and real DB records

> Posts/media are implemented locally. Remote migration, live upload lifecycle, and Supabase bucket policies still require real credentials. Likes and comments moved to Block 7; save state remains out of scope.

## Block 7 — Social feed, likes, and comments (complete locally)

- [x] Authenticated feed of own and followed users' posts, newest first; anonymous visitors keep the public recent feed
- [x] Reusable premium post card with author/profile links, media, caption, timestamp, like action, like/comment counts, comment previews, and owner menu
- [x] `post_likes` table with unique `(user_id, post_id)` pair, foreign keys, indexes, idempotent like/unlike, DB-derived counts and viewer state
- [x] Optimistic like UI with rollback, error state, pending protection, and accessible pressed state
- [x] `comments` table with foreign keys, indexes, DB length check, Zod validation, plain-text rendering, cursor pagination, counts, previews, and owner-only deletion
- [x] `/post/[postId]` detail page with like state, comment creation/deletion, invalid/missing post handling, and comment paging
- [x] Cursor-paginated feed (`created_at`, `id`) with hashtag filter, Load More, loading, empty, and error states
- [x] Session-derived identity, input validation, parameterized SQL, rate limits, and safe errors in every engagement action
- [x] Structural unit tests plus opt-in remote Neon integration tests; no dependencies added
- [ ] Real Neon/Supabase authenticated lifecycle tests with credentials

> Migration `drizzle/0004_watery_psynapse.sql` is additive and reviewed but unapplied from this environment. The in-process rate limiter is per-process; a shared store is needed for multi-instance deployments. Save state, double-tap likes, Explore, Stories, Reels, Messaging, Notifications, recommendations, and ads are out of scope.

## Block 8 — Explore, search, discover people, and trending (complete locally)

- [x] `/explore` public photo grid using real posts/media, responsive tiles, lazy loading, accessible descriptions, hover/focus affordances, cursor pagination, and loading/empty/error states
- [x] Hashtag category filters derived from real `post_hashtags` data with an honest no-categories state
- [x] Debounced authenticated `/search` with clear control, All/People/Posts tabs, 300 ms debounce, bounded offset paging, loading/empty/error/retry states, and safe result fields
- [x] Reusable Zod-validated Drizzle services for people search, caption search, discover suggestions, explore feed reuse, real hashtags, and trending posts
- [x] Discover people excludes the viewer and existing follows, reusing `getSuggestedUsers`, `UserList`, and the existing secure `FollowButton`
- [x] Explainable trending score `(3 × likes + 2 × comments) / (age in hours + 2)` over a bounded 200-post/30-day candidate set; zero-engagement posts are excluded
- [x] Additive `pg_trgm` GIN indexes for lowercased username, display name, and caption; no data reset or destructive migration
- [x] Structural/unit tests for validation, wildcard escaping, parameterized SQL, exclusions, ranking, indexes, post access, and follow reuse
- [ ] Real Neon/Supabase search, follow, and trending lifecycle tests with credentials
- [ ] Real browser visual checks at 320/375/430/768/1024/1440 px (no browser automation available here)

> Migrations `drizzle/0004_watery_psynapse.sql` and `drizzle/0005_spooky_mach_iv.sql` are additive and reviewed but unapplied from this environment. Search rate limiting is an authenticated per-process preparation layer; a shared store is required for multi-instance deployments. Stories, messaging, notifications, recommendations, and ads remain out of scope.

## Block 9 — Stories (complete locally; notifications deferred)

- [x] Additive `stories`, `story_views`, and `story_reactions` schema with indexes, checks, cascading FKs, unique view/reaction pairs, and a server-generated 24-hour `expires_at`
- [x] Authenticated, same-origin multipart `/api/stories` upload with server-side MIME/magic-byte/size validation, owner-namespaced storage, and rollback cleanup
- [x] Server-only story services: grouped active/followed queries, detail reads filtered by expiry, unique view writes, viewer lists, mutable reactions, and owner-only delete with honest storage-cleanup reporting
- [x] Stories tray on `/posts`, authenticated `/stories/create`, full-screen `/stories/[userId]` with 6-second progression, pause/resume, visibility pause, keyboard/tap navigation, views, reactions, and owner delete, plus `/stories/viewers/[storyId]`
- [x] Zod validation, session-derived identity, parameterized SQL, per-user rate-limit preparation, and `**.supabase.co` image pattern
- [x] Structural/unit tests for schema, expiration, visibility, ownership, deletion paths, views, duplicates, reactions, media validation, and migration safety
- [ ] Real Neon/Supabase story upload, view, reaction, and deletion lifecycle tests with credentials
- [ ] Real browser visual checks at 320/375/430/768/1024/1440 px (no browser automation available here)

> Migration `drizzle/0006_stories.sql` is additive and reviewed but unapplied from this environment. Stories are images only; expired rows/objects are filtered from all reads and cleaned only on explicit owner deletion — no scheduled cleanup job exists. No private-account flag exists, so visibility matches the existing own/accepted-follow feed rule. The rate limiter is per-process. Notification generation and inbox are deferred to a later block, not part of Block 9.

## Block 10 — Messaging, notifications, and realtime (complete locally)

- [x] Additive `conversations`, `conversation_participants`, `messages`, and `notifications` schema with unique pair keys, idempotency keys, tombstones, checks, indexes, and cascading FKs
- [x] Server-only conversation reuse, participant-scoped inbox/history, send, read state, unread counts, and notification/target services with Zod validation and parameterized SQL
- [x] Authenticated `/messages`, `/messages/[conversationId]`, and `/notifications` routes with real data, cursor paging, loading/empty/error states, Message entry points, accessible responsive controls, and validated navigation
- [x] Real follow/like/comment/story_reaction/message notices with no self-notifications, duplicates, private message text, or owner-only read bypass
- [x] One shared browser user-channel subscription plus per-conversation subscriptions; Neon writes persist first, optional Supabase Broadcast sends opaque signals only, and clean polling/pause-on-hidden fallback refetches authoritative data
- [x] DB-derived unread badges on social navigation with a combined `/api/unread` endpoint
- [x] Structural/unit tests for schema, validation, SQL safety, dedupe, authorization, pagination, read/unread, navigation validation, privacy, and additive migration
- [ ] Real Neon/Supabase message, notification, and Broadcast lifecycle tests with credentials
- [ ] Typing indicators and presence (deliberately not built)
- [ ] Real browser visual checks at 320/375/430/768/1024/1440 px (no browser automation available here)

> Migration `drizzle/0007_short_korg.sql` is additive and reviewed but unapplied from this environment. Messaging is text-only and one-to-one; there is no group chat, attachment pipeline, E2E encryption, typing indicator, or presence state. Broadcast is optional and disabled when Supabase service configuration is absent; polling remains the fallback. The rate limiter is per-process, and real remote flows still need credentials.

## Block 11A — Privacy, professional identity, trust, and safety (complete locally)

- [x] Additive schema and migration `drizzle/0008_chubby_the_call.sql`: privacy, professional/links/projects, hypes, risk/history, reports, immutable evidence/access audit, appeals, moderation, audit logs, role/status, follow/conversation requests, relationships, and story audiences
- [x] Instagram-comparable privacy controls enforced in backend reads/writes: public/private, stories, messages and requests, comments, mentions, hidden words, block/restrict/mute, close friends, and discoverability
- [x] Optional self-described professional categories, roles, links, and portfolio projects with safe URLs and visibility; no verification or privilege derived from them
- [x] Authenticated HYPES with one active pair, withdrawal history, and exact `MIN(100, (Valid Trust Hypes / (Eligible Total Users × 0.20)) × 100)` trust with no admin writer or heart/star symbols
- [x] Independent admin-only risk score with distinct unassessed state, reasons/evidence/audit/history, and no moderator writer
- [x] Reports for profile/user/post/comment/story/message/conversation with validation, duplicate detection, rate limiting, anonymity to targets, and auditable decisions
- [x] Bounded both-sided chat evidence snapshots at report time with consent disclosure, media refs, timestamps, participant/sender IDs, and audited authorized access; no chat text in notices or audit logs
- [x] Staff-only `/admin`, `/admin/reports`, `/admin/reports/[id]`, `/admin/users`, `/admin/users/[id]`, `/admin/appeals`, `/admin/moderation`, and `/admin/audit-logs` with real metrics, high-impact confirmation, and no automatic deletion/punishment
- [x] `/settings/**`, `/report/**`, `/appeals`, report entry points, navigation/route protection, and technical copy/save discouragement where the browser permits
- [x] Structural/unit tests for schema, trust formula, risk separation, privacy validation, reports/evidence, admin input, and additive migration
- [ ] Real Neon/Supabase privacy, report, evidence, risk, appeal, and admin lifecycle tests with credentials
- [ ] Real browser visual checks at 320/375/430/768/1024/1440 px (no browser automation available here)

> Migration `0008` is additive and reviewed but unapplied from this environment. Report priority is category-derived only, report volume never changes risk or triggers punishment, and the in-process rate limiter still needs a shared store for multi-instance deployments. OS screenshots/screen recording cannot be technically prevented. Blocks 11B and 12 are not started.

## Block 11 — Polish and hardening

- [ ] Dark/light refinements and responsive audit
- [ ] Image optimization and accessibility audit
- [ ] Rate limiting and authorization review
- [ ] Error monitoring and structured logging
- [ ] Automated tests and CI

## Block 12 — Launch

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
