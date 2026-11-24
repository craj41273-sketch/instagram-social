# Deferred spike: GitDB migration evaluation

Status: **approved for future evaluation; not started**. This document records the
decision to investigate GitDB for a **Neon-primary, GitDB offline-fallback**
setup: use Neon when the database is reachable and use GitDB when it is not. It
does **not** change Block 5, Block 6, or the current approved stack. No dependency
was added and no application code was modified for the spike.

## Why this exists

The user asked whether GitDB could be installed and used instead of Neon, then
specified the desired runtime behavior: **keep Neon as the primary database, and
use GitDB when there is no internet connection**. A read-only inspection of
`https://github.com/gogitdb/gitdb` showed that it is not a drop-in replacement
for Neon/PostgreSQL.

GitDB is:

- a **Go library** (`github.com/gogitdb/gitdb/v2`), installed with `go get`;
- an **embedded document store** backed by Git;
- dependent on a local `DbPath` and optional Git remote synchronization;
- lacking a PostgreSQL wire protocol, SQL support, Drizzle adapter, and npm client.

Luma currently depends on relational features that GitDB does not provide:
UUID primary keys, foreign keys, cascade deletes, unique constraints, a
self-follow `CHECK`, indexes, `ILIKE`, atomic CTEs, and scalar count subqueries.
Replacing Neon therefore requires a deliberate migration design, not a config
change.

## Spike goal

Determine whether GitDB can serve as a local offline fallback while Neon remains
the source of truth, and whether that preserves Luma’s correctness, security, and
developer workflow.

The spike must answer:

1. Can a Go service expose GitDB over a stable HTTP/gRPC boundary to Next.js?
2. Can all current profile, follow, count, list, and search operations be
   reimplemented without losing behavior?
3. How are uniqueness, self-follow prevention, ordering, and concurrency handled
   without database constraints?
4. How is data exported from Neon, imported into GitDB, verified, and rolled back?
5. Can the Git repository be deployed and persisted safely in production?
6. How does the app detect Neon unavailability without treating every transient
   error as an offline state?
7. What data is cached locally, how fresh is it, and how is it reconciled when
   Neon returns?
8. Can authenticated actions work offline when Supabase `getUser()` also needs
   network access, and what are the security tradeoffs of any cached session?

## Required runtime behavior

The intended behavior is a hybrid, not a permanent replacement:

- **Online:** Neon remains authoritative for all reads and writes. Drizzle and
  the existing migrations stay in place. GitDB receives a local replica/cache.
- **Offline:** when Neon is unreachable, reads fall back to GitDB. Writes are
  either queued for later reconciliation or explicitly disabled; this choice
  must be decided in the spike.
- **Reconnected:** queued writes are replayed in order, conflicts are resolved
  by an explicit policy, and the GitDB replica is refreshed from Neon.
- **Never silent:** the UI must clearly indicate when data is from the offline
  fallback and whether changes are pending or rejected.

Important constraint: “no internet” also affects Supabase Auth. The current DAL
calls `getUser()` on the server. Offline authenticated actions therefore need a
carefully bounded session-cache design or must be read-only. Caching a verified
session is a security-sensitive decision and must not weaken the existing rule
that identity is derived only from a verified session.

## Non-goals

- No production switch or live offline fallback during the spike.
- No changes to `app/`, `components/`, or current `lib/db/` behavior.
- No new npm dependency in the main application.
- No Block 6 work is performed as part of this spike.
- No claim that GitDB is superior to Neon until the decision gate passes.

## Proposed phases

### 1. Architecture decision

Compare two integration shapes:

| Option | Notes |
| --- | --- |
| Go sidecar service | Recommended. Custom Go wrapper implements `gitdb.Model`, owns the Git repo, and exposes a narrow authenticated API. Next.js talks to it over HTTP from server-only modules. |
| Embedded/in-process bridge | Not practical from Next.js/TypeScript without a custom native bridge; higher risk and complexity. |

Decision output: a short architecture note covering service boundary, auth,
network exposure, persistence, and failure behavior.

### 2. Data model mapping

Map current records to GitDB models:

- `users`: UUID, auth user ID, email, username, timestamps.
- `profiles`: UUID, user ID, display name, bio, avatar/cover URLs, website,
  location, timestamps.
- `follows`: UUID, follower ID, following ID, created timestamp.

Application-level invariants to redesign and test:

- lowercase, unique usernames;
- one profile per user;
- no duplicate follow pairs;
- no self-follows;
- cascade-style cleanup when a user is removed;
- deterministic cursor ordering for follower/following pages.

### 3. Compatibility layer

Prototype a server-only client that preserves the current exported operation
shape:

- `getPublicProfileByUsername`
- `getPublicProfileByUserId`
- `isUsernameAvailableForUser`
- `updateOwnProfile`
- `followUser`
- `unfollowUser`
- `isFollowing`
- `getFollowCounts`
- `listFollowers`
- `listFollowing`
- `searchUsersByUsername`

The goal is to keep UI and server actions unchanged while swapping the data
access implementation behind an interface.

### 4. Offline fallback and reconciliation

Define the hybrid behavior before writing integration code:

- Neon health check and failure classification (offline vs. transient/error).
- Read fallback from the GitDB replica with an explicit stale-data indicator.
- Write policy: read-only offline mode versus queued writes with replay.
- Conflict rules for username changes, duplicate follows, and deleted users.
- Reconciliation order and idempotency keys for replayed mutations.
- Offline session policy given that Supabase verification also requires network.

Decision output: a state diagram covering online, degraded, offline, and
reconnecting modes, plus the exact user-visible status messages.

### 5. Correctness and security tests

Port or add tests for:

- idempotent follow/unfollow;
- self-follow rejection;
- duplicate-pair rejection;
- username uniqueness and ownership;
- full-precision cursor pagination;
- safe public projections with no email/auth IDs;
- concurrent writes and record locking;
- Go service authentication and network isolation;
- redacted logging and safe error mapping;
- offline reads, queued writes, replay, and conflict resolution.

### 6. Migration and rollback

Define a repeatable process:

1. Export Neon rows to a versioned JSON snapshot.
2. Transform rows into GitDB models.
3. Import into an isolated GitDB repository.
4. Compare counts, usernames, follow pairs, and timestamps.
5. Run read-only parity checks against both stores.
6. Cut over behind a feature flag.
7. Roll back by restoring the Neon-backed data layer.

### 7. Deployment assessment

Evaluate:

- persistent storage for the Git repository;
- where GitDB physically runs so it remains available when the network is down
  (server-side sidecar on a self-hosted server versus a local client runtime);
- GitHub remote sync and SSH key handling;
- backup/restore behavior;
- multi-instance consistency;
- service health checks, timeouts, and offline detection;
- compatibility with serverless or container hosting;
- replica freshness and local storage limits.

## Decision gate

Proceed with a real hybrid implementation only if all are true:

- all current operations have a verified GitDB equivalent;
- correctness tests pass under concurrent writes;
- the Go service is not publicly exposed and cannot bypass Next.js authorization;
- offline detection is reliable and does not misclassify ordinary query errors;
- offline reads are clearly labelled as stale/limited;
- offline writes are either safely queued and reconciled or explicitly blocked;
- authenticated offline behavior does not weaken session verification;
- migration and rollback are repeatable;
- deployment persistence is explicit and reliable;
- the complexity cost is justified compared with remaining on Neon.

If any gate fails, keep Neon-only and close the spike with documented findings.

## Next action

When the spike is scheduled, create a separate branch so `main` and the Block 6
roadmap remain untouched. Start with phase 1, decide whether offline writes are
allowed, and record the architecture decision in this document before writing any
service code.
