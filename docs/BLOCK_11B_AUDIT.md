# Block 11B pre-change audit list

Baseline: HEAD `c0a0c6bd1410e848bff88a5ea3f64599a9503299`, clean tree, `git diff --check` clean, `npm test` 80 tests / 76 pass / 4 skipped / 0 fail. `npm run check` typecheck passed but lint timed out at 120s and 300s. No credentials, browser automation, deployment, migration, or code changes were used for these audits.

The four source audits are consolidated here. Severity reflects exploitability and user impact at the current code state, not a claim that live services were exercised.

## CRITICAL

None confirmed.

## HIGH

1. **Moderation status is largely cosmetic — banned/suspended users can still write.** `lib/admin/service.ts:523-586` writes status, but mutation paths resolve identity without checking it: `app/api/posts/route.ts:51-63`, `app/api/stories/route.ts:43-55`, `app/api/messages/[conversationId]/route.ts:61-98`, `app/actions/engagement.ts:36,74,146,195`, `app/actions/follows.ts:58-73`, and `app/actions/trust.ts:26-36`. Impact: a ban/suspension does not actually stop posting, commenting, liking, following, hyping, or DMs, while staff may believe it did. Fix: one shared active-actor guard in `lib/auth/dal.ts`, called immediately after session identity resolution in every mutation; keep `/appeals` and read-only self views reachable.

2. **Message requests are stored but not enforced.** The pending row is inserted at `lib/db/messaging.ts:138-148` and loaded into context at `lib/privacy/service.ts:206-216`, but `getConversationHeader` only checks membership and `canMessage` (`lib/db/messaging.ts:183-192`), the inbox has no request filter (`lib/db/messaging.ts:234-268`), and notification publication still notifies (`lib/db/messaging-sql.ts:195-205`). Impact: the privacy promise in `components/settings/privacy-settings-form.tsx:113` is false; unsolicited messages land in the normal inbox with preview text and notifications. Fix: enforce pending/accepted/declined state in header, inbox, message history, and notification publication; add a minimal accept/decline path.

3. **Profile info visibility is ignored in people search.** `p.bio` is selected unconditionally at `lib/db/discovery.ts:113-140`, while visibility only checks banned/discoverable/block at `lib/db/discovery-query.ts:39-55`. Impact: users who restrict profile details to followers still expose their bio in public people search. Fix: gate `bio` on the target's `profileInfoVisibility` plus viewer-follows-target; return `null` otherwise.

4. **All rate limits are per-process and some keys are attacker-controlled.** `lib/security/rate-limit.ts:14` uses a module-local Map; signup keys include email/username (`app/actions/auth.ts:90`), login is email-only (`:205`), and `resetPasswordAction` has no limit (`app/actions/auth.ts:319-381`). Impact: limits multiply by instance count and can be reset by rotating identifiers; token exchange is unthrottled. Fix: preserve the call signature but back the limiter with shared atomic storage before horizontal scaling, add fixed/login-IP keys, and rate-limit reset. Multi-instance protection cannot be claimed until shared storage exists.

5. **GitHub Pages workflow cannot run the app.** `.github/workflows/static.yml:1-43` uploads `path: '.'` and never runs `npm ci`, `npm run build`, or a Node server. `next.config.ts` has no static export; auth, route handlers, server actions, Neon, Storage, and Realtime need a Node runtime. Impact: `/` 404s and all dynamic features are impossible. Fix: disable/delete that workflow and document a Node-capable host; do not deploy in Block 11B.

6. **Upload retry idempotency is defeated by fresh client UUIDs.** `components/messaging/conversation-view.tsx:120-139` generates a new `crypto.randomUUID()` on every send attempt, while the DB dedupes on `(sender_id, client_id)` (`lib/db/messaging-sql.ts:167-184`). Impact: a lost response after commit makes the retry a duplicate message. Fix: generate the message client ID once per draft and clear it only after a 201. Uploads also lack retry keys (`components/posts/create-post-dialog.tsx:167-228`, `components/stories/story-create-form.tsx:197-204`); at minimum, lock ambiguous failures and tell users to verify before retrying.

7. **Sensitive report/evidence records have no retention or deletion path.** Chat snapshots are captured at `lib/reporting/service.ts:275-350` and persisted at `:433-438`; schema/migration have no expiry column (`drizzle/0008_chubby_the_call.sql:149-195`) and no purge path exists. Impact: chat text from reporters and non-reporters can be retained indefinitely after closure. Fix: add a documented retention window plus a scheduled redaction/purge job in a later additive change; do not apply or hand-edit `0008` here.

## MEDIUM

8. **No security headers or CSP.** `proxy.ts:21-59` returns all paths without headers; `next.config.ts:8-35` has no `headers()` config; `app/layout.tsx:38-45` injects an inline theme script. Impact: no MIME sniffing, framing, referrer, permission, or exfiltration guardrails. Fix: add baseline headers for every response and a non-breaking report-only CSP; do not claim enforced CSP while inline Next/theme scripts remain.

9. **High-impact admin confirmations are client-side only.** `components/admin/moderation-form.tsx:53`, `components/admin/risk-form.tsx:119`, and `components/admin/appeal-decision-form.tsx:35` confirm in the browser, but `app/actions/admin.ts:220-256,158-217,259-287` accept plain FormData. Moderators can suspend/ban/restore via `lib/admin/service.ts:527,549-586`; risk is correctly admin-only. Impact: a direct action POST bypasses confirmation. Fix: server-verified confirmation or `requireStaff(true)` for suspend/ban/restore; keep audit logging.

10. **Password recovery accepts an optional token and has no rate limit.** `app/actions/auth.ts:323-328,349-373` allows password update with an active session even when no token is supplied; no `consumeRateLimit` call appears in `resetPasswordAction`. Impact: a stolen session can rotate the password without re-authentication, and token guesses are unthrottled. Fix: require an explicit token (or current password/nonce) and add a fixed reset budget.

11. **Upload body-size checks trust `Content-Length` and route bodies are not hard-capped.** `app/api/posts/route.ts:46-49` and `app/api/stories/route.ts:38-41` check only the client header before `formData()`; `next.config.ts:14-17` caps server actions, not route handlers. Impact: chunked/omitted length forces multipart parsing before per-file validation. Fix: enforce a reverse-proxy body cap and reject the summed `File.size` immediately after parsing.

12. **Read-only JSON endpoints are unthrottled.** `app/api/unread/route.ts:8-16`, `app/api/notifications/route.ts:9-25`, `app/api/conversations/route.ts:16-32`, and `app/api/messages/[conversationId]/route.ts:31-53` have no read budget. Impact: authenticated polling can drive unbounded DB reads. Fix: add a shared read budget per user once shared rate-limit storage exists.

13. **Server render waterfalls serialize auth and DB work.** `app/(social)/profile/[username]/page.tsx:52-169` awaits roughly eleven dependent-looking reads; `app/(social)/explore/page.tsx:37-87` and `app/(social)/posts/page.tsx:36-80` serialize independent reads. Impact: TTFB grows linearly with DB latency. Fix: after authorization, group independent reads with `Promise.allSettled` and preserve section-level fallbacks.

14. **Four overlapping pollers duplicate identity/unread work.** `lib/messaging/constants.ts:12-14` plus `components/messaging/social-nav.tsx:36-50`, `components/messaging/inbox-view.tsx:48-62`, `components/notifications/notification-center.tsx:81-95`, and `components/messaging/conversation-view.tsx:92-95`. Impact: repeated `getUser()` + profile lookups and overlapping unread/notification count queries, amplified by realtime fan-out. Fix: one shared refresh signal/hook and skip redundant nav polling where a page already renders authoritative counts.

15. **Chat refresh duplicates membership/privacy queries and re-renders the whole history.** `app/api/messages/[conversationId]/route.ts:47,52`, `lib/db/messaging.ts:309`, and `components/messaging/conversation-view.tsx:39-46,65-76,92-95`. Impact: two extra DB round trips and full-list re-render every 12s. Fix: return/pass the header once and avoid `setItems` when merged IDs are unchanged.

16. **Timed refresh discards paginated older rows.** `components/messaging/inbox-view.tsx:37-46,64-83` and `components/notifications/notification-center.tsx:70-79,140-156` replace state from page 1 on every poll/broadcast. Impact: users lose older rows mid-scroll. Fix: merge refresh results with the existing `mergePages` helpers and preserve accumulated cursors.

17. **Hidden words are not applied to inbox previews.** `lib/privacy/service.ts:352-369` and `lib/db/messaging.ts:329-341` filter content, but `lib/db/messaging.ts:217-232,273-283` projects raw `m.content`. Impact: a hidden word still appears in the preview users see first. Fix: replace matching previews with a generic placeholder.

18. **Report target validation for comments/stories is too weak.** Posts use the visibility predicate (`lib/reporting/service.ts:195-203`) and messages require membership (`:226-245`), but comments/stories only check that the owner account is viewable (`:205-223`). Impact: a reporter can submit content they could not view. Fix: reuse `buildPostVisibilityCondition` on the parent post and `buildStoryVisibilityCondition` for stories.

19. **Report creation and evidence insertion are not atomic.** `lib/reporting/service.ts:391-404,419-438`. Impact: a report can exist without its evidence snapshot. Fix: build the payload first and insert both in one Neon-safe SQL statement/CTE.

20. **Suspended accounts remain visible in feeds/search/stories while other systems treat them inactive.** Visibility checks exclude only banned (`lib/privacy/service.ts:254-258`, `lib/db/post-query.ts:64-89`, `lib/db/discovery-query.ts:39-55`, `lib/db/story-query.ts:39-85`), unlike reporting/trust/admin metrics. Fix: centralize an active-account predicate or document that suspension intentionally preserves content visibility.

21. **Story view recording is gated by reply permission instead of view permission.** `lib/db/stories.ts:341-356,402-405` checks visibility and then `canReplyToStory`, while `lib/privacy/service.ts:306-350` treats them separately. Impact: legitimate views are missed when replies are disabled. Fix: remove the reply gate from view recording.

22. **Follow counts/lists include banned accounts.** `lib/db/follows.ts:156-244` and `lib/profile/social-list-data.ts:63-79` do not filter edge-user status. Fix: reuse the non-banned predicate from discovery in counts and edge lists.

23. **Mobile social nav is overcrowded with sub-44px targets.** `components/messaging/social-nav.tsx:53-75,94` renders nine links plus theme toggle in a wrapping sticky header (`app/(social)/layout.tsx:25-35`). Impact: at 320–430px the nav consumes the viewport and is hard to tap; Admin is shown to everyone. Fix: collapse secondary links below `sm`, raise touch targets, and gate Admin on the session role already available in the layout.

24. **Settings nav buries content on mobile.** `components/settings/settings-page.tsx:25-32` stacks ~17 links before content until `lg` (`components/settings/settings-nav.tsx:9-70`). Fix: disclosure or bounded scroll below `lg`.

25. **Story viewer lacks focus containment/scroll lock.** `components/stories/story-viewer.tsx:240-247` hand-rolls `role="dialog"`/`aria-modal`; background remains focusable and 100ms progress ticks re-render the overlay. Fix: reuse the Radix dialog or add focus containment; drive progress with CSS where practical.

26. **Empty inbox hides its error state.** `components/messaging/inbox-view.tsx:85-102` returns `EmptyState` before the error block. Fix: render errors before the empty-state early return.

27. **Notification unread indicator is not announced.** `components/notifications/notification-center.tsx:243-245` labels a plain span. Fix: add `sr-only` text or `role="img"`.

28. **Unread counts are unbounded.** `lib/db/messaging.ts:208-215,444-462`. Fix: cap display counts in SQL (e.g. `least(count(*), 100)`).

29. **Several stored privacy settings are not enforced.** `activityStatus`, `conversationPrivacy`, `mentionPermission`, `tagApproval`, and `hideViewCounts` appear in `lib/privacy/service.ts:18-65`, schema/validation, and `components/settings/privacy-settings-form.tsx:93-104,235-285` but have no observed consumer. Fix: either gate the controls until implemented or enforce them where the features exist; do not present them as active guarantees.

30. **Raw SDK/DB errors reach logs and browser console.** `lib/logging.ts:31-38` logs raw `error.message`; `app/error.tsx:14-16` logs the full client error. Fix: redact messages to a scope/digest and leave user-facing `toSafeMessage` unchanged.

31. **Migration 0008 has residual risks and must remain unapplied here.** `drizzle/0008_chubby_the_call.sql:255` drops/re-adds `notifications_type_check`; `:171,286,318` allow duplicate NULL reporter IDs; `:283` cascades evidence on report deletion; `:220,323` duplicate risk uniqueness. It is additive and registered in `drizzle/meta/_journal.json:61-67`, but no credentials exist to verify it. Fix: verify transactional runner in a scratch DB before applying; use a later additive migration for NULL-safe dedupe/evidence retention. Do not hand-edit after application.

32. **No CI runs the real scripts.** `.github/workflows/static.yml` runs none of `npm ci`, `npm run check`, `npm test`, or `npm run build`; structural tests do not import authz/privacy decision helpers. Fix: add a Node CI workflow and targeted no-dependency tests for pure helpers.

33. **Invalid post images return 500 and consume quota before validation.** `app/api/posts/route.ts:61,105,140-150`; stories handles the analogous case at `app/api/stories/route.ts:89-92`. Fix: return 400 for `ValidationError` and validate cheap fields before consuming rate budget.

34. **Username/report enumeration surfaces remain predictable.** `app/actions/auth.ts:95-101,160-166` distinguishes taken usernames; `app/actions/reporting.ts:50-57` returns an existing report UUID on duplicate. Fix: neutral messages without leaking identifiers.

35. **Responsive/performance polish items.** Stale unread badge in open chat (`components/messaging/conversation-view.tsx:80-90`), lazy above-fold grid images (`components/shared/image-container.tsx:55-67`), missing composer alt text (`components/posts/create-post-dialog.tsx:174-184`), `SensitiveSurface` blocking own chat selection (`components/shared/sensitive-surface.tsx:19-24` with `components/messaging/conversation-view.tsx:172`), inconsistent skeleton `aria-hidden`, and duplicate Explore reads (`lib/db/discovery.ts:249-278`). Fix with narrow, local changes only where they do not alter behavior.

## LOW

36. Two `cn` import styles (`lib/utils.ts:1` vs generated `components/ui/*`); inconsistent skeleton semantics in messages/explore; repeated listener boilerplate; hard-coded photo-overlay colors.

37. Realtime disconnect is silent (`lib/realtime/client.ts:26-49`); polling fallback remains correct.

38. Minor duplicated date helpers and an empty `hooks/.gitkeep`.

## Verified correct at baseline

- Verified session identity comes from Supabase `getUser()` and DB mapping; `proxy.ts` is optimistic only; protected pages/APIs recheck auth.
- Redirect helper rejects protocol-relative/off-origin URLs; route handlers require same-origin `Origin`; server actions get Next's origin check.
- DB role is server-derived and constrained by schema; admin/risk/appeal pages and actions recheck role; risk is admin-only.
- Audits exist for risk/moderation/report/appeal/evidence access; chat text is excluded from notices and audit details.
- Report anonymity, appeal ownership, duplicate handling, bounded both-sided evidence, and story expiry checks are present.
- Upload MIME/magic-byte/size checks, owner-namespaced paths, cleanup, parameterized SQL, Zod inputs, escaped `LIKE`, plain-text React rendering, and external-link `rel` hardening are present.
- No committed secrets; env reads are isolated in `lib/env/`; service-role values are never `NEXT_PUBLIC_`.
- Tests, loading/empty/error states, cleanup of timers/object URLs/channels, keyset pagination, image aspect-ratio stability, semantic tokens, keyboard story navigation, reduced-motion handling, and responsive grid collapse are in place.

## Block 11B implementation boundary

Fix confirmed high-impact issues with the smallest complete diffs, add targeted pure tests, and document residual risks. Do not apply `0008`, add dependencies, redesign features, deploy, rewrite history, or claim live Neon/Supabase/browser verification. Screenshot protections remain web-level deterrence only; OS screenshots and screen recording cannot be universally prevented. Rate limiting remains per-process unless shared storage is introduced, which is outside this environment.
