# Praja

A human-led workspace for turning incomplete software-project thinking into durable knowledge and bounded implementation contracts.

## Run locally

Requires Node.js 22+ and npm. No AI account or GitHub OAuth setup is needed for the loopback-only development mode.

```sh
npm ci
PRAJA_LOCAL_DEV=1 npm run dev
```

Open http://127.0.0.1:3000. On Windows PowerShell use `$env:PRAJA_LOCAL_DEV="1"; npm run dev`. This mode uses a single development identity and an embedded PostgreSQL engine (PGlite), persisted in `.local-data/db`. It is for development, not a public deployment. Back up this directory only with the application stopped.

## What works

- Create separate projects and resume saved thinking sessions.
- Maintain typed questions, claims, intentions, decisions and work scopes, with immutable revisions and explicit reasons for changes.
- Link dependencies, receive direct impact notices, resolve them with a rationale and retire outdated relationships without erasing history.
- Request optional AI draft proposals using explicitly selected context. Review them before they become records; stale proposals cannot be applied.
- Approve and download immutable implementation handoffs containing pinned source revisions, criteria, exclusions, open questions and a content hash.
- Keep historical handoffs visibly distinct when knowledge changes.

This is an early working preview, not the entire final product concept. Work-mode selection currently labels a session; specialized comparison or threat-model editors are not implemented. GitHub PR/check inspection, repository publication/sync, file import, team collaboration and verified delivery acceptance are not implemented. The UI states this boundary, and scope acceptance is blocked rather than inferred from documentation. AI output is not evidence of correctness or user understanding.

## Hosted configuration

Use a PostgreSQL database and a GitHub OAuth app. Set the following environment variables in your server environment:

| Variable                     | Purpose                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `DATABASE_URL`               | PostgreSQL connection string; configure TLS according to your provider             |
| `NEXTAUTH_URL`               | Canonical application URL                                                          |
| `NEXTAUTH_SECRET`            | Strong random authentication secret                                                |
| `GITHUB_ID`, `GITHUB_SECRET` | GitHub OAuth app credentials                                                       |
| `AI_API_KEY`, `AI_MODEL`     | Optional AI credentials and model                                                  |
| `AI_BASE_URL`                | Optional Chat Completions-compatible endpoint, default `https://api.openai.com/v1` |

GitHub callback: `https://YOUR_HOST/api/auth/callback/github`. The OAuth scope identifies the user; it does not grant repository write access. Do not enable `PRAJA_LOCAL_DEV` for hosting. It is ignored in production.

```sh
npm run db:migrate
npm run build
npm start
```

Database credentials must be available to the migration command. `npm start` requires an already migrated database. No secrets are committed. Public hosting also requires operational rate limiting, backups and monitoring; see [security](docs/security.md).

## Verify

```sh
npm run verify
npm run test:api
npx playwright install chromium
npm run test:browser
```

Browser tests run a real loopback development server and persist test projects in the local development database. Use a separate checkout for tests if you want to keep a personal development database clean.

## Repository map

| Path             | Responsibility                                                            |
| ---------------- | ------------------------------------------------------------------------- |
| `src/domain`     | Record validation, revisions, commands, impact notices, snapshot assembly |
| `src/server`     | Authentication, transaction-backed persistence, HTTP boundaries           |
| `src/app/api`    | Owner-scoped API handlers and optional proposal generation                |
| `src/components` | Interactive project workspace                                             |
| `tests`          | Domain contracts, transaction behavior, browser workflow                  |
| `docs`           | Architecture, security boundaries and implementation status               |
| `.agents/skills` | Reusable repository development workflow                                  |

Start with [architecture](docs/architecture.md), [implementation status](docs/implementation.md) and [AGENTS.md](AGENTS.md). Application source and exported project knowledge are different things: creating a project in Praja never edits this repository automatically.
