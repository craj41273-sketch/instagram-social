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

## Block 5 — Feed and posts

- [ ] Post creation with image upload to Supabase Storage
- [ ] Feed queries with pagination and optimistic UI
- [ ] Post detail route
- [ ] Likes and save state
- [ ] Comments and replies

## Block 6 — Social graph

- [ ] Follow/unfollow actions and follower lists
- [ ] Suggested users and search
- [ ] Explore grid
- [ ] Profile pages with tabs

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
