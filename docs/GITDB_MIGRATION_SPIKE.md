# Deferred spike: GitDB migration evaluation

Status: **approved for future evaluation; not started**. This document records the
decision to investigate `gogitdb/gitdb` as an alternative persistence layer. It
does **not** change Block 5, Block 6, or the current approved stack. No dependency
was added and no application code was modified for the spike.

## Why this exists

The user asked whether GitDB could be installed and used instead of Neon. A
read-only inspection of `https://github.com/gogitdb/gitdb` showed that it is not
a drop-in replacement for Neon/PostgreSQL.

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

Determine whether GitDB can preserve Luma’s correctness, security, and developer
workflow well enough to justify replacing Neon.

The spike must answer:

1. Can a Go service expose GitDB over a stable HTTP/gRPC boundary to Next.js?
2. Can all current profile, follow, count, list, and search operations be
   reimplemented without losing behavior?
3. How are uniqueness, self-follow prevention, ordering, and concurrency handled
   without database constraints?
4. How is data exported from Neon, imported into GitDB, verified, and rolled back?
5. Can the Git repository be deployed and persisted safely in production?

## Non-goals

- No production switch during the spike.
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

### 4. Correctness and security tests

Port or add tests for:

- idempotent follow/unfollow;
- self-follow rejection;
- duplicate-pair rejection;
- username uniqueness and ownership;
- full-precision cursor pagination;
- safe public projections with no email/auth IDs;
- concurrent writes and record locking;
- Go service authentication and network isolation;
- redacted logging and safe error mapping.

### 5. Migration and rollback

Define a repeatable process:

1. Export Neon rows to a versioned JSON snapshot.
2. Transform rows into GitDB models.
3. Import into an isolated GitDB repository.
4. Compare counts, usernames, follow pairs, and timestamps.
5. Run read-only parity checks against both stores.
6. Cut over behind a feature flag.
7. Roll back by restoring the Neon-backed data layer.

### 6. Deployment assessment

Evaluate:

- persistent storage for the Git repository;
- GitHub remote sync and SSH key handling;
- backup/restore behavior;
- multi-instance consistency;
- service health checks and timeout behavior;
- compatibility with serverless or container hosting.

## Decision gate

Proceed with a real migration only if all are true:

- all current operations have a verified GitDB equivalent;
- correctness tests pass under concurrent writes;
- the Go service is not publicly exposed and cannot bypass Next.js authorization;
- migration and rollback are repeatable;
- deployment persistence is explicit and reliable;
- the complexity cost is justified compared with remaining on Neon.

If any gate fails, keep Neon and close the spike with documented findings.

## Next action

When the spike is scheduled, create a separate branch so `main` and the Block 6
roadmap remain untouched. Start with phase 1 and record the architecture decision
in this document before writing any service code.
