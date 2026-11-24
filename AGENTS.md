# Project Guidelines

## Repository Layout

Turborepo manages this monorepo.

```
/apps
  /api        <-- Go backend API server
  /extension  <-- wxt.dev browser extension
  /web        <-- TanStack Start app
/packages
  /api-client     <-- TypeScript SDK for the API, generated with orval.dev
  /data-commons   <-- shared types and utilities
  /extensions-sdk <-- React slot/nav registry for building frontend extensions
...
```

## Tech Stack

| Area     | Tools                                                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo | Turborepo                                                                                                                        |
| Frontend | pnpm, TanStack Start, React, TypeScript, Tailwind CSS, Shadcn UI, Zustand, TanStack Form, TanStack Query, Zod, Vitest, Storybook |
| Backend  | Go, Authula, PostgreSQL                                                                                                          |

## General Principles

- Respect existing patterns in the codebase.
- Prioritise readability and maintainability above all else.
- Avoid comments as they become outdated and need to be maintained alongside the code too. Make ALL code self-explanatory as much as possible. If comments are needed, only comment what cannot be explained by code.

## Frontend (TypeScript)

- Don't use `useMemo`, `useCallback` or similar memoisation hooks; the React compiler handles this.
- Place code by scope:
  - Shared across projects → `packages/data-commons/models/<domain>.ts` (e.g. `steps.ts`).
  - Project-specific → that project's `models` folder, in its own domain file (e.g. `apps/web/src/models/steps.ts`), exported from the folder's index.
  - This applies to types, Zod schemas, utilities — everything.
- Format every file you touch with `oxfmt`.
- Write component tests as Storybook stories run through Vitest, not plain React Testing Library.
- Reserve Playwright e2e tests (`apps/web/e2e`, run with `pnpm --filter web test:e2e`) for high-level critical journeys — auth, guide creation, publishing and similar. Everything below that belongs in component or unit tests.
- Always follow coding principles such as DRY (Don't Repeat Yourself) and KISS (Keep It Simple Stupid) to make sure the code stays clean and consistent. Instead of repeating logic such as handlers/events across components, move that logic into hooks instead and have components call them from there e.g. the logic within `handleStarToggle` can be moved into a hook and then the component that calls `handleStarToggle` will delegate the call to the hook whilst wrapping it with try/catch if needed.

`apps/extension`:

- Don't ever update `UserManifest.version` in the `wxt.config.ts` file. Leave it on v0.1.0

## Backend (Go)

- Use the existing `Makefile` targets rather than writing commands by hand.

## Agent Skills

Skills live in `.agents/skills/` and contain the playbooks to follow for each domain.

- `web` and `extension` projects → follow the **frontend** skills.
- `api` project → follow the **backend** skills.
- When in plan mode → follow the **productivity** skills.
- Always invoke and use the **don't waffle** skill by default when planning, summarising or writing documents.
