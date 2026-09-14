---
name: bounded-change
description: Implement or review a bounded change in Praja while preserving human authority, project revisions, owner isolation and explicit delivery evidence. Use for feature work, bug fixes and PR reviews in this repository.
---

# Bounded change

Read AGENTS.md and docs/implementation.md. Identify the user outcome, current behavior and smallest change that achieves the outcome. Do not silently expand project requirements.

Before editing, identify the affected command, stored state, owner boundary and user-visible behavior. If a change alters knowledge, preserve previous revisions and invalidate affected proposals/snapshots according to current rules.

Implement with existing dependencies where practical. Add behavioral tests for authorization, concurrency or acceptance changes. Run `npm run verify`; exercise changed interactions with `npm run test:browser`.

Conclude with changed behavior, checks actually run, remaining limitations and any external configuration required. Use a reviewable branch. Never claim generated code is correct solely because it compiles.
