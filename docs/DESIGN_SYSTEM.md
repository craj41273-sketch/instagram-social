# Luma design system

Luma is an original, dark-first visual language for a premium photo-sharing product. It borrows nothing from existing social logos or UI kits: the mark is a prism, the palette is violet light on near-black, and the typography pairs a geometric sans with a refined serif display.

## Brand identity

- **Name:** Luma — light, luminance, and luminous frames.
- **Mark:** prism silhouette with a central point of light; gradient from violet to sky blue.
- **Personality:** quiet, precise, warm, and confident. No novelty gradients or loud shadows.
- **Favicon / mark:** `app/icon.svg` and `components/shared/brand.tsx`.

## Color tokens

All colors are CSS custom properties in `app/globals.css` and are exposed as Tailwind utilities via `@theme inline`.

| Token | Purpose | Dark (default) | Light (opt-in) |
| --- | --- | --- | --- |
| `background` | App canvas | near-black violet | near-white |
| `foreground` | Primary text | off-white | near-black |
| `surface` / `surface-elevated` | Quiet content planes | charcoal | soft white |
| `card` / `card-foreground` | Cards and panels | slightly lighter | white |
| `popover` | Menus, dialogs, tooltips | elevated surface | white |
| `primary` / `primary-foreground` | Brand actions | violet | deeper violet |
| `secondary` | Low-emphasis actions | charcoal | mist |
| `muted` / `muted-foreground` | Secondary surfaces/text | muted charcoal | muted slate |
| `accent` | Hover/selected state | violet-tinted | violet-tinted |
| `destructive` | Errors, danger actions | soft red | deep red |
| `success` | Positive status | green | green |
| `warning` | Caution status | amber | amber |
| `border` / `input` | Subtle separation | translucent gray | light gray |
| `ring` | Keyboard focus | violet | violet |
| `chart-1…5` | Data accents | violet → rose | violet → rose |

Semantic extras: `bg-surface`, `bg-surface-elevated`, `text-success`, `bg-warning/12`, `text-destructive`, etc.

## Typography

- **Interface:** Geist (`--font-geist`) via `next/font/google`.
- **Display:** Instrument Serif (`--font-display-var`) for headings and wordmark.
- **Tailwind tokens:** `font-sans`, `font-heading`, `text-display`, `text-headline`, `text-title`.
- **Scale:** display `3.25rem`, headline `2.25rem`, title `1.375rem`, plus Tailwind's default `xs`–`6xl` scale.

## Spacing

Semantic tokens in `@theme`: `--spacing-gutter` (`1.5rem`), `--spacing-card` (`1.25rem`), `--spacing-section` (`4rem`). Components use Tailwind's numeric scale consistently: `2`, `3`, `4`, `6`, `8`, `12`, `16`, `24`.

## Radius

Token `--radius` is `0.875rem`; derived utilities: `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-4xl`, and `rounded-full` for avatars/pills.

## Elevation

- `shadow-soft` — default card/media lift.
- `shadow-lift` — dialogs, floating panels.
- `shadow-glow` — primary gradient button halo.

## Motion

- Global easing token `--ease-soft` (`cubic-bezier(0.22, 1, 0.36, 1)`).
- Animation tokens `--animate-float` and `--animate-float-slow` use the `luma-float` keyframe for gentle, looping image motion on the landing page.
- 150–500 ms transitions for hover, focus, dropdowns, dialogs, toasts, and image zoom.
- `prefers-reduced-motion: reduce` collapses animations and transitions globally.

## Responsive breakpoints

Tailwind defaults (`sm`, `md`, `lg`, `xl`, `2xl`) plus custom `3xl` (`96rem`) for ultra-wide screens. Layouts are mobile-first; the design system page includes a live breakpoint indicator.

## Components

| Component | File | Notes |
| --- | --- | --- |
| Button | `components/ui/button.tsx` | shadcn/ui primitive; sizes `xs`, `sm`, `default`, `lg`, `icon*` |
| PremiumButton | `components/ui/premium-button.tsx` | `gradient`, `soft`, `outline`, `ghost`, `danger` variants |
| IconButton | `components/ui/icon-button.tsx` | Required `label`, auto tooltip, `aria-label` |
| Input | `components/ui/input.tsx` | shadcn/ui; dark-aware focus ring |
| Textarea | `components/ui/textarea.tsx` | shadcn/ui |
| FormField | `components/shared/form-field.tsx` | Semantic label/hint/error wrapper; `hint` accepts text or a React node |
| Avatar system | `components/ui/avatar.tsx` | Image + initials fallback; used by UserPreview |
| Badge | `components/ui/badge.tsx` | shadcn/ui base |
| StatusBadge | `components/ui/status-badge.tsx` | `neutral`, `brand`, `success`, `warning`, `danger` |
| Card | `components/ui/card.tsx` | shadcn/ui; `font-heading` titles |
| Dialog / Modal | `components/ui/dialog.tsx` | Radix focus trap + animation |
| Dropdown | `components/ui/dropdown-menu.tsx` | Radix keyboard navigation |
| Tooltip | `components/ui/tooltip.tsx` + `TooltipProvider` | Radix; icon buttons get one automatically |
| Tabs | `components/ui/tabs.tsx` | Radix |
| Skeleton | `components/ui/skeleton.tsx` + `components/shared/skeletons.tsx` | Lines, avatars, user previews, cards |
| Spinner | `components/ui/spinner.tsx` | Accessible `role="status"` |
| Toast | `components/ui/toast.tsx` | Radix provider + `useToast()` with tones |
| ImageContainer | `components/shared/image-container.tsx` | Ratios (`square`, `portrait`, `landscape`, `wide`, `fill`), next/image, loading skeleton, gradient fallback, `unoptimized` escape hatch |
| UserPreview | `components/shared/user-preview.tsx` | Avatar, name, handle, verified, presence |
| EmptyState | `components/shared/empty-state.tsx` | Icon, title, description, action |
| ErrorState | `components/shared/error-state.tsx` | `role="alert"`, title, description, action |
| ThemeToggle | `components/shared/theme-toggle.tsx` | Toggles optional light mode; dark is default |

## Landing, auth, and profile layers

Route groups give each surface its own shell without changing URLs:

- `app/(site)/layout.tsx` — marketing navigation + full footer for `/`, `/design-system`, and policy pages.
- `app/(auth)/layout.tsx` — focused `AuthShell` for login, signup, and recovery pages.
- `app/(social)/layout.tsx` — lightweight profile shell with brand, theme toggle, and mobile-first content column.

### Landing components

| Component | File | Notes |
| --- | --- | --- |
| LandingNav | `components/landing/landing-nav.tsx` | Desktop links, accessible mobile disclosure, theme toggle, auth CTAs |
| HeroComposition | `components/landing/hero-composition.tsx` | Layered photo tiles, profile chip, float motion, primary/secondary CTAs |
| FeatureSection | `components/landing/feature-section.tsx` | Reusable alternating editorial row |
| Feature visuals | `components/landing/feature-visuals.tsx` | Static, decorative mock previews for share/discover/community/connect |
| SocialProof | `components/landing/social-proof.tsx` | Explicitly labelled illustrative profiles; no invented metrics |

### Auth components

| Component | File | Notes |
| --- | --- | --- |
| AuthShell | `components/auth/auth-shell.tsx` | Editorial image panel + centered form column |
| AuthFormWrapper | `components/auth/auth-form-wrapper.tsx` | Shared card, eyebrow, title, description, footer |
| AuthAlert | `components/auth/auth-alert.tsx` | `error`, `warning`, `success`, `info` tones with live regions |
| AuthCheckbox | `components/auth/auth-checkbox.tsx` | Native checkbox with link-friendly label |
| PasswordInput | `components/auth/password-input.tsx` | Labeled show/hide toggle, `aria-pressed` state |
| PasswordStrength | `components/auth/password-strength.tsx` | Local score meter and checklist; never persisted |
| SubmitButton | `components/auth/submit-button.tsx` | Full-width primary action with loading state |
| AuthDivider | `components/auth/auth-divider.tsx` | Decorative separator |
| SocialLoginButton | `components/auth/social-login-button.tsx` | Disabled Google boundary with pending-setup label |
| Auth forms | `components/auth/forms/` | Zod-validated forms wired to real Supabase Auth server actions |

### Profile components

| Component | File | Notes |
| --- | --- | --- |
| ProfileAvatar | `components/profile/profile-avatar.tsx` | Safe HTTP(S) image or gradient/initials fallback |
| ProfileHeader | `components/profile/profile-header.tsx` | Cover, identity, bio, metadata, actions, stats |
| ProfileStats | `components/profile/profile-stats.tsx` | DB-backed counts plus working follower/following dialogs |
| FollowButton | `components/profile/follow-button.tsx` | DB-derived state, optimistic toggle, two-step unfollow, server-confirmed feedback |
| ProfileTabs | `components/profile/profile-tabs.tsx` | Real Neon-backed posts plus honest tagged empty state |
| ProfilePostsGrid | `components/profile/profile-posts-grid.tsx` | Responsive media grid with count badge and empty state |
| ProfileMediaForms | `components/profile/profile-media-forms.tsx` | Owner avatar/cover previews and validated uploads |
| UserList | `components/profile/user-list.tsx` | Reusable follower/following/suggestion rows with status actions |
| EditProfileForm | `components/profile/edit-profile-form.tsx` | Owner form with validation, save, cancel, success/error states |
| ProfileSkeleton | `components/profile/profile-skeleton.tsx` | Loading states for profile and list routes |
| SocialListView | `components/profile/social-list-view.tsx` | Cursor-ready list shell with empty/error states |

All landing photography is centralized in `lib/media.ts` and currently points to stable Unsplash CDN IDs. Images are rendered unoptimized because the local arm64 runtime cannot load the native image optimizer; replace the URLs with owned assets when available.

## Usage rules

1. Use tokens (`bg-surface`, `text-muted-foreground`, `shadow-lift`) instead of raw colors.
2. Compose from the components above rather than duplicating utility strings.
3. Keep controls semantic: real `<button>`, `<label>`, `<input>`, and Radix primitives.
4. Prefer `PremiumButton` for primary moments; use `Button` for routine actions.
5. Add new primitives through `npx shadcn@latest add …`, then wrap them in `components/ui/` or `components/shared/` for app-specific variants.
6. Verify with `npm run check`, `npm run build`, and the `/design-system` page before shipping changes.
