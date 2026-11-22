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

## Block 3 — Identity and data foundation

- [ ] Neon database provisioning and Drizzle migration workflow
- [ ] Profile and core domain schema
- [ ] Supabase Auth: sign up, sign in, sign out, and callback handling
- [ ] Session middleware and protected route groups
- [ ] Profile creation/onboarding
- [ ] Application service/repository boundaries

## Block 4 — Feed and posts

- [ ] Post creation with image upload to Supabase Storage
- [ ] Feed queries with pagination and optimistic UI
- [ ] Post detail route
- [ ] Likes and save state
- [ ] Comments and replies

## Block 5 — Social graph

- [ ] Follow/unfollow actions and follower lists
- [ ] Suggested users and search
- [ ] Explore grid
- [ ] Profile pages with tabs

## Block 6 — Stories and notifications

- [ ] Story creation, expiry, and viewer tracking
- [ ] Story ring and viewer UI
- [ ] Notification generation and inbox

## Block 7 — Messaging and realtime

- [ ] Conversation and message schema
- [ ] Realtime message delivery
- [ ] Typing indicators and presence
- [ ] Unread counts

## Block 8 — Polish and hardening

- [ ] Dark/light refinements and responsive audit
- [ ] Image optimization and accessibility audit
- [ ] Rate limiting and authorization review
- [ ] Error monitoring and structured logging
- [ ] Automated tests and CI

## Block 9 — Launch

- [ ] Production environment configuration
- [ ] Performance budget and build verification
- [ ] Deployment and smoke tests
