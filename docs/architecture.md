# Architecture and authority

## Decision: one server application

The first build uses Next.js, React and TypeScript with server-only authentication, AI credentials and database access. Domain commands are ordinary TypeScript functions, independent of React. This reduces deployment boundaries while preserving a testable authority boundary. Framework replacement is possible, but not free: route and authentication adapters would change.

## Decision: transactional project aggregates

PostgreSQL stores one versioned JSONB workspace per project, indexed by owner. A mutation selects the owner-scoped row `FOR UPDATE`, applies a domain command, and writes the new aggregate in one transaction. An expected project version rejects stale browser writes. Record revisions and published artifacts are append-only through the domain API; the database administrator can still modify storage. This is not a tamper-proof audit system.

This intentionally replaces a normalized record-table proposal for the initial preview. It makes atomic project operations simple but rewrites the aggregate and loads all project history. It is appropriate only for small, single-owner projects. Large projects need measured size limits, pagination and normalized record/revision storage before expansion. No graph database or full event sourcing is introduced.

Development uses PGlite with a process-local serial transaction queue plus a local lock file that fails fast if another Praja process is already using the same embedded database directory. Production uses a PostgreSQL connection pool and row locks. Never run multiple processes against the same embedded development directory.

## Knowledge model

Questions, claims, intentions, decisions and work scopes have distinct validation requirements. Accepted decisions need reasons; supported/refuted claims need evidence; answered questions need a resolution. Scopes advance through draft, ready, active and in_review. Accepted delivery is deliberately unavailable until real implementation evidence can be bound and rechecked. Historical withdrawn, superseded, cancelled and retired records cannot be edited back into active knowledge.

Revising a record appends a revision. Confirmed upstream links cause one deduplicated open notice per dependent/upstream pair, not unbounded transitive invalidation. Notices require human resolution. Retired links retain their reason and time. The preview UI creates `depends_on` links; the domain also defines other relation types for future consumers.

Handoff assembly follows active upstream relationships with a visited set (cycles terminate), includes active intentions and project-wide open questions, checks relevant notices and pins source revisions. Any knowledge mutation marks old snapshots historical. This coarse invalidation is conservative and can create false-positive staleness; it is an explicit first-build trade-off.

## AI boundary

The provider receives the project name/initial idea, user request, and at most 20 explicitly selected records within a 30,000-character context budget. Oversize context is rejected, not silently truncated. The provider can return 1–5 draft records through a validated JSON schema. It has no database tool or acceptance operation. A pending proposal stores provider/model, prompt, source revision manifest and base knowledge version. Human acceptance is a separate authenticated command; intervening knowledge changes obsolete the proposal.

Chat Completions-compatible transport is supported, not universal provider compatibility. Switching a model does not change stored knowledge, but models must support JSON responses and may differ in quality. No AI-provider round trip has been verified without configured credentials. Proposed records can be accepted as drafts, then edited individually; partial proposal acceptance and editable proposal sets are future work.

## Repository boundary

The application owns exploratory project state. The target repository owns code and implementation history. Markdown handoffs are immutable exported snapshots with identifiers, pinned revisions and SHA-256 content digests. A digest detects content differences; it does not prove approval, correctness or authenticity. Export does not overwrite or synchronize repository files. There is no promise that a generated implementation follows a handoff.

Manual findings can be recorded as evidence. Automated read-only PR inspection, exact-head checks and implementation acceptance are a later work package. They must be implemented together, so a stale check cannot approve a new commit.
