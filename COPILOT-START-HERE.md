# Praja implementation entry prompt

Use this file as the task brief when the repository owner asks you to begin implementing Praja. Read applicable repository and directory instructions before changing files.

## Required concept

Ask the owner to attach **Praja-Definitive-Concept-v3.docx**, unless its complete contents are already available in your current context or repository. Read all 36 sections and the sources before choosing implementation scope. Do not infer the concept from this prompt, an older architecture document, or the existing preview. If you cannot read the attachment, request a readable Markdown export. Do not invent missing requirements.

The concept is a design baseline, not evidence that its hypotheses have been validated and not blanket permission to implement every feature autonomously.

## First inspect the actual repository

1. Inspect the current branch, working tree, available branches, README, applicable AGENTS.md and Copilot instructions, package scripts, architecture, implementation notes, tests and persistence path.
2. Check **feat/project-workspace** if available: it contains an existing preview. The default main branch may not contain that application. Do not interpret an empty default branch as a reason to rebuild everything.
3. Compare the preview against the supplied V3 concept. Separate observed behavior, documented claims and unverified integrations. Trace one actual user action through UI, server, persistence and tests.
4. Preserve useful existing code. Do not merge branches, delete work, reset the repository or replace the stack without an explicit reason and the appropriate owner decision.
5. Existing instructions still apply. If older architecture notes conflict with V3, explain the particular conflict and proposed resolution; do not silently discard security or verification requirements.

## Work with the owner

Praja is human-led. Help the owner build and understand it, rather than merely approving output.

Before the first substantive implementation increment, present:
- a concise assessment of what exists and what differs from V3;
- one recommended bounded change with observable acceptance behavior;
- relevant concept sections, expected affected files and important risks;
- a meaningful human contribution, such as tracing a request, writing or adapting a test, implementing one small part, or reviewing a specific design choice.

Ask the owner to choose or confirm that first work allocation if it has not already been selected. Inspection and read-only verification can proceed immediately. If operating asynchronously without a human response, return the assessment and concrete proposed unit instead of assigning yourself the owner's contribution or building the entire product.

Explain in German when speaking with the owner unless requested otherwise; retain existing repository conventions for code and technical artifacts. Keep explanations tied to actual files and behavior. Do not turn learning into mandatory quizzes or claim that approval proves understanding.

## Implement one agreed unit

Once the unit and work allocation are established:
1. Record a short purpose, scope, exclusions, acceptance expectations, chosen human work and stop conditions. Use an existing work document if suitable.
2. Implement the authorized portion on an appropriate working branch. Do not take over reserved human work silently.
3. Prefer existing dependencies and components. Verify installed-version documentation before relying on framework or provider APIs.
4. Preserve original input, history, server-side authorization and revision integrity. AI-generated content must not acquire decision-acceptance authority.
5. Run the repository's prescribed checks and meaningful tests for changed behavior. Report failures, unavailable tools and unrun checks precisely. Do not claim provider, authentication or GitHub integrations work merely because compilation passes.
6. Review the diff against the agreed behavior, including failure cases, dependencies, source ownership and remaining uncertainty.
7. Return what changed, why, where to inspect it, checks actually run, remaining issues and the next useful human action.

Stop and surface consequential scope changes, missing authority, failed assumptions or newly required architectural decisions. Resolve routine implementation details within the agreed scope without repeated trivial approvals. Do not merge, deploy, spend money or broaden external permissions without applicable authorization.

## Scope discipline

Follow V3's implementation sequence and V1 classifications. Do not recreate the older concept wholesale, introduce a general agent orchestrator, or turn the product into only a chat interface or documentation system. A conceptual repository blueprint is guidance on responsibility, not permission to move every existing file.

Treat project knowledge, agent operating instructions and execution permissions as distinct. Keep notes short and useful. Preserve the link from the chosen requirement to implemented behavior and observed evidence.

## First response

Begin with the repository inspection and concept availability check. Then give the short assessment and proposed first implementation unit. Do not respond with only a promise to help, and do not launch whole-project autonomous implementation.
