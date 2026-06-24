---
name: frontend
description: Reusable frontend patterns for React projects — covering forms, error handling, service architecture, state management, HTTP, validation, testing, and configuration conventions
---
# Frontend Patterns

Reusable frontend patterns for React projects. These skills cover the patterns used across this monorepo, including both the web app (TanStack Start) and the extension app (WXT).

## Data Fetching Architecture

This project uses **`@repo/api-client`** — an Orval-generated OpenAPI SDK — as the primary data access layer. It provides:

- **Type-safe HTTP client functions** (`api.guides.*`) for server-side usage
- **Auto-generated React Query hooks** (`useGetAllGuides`, `useCreateGuide`, etc.) for client-side usage
- **TypeScript types and Zod schemas** for all API models

### Web App (TanStack Start)
Server-side fetching uses **server functions** (`createServerFn`) that wrap `api.*` calls from `@repo/api-client`. Route loaders call these server functions. See the [react-components](./react-components/SKILL.md) skill.

### Extension App (WXT / SPA)
Uses `@repo/api-client` directly — `api.*` for programmatic calls (background scripts, services) and auto-generated React Query hooks for React components. No manual HTTP implementations, factory functions, or service files needed.

### When api-client doesn't cover a scenario
Fall back to the traditional factory method + DI patterns — see [service-architecture](./service-architecture/SKILL.md), [factory-method-pattern](./factory-method-pattern/SKILL.md), and [http-client-abstraction](./http-client-abstraction/SKILL.md).

## Skills

### [Constants Configuration Pattern](./constants-configuration-pattern/SKILL.md)
Centralize environment variables in `constants/`. API endpoint constants are no longer needed — `@repo/api-client` handles URL construction via `import.meta.env.VITE_API_URL`.

### [Factory Method Pattern](./factory-method-pattern/SKILL.md)
The core architectural convention for when api-client isn't used — every operation is a functional factory that takes dependencies (a function, or URL + HTTP function) and returns a handler closure. Types come from `models/`. When using api-client, server functions replace factories.

### [Form Handling](./form-handling/SKILL.md)
Five-step form pattern: Zod schema → `formOptions` → `useForm` with `validators` → `form.Field` render prop → `try/catch` submission with toast feedback.

### [Error Handling](./error-handling/SKILL.md)
Three-tier error propagation with an additional tier for api-client/server-fn response handling.

### [Functional Dependency Injection](./functional-dependency-injection/SKILL.md)
Dependency injection through function parameters. When using api-client, dependencies are imported directly — no injection needed.

### [HTTP Client Abstraction](./http-client-abstraction/SKILL.md)
Extension-only: the `@repo/api-client` SDK provides `api.*` methods and auto-generated React Query hooks — no manual HTTP implementations needed. For endpoints not covered by api-client, use direct `fetch` calls with Zod response validation.

### [React Query Cache Utilities](./react-query-cache-utilities/SKILL.md)
Cache-first data fetching patterns using `@tanstack/react-query`. For domains covered by `@repo/api-client`, hooks are auto-generated. For others, use manual setup.

### [Service Architecture](./service-architecture/SKILL.md)
Domain service patterns: the primary pattern uses `@repo/api-client` via server functions (web) or auto-generated hooks (extension). Falls back to Drizzle implementation → factory → composition for non-api-client domains.

### [Service Layer Composition](./service-layer-composition/SKILL.md)
How services are wired together: with api-client, no composition is needed — the SDK is the composition. Falls back to `{domain}.composition.ts` files (web) or inline wiring (extension).

### [Type Contract Architecture](./type-contract-architecture/SKILL.md)
Type contracts that define operation signatures. The api-client auto-generates all types. Project-specific models are only needed for types not covered by the SDK.

### [Unit Testing](./unit-testing/SKILL.md)
Two-layer testing: server function tests with mocked api-client, or pure factory tests with mocked dependencies. Implementation tests with mocked fetch for HTTP layer.

### [Zod Schema Validation](./zod-schema-validation/SKILL.md)
Zod schemas for runtime validation. The api-client provides Zod schemas for all API models. Form/input validation still uses manual Zod schemas.

### [Zustand State Management](./zustand-state-management/SKILL.md)
Global state management with Zustand — one store per domain, selector-based subscriptions, `undefined`/`null` tri-state convention.
