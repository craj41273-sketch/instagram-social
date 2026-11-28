# Block 11B completion report

Baseline: HEAD `c0a0c6bd1410e848bff88a5ea3f64599a9503299`, clean tree, `git diff --check` clean, 80 tests / 76 pass / 4 skipped / 0 fail. No Block 11B commit was made and no commit was authorized.

## A. Scope and boundaries

Block 11B was limited to hardening, polish, and validation of Blocks 1–11A. No feature was removed, no schema was reset, no destructive migration was applied, no history was rewritten, and no deployment was performed. Block 12 (deployment and migration launch) remains unstarted. No dependency was added.

The pre-change audit is recorded in `docs/BLOCK_11B_AUDIT.md`. It covered security/auth/input, privacy/moderation, performance/UI, and reliability/deployment before any code was changed.

## B. Audit result summary

Confirmed high-impact findings included cosmetic-only moderation status, unenforced message requests, bio leakage in people search, per-process/attacker-keyed rate limits, a broken GitHub Pages deployment workflow, non-idempotent upload retries, and missing evidence retention. Medium findings included absent security headers, client-only high-impact confirmations, optional reset tokens, unbounded read endpoints, render waterfalls, lost pagination on refresh, hidden words in previews, weak report target checks, story view gating, banned accounts in follow lists, mobile nav/touch targets, settings nav height, story dialog focus, empty-inbox error ordering, missing unread announcement, and raw error logging. No critical issue was confirmed.

Not every audit item was changed: Block 11B fixed the high-impact and low-risk items with narrow diffs and documented the rest below.

## C. Security, auth, and authorization

- Added pure `isActiveUser()` plus `getActiveProfile()` and switched every mutation identity path to the active guard. Banned/suspended users can no longer post, upload stories, like/comment, follow, hype, message, report, or change settings. `getCurrentProfile()` and `requireProfile()` remain for read-only/self/appeal paths, so banned users can still appeal.
- `applyModerationActionAction()` rechecks `requireStaff(true)` for `suspend`, `ban`, and `restore`; staff pages/actions deny inactive staff. Risk writes remain admin-only.
- `resetPasswordAction()` requires a non-empty recovery token and consumes a bounded token-prefix budget before exchange. User-facing errors stay neutral.
- All server actions/API mutations re-derive identity from the verified Supabase session; no client user ID, sender ID, recipient ID, or role is accepted. Route mutations keep same-origin `Origin` checks. SQL remains parameterized, Zod validation remains at boundaries, React renders plain text, upload MIME/magic-byte/size checks remain, and redirects remain same-origin.
- Invalid post images now return 400, cheap post fields are validated before the create budget, and a higher pre-parse request budget still discourages multipart parsing abuse.
- Server logs now store error names/digests only; user-facing messages still use `toSafeMessage()`.
- Residual: username-taken and duplicate-report messages still disclose limited existence information; read endpoints remain unthrottled; a reverse-proxy body cap is still required; upload retries can still duplicate after a lost response because the client generates a new UUID per attempt.

## D. Privacy, moderation, and evidence

- Message requests are enforced in conversation headers, message history, inbox rows, mark-read, and notification publication. Pending recipients see a safe card with a placeholder preview and Accept/Decline controls; declined threads are hidden. Only the request recipient can change a pending row, scoped by conversation + recipient + `status='pending'`.
- Message notices are suppressed while a request is pending or declined; retry idempotency remains intact on reused `client_id`.
- Hidden words now mask inbox previews, unread counts are capped at 100, and global unread badges exclude threads the viewer cannot access.
- People-search bios return `null` unless `profileInfoVisibility='everyone'` or the viewer follows the target. Banned accounts are excluded from follow counts and lists. Story view recording no longer requires reply permission; visibility is still checked.
- Appeals remain reachable to inactive users. Moderation notices still carry no chat text; evidence access remains audited.
- Residual: report/evidence retention and redaction have no scheduled purge path. Pending recipients' pre-existing messages could still appear in a sender's preview from before enforcement. Some stored privacy controls (`activityStatus`, `conversationPrivacy`, `mentionPermission`, `tagApproval`, `hideViewCounts`) still have no consumer even though the settings exist.

## E. Rate limiting and abuse

Rate limits are **per-process only**. The in-memory limiter uses fixed windows; signup/login keys can still be rotated by changing identifiers; reset throttling uses a token prefix because no email is available before exchange, and token rotation can change the key. This must not be described as distributed protection. A shared atomic store and stable IP/identity keys are required before multi-instance deployment.

## F. Performance and reliability

- Independent server reads in profile, explore, and posts pages now use `Promise.allSettled` after identity/authorization, with existing section-level fallbacks preserved.
- Notification refresh merges into loaded rows and preserves the accumulated cursor instead of resetting to page 1; inbox refresh already preserved pagination.
- The combined unread query continues to avoid duplicate badge fetches; message notices remain published only after Neon persistence with polling as fallback.
- Residual: several pollers still overlap, the layout adds one staff lookup, and a failed post-count read may still issue a wasted posts read. Report creation/evidence insertion are not yet atomic, and upload retry idempotency is not fixed client-side.

## G. UI/UX, responsive, and accessibility

- Social nav now uses larger small-screen touch targets and a labeled secondary-links disclosure below `sm`; Admin is gated on a server-derived role. A duplicate “Posts” link introduced during consolidation was removed.
- Settings nav is bounded on small screens, skeletons are `aria-hidden`, above-fold tiles request image priority, and the unread indicator is announced.
- The story viewer locks body scroll, traps Tab focus, and restores focus/overflow on unmount while preserving keyboard navigation, pause behavior, and reduced motion.
- Responsive findings are structural only. No browser automation or screenshots were available at 320/375/430/768/1024/1440 px.

## H. Screenshot and screen-recording protections

Existing copy/context-menu/drag discouragement remains web-level deterrence only. It cannot prevent OS screenshots, screen recording, or another device photographing the screen, and it is not a confidentiality boundary. No claim of universal prevention is made.

## I. Tests and verification

- `git diff --check`: passed.
- `npm test`: 90 tests, 86 pass, 4 expected skips, 0 fail. Added `tests/block11b.test.mjs` with 10 targeted tests for the active-user guard, request access predicates, notice suppression, bio visibility, request-action validation, preview masking/unread caps, mutation boundary wiring, headers/CSP, CI/migration safety, and story view gating. Updated the stories test to expect the intentional active guard.
- `npm run typecheck`: passed after fixing a focus-trap TypeScript error and removing a stale generated `tsconfig.tsbuildinfo`. A later run under heavy device load took 12m49s but still passed.
- `npm run lint`: passed (44s initially, 7m30s in a later loaded run).
- `npm run check`: the combined command exceeded the 15-minute tool timeout twice under heavy load; typecheck and lint were then verified separately and both passed.
- `npm run build`: passed (Next.js 16.4.6, webpack, 64 static pages). Missing Supabase credentials produced non-fatal `getCurrentUser` name-only logs during prerender; no `InvariantError` recurred.
- Dev smoke (`PORT=3100 npm run dev`) on `/`, `/posts`, `/explore`, `/reset-password`, and `/design-system` returned 200. `/messages`, `/notifications`, and `/settings` returned 200 with unauthenticated states because no Supabase config was present. `/api/unread` returned 200 with zero counts, `/api/conversations` returned 401, and the new request endpoint returned 403 for a missing `Origin`. `/` carried all five baseline headers and the report-only CSP.
- The known local Next.js dev-only `InvariantError: invalid type: boolean \`false\`, expected enum CodeFrameColorMode` appeared twice during smoke (after `/settings` and `/reset-password`) but did not affect route status codes or the production build. Missing-credential `ConfigurationError`/`DatabaseError` name-only logs are expected in this environment.
- Live Neon/Supabase integration tests remain skipped because no credentials were available. No real browser screenshots or device checks were run.

## J. Migration `0008`

`drizzle/0008_chubby_the_call.sql` remains **unapplied**. It is additive and was verified again by tests to contain no `DROP TABLE`, `TRUNCATE`, or `DELETE FROM`, but it still has residual risks: `notifications_type_check` is dropped/re-added, NULL reporter IDs can bypass duplicate uniqueness, evidence rows cascade on report deletion, and `risk_assessments.user_id` uniqueness is redundant with the pair constraint. Verify the full `0000`–`0008` sequence in a scratch database before applying it in Block 12; do not hand-edit after application.

## K. Deployment and configuration

The GitHub Pages workflow was removed because this app has no static export and needs a Node runtime for server actions, route handlers, Neon, Storage, and Realtime. It was replaced by `.github/workflows/ci.yml`, which only runs `npm ci`, `npm run check`, `npm test`, and `npm run build`. No deployment or migration launch was performed. CSP is `Content-Security-Policy-Report-Only` because Next.js and the theme script require inline code; it is not enforced.

## L. Readiness assessment

Locally hardened and validated, **not production-ready**. Blocks 1–11A remain intact and no Block 12 work was started. Before launch: supply real Neon/Supabase credentials, verify and apply migrations in a scratch database, move rate limiting to shared storage, add a reverse-proxy body cap, fix upload retry UUID reuse, add evidence retention/purge, resolve remaining enumeration messages, add read budgets, enforce or intentionally replace report-only CSP, and perform real browser/responsive verification. A dev-only Next.js `CodeFrameColorMode` invariant warning also remains for local investigation; it did not affect build or route responses. No commit was made; report the commit hash only after an explicitly authorized commit.
