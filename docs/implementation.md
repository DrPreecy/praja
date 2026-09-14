# Implementation state

## Delivered preview

The core manual loop is implemented: create project → save focused work → capture typed knowledge → revise with history → connect dependencies → resolve direct impacts → approve and export pinned handoff. AI proposals are optional and cannot accept substantive decisions. Production persistence and authentication adapters exist; local development runs without external credentials.

## Next implementation units

1. Add read-only GitHub PR inspection with authenticated repository authorization, complete paginated file/check collection, exact head/base references, and a re-fetch immediately before human acceptance. Never equate passing checks with product correctness.
2. Complete delivery review UX with criterion-by-criterion evidence, unresolved deviations, human explanation and revision-bound acceptance. Remove the current acceptance block only when its tests cover stale heads, missing checks, permission failures and stale contracts.
3. Break the main UI into focused components, improve unsaved-work recovery and introduce differentiated Compare/Validate surfaces after interaction testing.
4. Add project export/import and tested schema migration strategy before important long-lived data is entrusted to hosted instances.
5. Measure aggregate size and query latency before deciding when to normalize revisions and introduce scoped context search. Avoid speculative semantic retrieval.

## Explicitly not delivered

Full concept parity, autonomous coding, repository writes/sync, multiuser collaboration, specialized methodology engines, voice capture, mobile offline mode, automatic code understanding and guarantees against rubber-stamping. No deployment is included in this branch.

## Acceptance evidence

`npm run verify` checks type safety, domain/transaction tests and the production build. `npm run test:browser` exercises real API persistence through the UI. Tests cannot establish that a human understands implementation. That remains a product evaluation requirement.

Initial branch verification: typecheck, 11 unit/transaction tests, production build and the HTTP integration scenario passed. The HTTP scenario exercises the real local server, persistent project writes, cross-origin rejection, stale-version conflicts and pinned handoffs. Browser execution was attempted but the Chromium download failed in the development environment; the browser scenario is supplied for CI/local execution but its pass is not claimed. OAuth and external AI-provider integration remain unverified without credentials.
