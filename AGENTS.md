# Working in Praja

Read README.md, docs/architecture.md and docs/implementation.md before changing behavior.

## Invariants

- Humans own substantive decisions. AI may only prepare proposals; never give provider output authority to accept a decision.
- Keep original source text and prior record revisions. Never overwrite a published artifact.
- Every project operation must enforce owner identity on the server. Never accept an actor or owner supplied by the browser.
- Use expected versions and atomic transactions for changes. A conflict must not silently overwrite newer work.
- Code execution and repository write permissions are outside the current application boundary.
- Do not label a scope implemented or accepted just because a document exists or a build passes.
- Do not expose development authentication on hosted environments.

## Implementation workflow

Take one bounded work unit. State the affected invariant and acceptance behavior. Inspect existing code before adding dependencies. Preserve explicit limitations when a mechanism is not implemented.

Run `npm run verify`. For interactive changes also run `npm run test:browser` (install Chromium with `npx playwright install chromium` first). Report unrun checks and external configuration requirements. Never claim OAuth or AI-provider integration was tested without exercising configured services.

Keep secrets and `.local-data` out of commits. Do not merge or deploy without the user's instruction. Update docs when changing ownership, schema or delivery boundaries.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
