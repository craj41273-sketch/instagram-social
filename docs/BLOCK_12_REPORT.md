# Block 12 — GitHub Pages static export report

Baseline: HEAD `c0a0c6bd1410e848bff88a5ea3f64599a9503299`. All Block 11B and Block 12 work is uncommitted. GitHub Pages is the only website host; no other host was configured.

## 1. Original 404 root cause

Pages was configured with `build_type: workflow`, source `main:/`. The last successful workflow (`static.yml`) ran `actions/upload-pages-artifact` with `path: '.'`, publishing the source repository. There is no root `index.html`, so `https://craj41273-sketch.github.io/instagram-social/` returned the GitHub Pages file-not-found page. Block 11B deleted that workflow locally; Block 12 replaces it with an export-only deploy.

## 2. Files changed (Block 12)

- `next.config.ts`: static export, base path, trailing slashes, unoptimized images, `pageExtensions`.
- `.github/workflows/pages.yml` (new), `.github/workflows/static.yml` (deleted locally).
- `public/.nojekyll`, `components/shared/current-year.tsx`.
- 10 dynamic pages under `app/(social)`: added `generateStaticParams()` / `dynamicParams = false`.
- 17 pages under `app/(auth)` and `app/(social)`: replaced request-time `searchParams` with static defaults; `app/(social)/admin/layout.tsx` no longer reads `headers()`.
- `components/auth/logout-button.tsx`: browser-side Supabase sign-out.
- 30 components: action imports redirected to `@/lib/static/actions`.
- `lib/static/actions.ts` (new), `tests/block12.test.mjs` (new).
- `README.md`, `AGENTS.md`, `PROJECT_ROADMAP.md`, this report.

Node-only sources (`app/actions/`, `app/api/`, `proxy.ts`, `lib/db/`, `lib/env/server.ts`) were preserved, not deleted.

## 3. Static export configuration

`output: "export"`, `trailingSlash: true`, `images.unoptimized: true`, `pageExtensions: ["tsx", "page.ts"]`. `npm run build` (Next 16.4.6, webpack) emits `out/`. The config has no `assetPrefix` and no webpack alias.

## 4. Base path

`basePath: "/instagram-social"`. Generated CSS, JS, fonts, and image references in `out/index.html` and `out/404.html` use `/instagram-social/_next/...`; no `/_next/...` root-absolute references were found.

## 5. GitHub Actions workflow

`.github/workflows/pages.yml` triggers on pushes to `main` and `workflow_dispatch`; permissions are `contents: read`, `pages: write`, `id-token: write`. It runs `npm ci`, `npm run check`, `npm test`, `npm run build`, verifies `out/`, `out/index.html`, `out/404.html`, and `out/.nojekyll`, then uploads `path: out` with `actions/upload-pages-artifact@v3` and deploys with `actions/deploy-pages@v5`. `ci.yml` remains validation-only. Workflow file contents were checked locally; no GitHub Actions run has been verified yet.

## 6. Export output validation

`out/index.html` (145,372 bytes), `out/404.html` (16,748 bytes), and `out/.nojekyll` exist. 129 files under `out/_next`, 131 CSS/JS/font/image assets, fonts (`woff2`) present. A grep of `out/` found no `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or Postgres connection strings.

## 7. Routes supported

All prerendered routes include `/`, `/_not-found`, `/admin/**`, `/appeals`, `/contact`, `/design-system`, `/explore`, `/forgot-password`, `/login`, `/messages`, `/notifications`, `/posts`, `/privacy`, `/profile/edit`, `/report`, `/reset-password`, `/search`, `/settings/**`, `/signup`, `/stories/create`, `/terms`, `/verify-email`, plus prebuilt demo params for `/admin/reports/[id]`, `/admin/users/[id]`, `/messages/[conversationId]`, `/post/[postId]`, `/profile/[username]**`, `/report/[reportId]`, `/stories/[userId]`, and `/stories/viewers/[storyId]`. Unknown dynamic IDs return `404.html`.

## 8. Features preserved (UI/static)

Landing page, design system, navigation, settings layouts, feeds/forms shells, profiles/posts/stories/messages/notifications/admin/reporting pages, their styling, and client-side loading/error/empty states.

## 9. Features requiring a backend (unavailable on Pages)

Sign-up, login, password recovery, email confirmation, OAuth callbacks, all 14 API routes, all 45 Server Actions, proxy security headers, Neon reads/writes, uploads, Realtime broadcasts, DMs, notifications, moderation/admin persistence, reports/appeals, and audit logs. Action imports now reject with an explicit error; no fake success is shown.

## 10. Supabase status

`lib/auth/client.ts` is browser-safe and sign-out uses it. Public env must be supplied at build time. Login/signup/recovery still depend on Node actions plus Neon profile provisioning, so they are not functional on Pages. No live Supabase integration was tested; no service-role key is exposed.

## 11. Neon compatibility

Neon Drizzle queries run only in Node server code. Their source is preserved but excluded from the static graph; `getDb()` fails safely without `DATABASE_URL`. No credentials, data, migrations, or schema were changed or reset.

## 12. Security limitations

No RLS policies or backend auth were modified or verified here. Frontend restrictions are not a security boundary because static hosting has no trusted server. CSP remains report-only via `proxy.ts`, which Pages does not execute. Rate limits remain per-process and do not apply to Pages. Migration `0008` is still unapplied. Screenshot protections remain web-level deterrence only.

## 13. Test results

`npm test`: 94 tests, 90 pass, 4 skipped (opt-in live Neon integrations), 0 fail. `npm run check`: typecheck and lint pass. No browser automation or live Supabase/Neon credentials were available.

## 14. Build result

`npm run build` succeeded: 54 static pages generated, including 10 SSG param routes. No TypeScript, lint, or prerender errors.

## 15. Deployment result

Not yet deployed. Local static export is valid; push to `main` and a successful GitHub Actions run are required.

## 16. Actual live URL

`https://craj41273-sketch.github.io/instagram-social/` (configured target only; not yet verified after this build).

## 17. Live verification result

Not performed. The pre-change URL returned the documented GitHub Pages 404.

## 18. Git status

HEAD `c0a0c6bd1410e848bff88a5ea3f64599a9503299`; 1 deleted, 103 modified, 10 untracked paths (Block 11B + Block 12), `git diff --check` clean. No commit, reset, force push, or history rewrite.

## 19. Remaining limitations

Backend-dependent features stay unavailable until a trusted backend is added. Dynamic direct links to arbitrary IDs cannot resolve statically. Query-string-driven pagination/filter initial state is no longer read server-side. Responsive checks at 320/375/430/768/1024/1440 px were not run in a browser.

## 20. Manual actions required

1. Commit and push to `main` (explicit authorization required).
2. Watch the `Deploy Luma to GitHub Pages` workflow and confirm it uploads `out/`.
3. Verify the live homepage, `/404.html`, CSS/JS/font paths, and a demo dynamic route.
4. Apply migrations `0004`–`0008` and configure Supabase/Neon on a trusted backend if real data features are needed later.

Status: code configured — yes; static build successful — yes; artifact generated — yes; GitHub Actions successful — not tested; deployment successful — not tested; website verified — not tested.
