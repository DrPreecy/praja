# Praja engineering context

Follow the repository-root AGENTS.md. Read docs/architecture.md before modifying authority or persistence.

AI produces reviewable drafts. Humans accept consequential knowledge. Project changes require server-side owner checks, expected versions and transactions. Preserve revision history and immutable handoffs. No target-repository execution or writes are currently implemented.

Use `npm run verify`; use `npm run test:browser` for user flows. Report limitations honestly, particularly untested external services. See `.agents/skills/bounded-change/SKILL.md` for the incremental workflow.
