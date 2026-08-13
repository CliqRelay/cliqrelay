# Project Guidelines

## Folder Structure

Turborepo is used as the monorepo tool for this project, and the folder structure is organized as follows:

```
/apps
  /api <-- Go backend API server
  /extension <-- wxt.dev browser extension
  /web <-- TanStack Start app
/packages
  /api-client <-- TypeScript SDK for the API generated using orval.dev
  /data-commons <-- shared types and utilities
...
```

## Tech Stack

- **Monorepo**: Turborepo
- **Frontend**:
  - pnpm, TanStack Start, React, Tailwind CSS, Shadcn UI, Zustand, Tanstack Form, Tanstack Query, TypeScript, Zod, Vitest, Storybook
- **Backend**: Go, Authula, PostgreSQL

## General Principles

- Respect existing patterns in the codebase
- Prioritize readability and maintainability
- Always follow the agent skills for the relevant domain when writing new code or refactoring old code. For the `web` and `extension` projects, always follow the `frontend` agent skills. For the `api` project, follow the `backend` agent skills. This is crucial to maintain consistency and code quality across the codebase.
- In react apps, don't use hooks such as `useMemo`, `useCallback` and the likes because the react compiler already handles it.
- For shared types, utilities and code that is used across multiple typescript projects in this monorepo, put it in the `packages/data-commons/models` package. For code that is specific to one project, put it in the `models` folder of that project in its own dedicated domain file e.g. `guides.ts, steps.ts` etc. This way we keep this whole codebase consistent and maintainable. For example, if you are adding a new type for a step, add it to `packages/data-commons/models/steps.ts` if it's supposed to be shared across the monorepo, if not then just add it to the project specific folder e.g. `apps/web/src/models/steps.ts` file and export it from the index file of that folder. The same goes for Zod schemas and any other code.
- Always follow the `.agents/skills/frontend` skills when working within the `extension` and `web` projects and follow the `.agents/skills/backend` skills when working within the `api` project. This is crucial to maintain consistency and code quality across the codebase.

## Agent Skills

Always follow the Agent Skills located in the folder `.agents/skills/` as it contains all the skills and playbooks you need to follow to make sure you are adhering to the project guidelines and best practices.
