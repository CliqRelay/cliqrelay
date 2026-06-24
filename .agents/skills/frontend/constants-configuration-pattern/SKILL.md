---
name: constants-configuration-pattern
description: Centralize all configuration constants — environment variables, cache keys — in the constants/ directory with strict naming and export conventions
---

# Constants & Configuration Pattern

All configuration and constant values are centralized in `constants/`, organized by concern. No hardcoded strings in service or component files.

## Key Change: API Endpoints No Longer Manual

With `@repo/api-client`, API endpoint URLs are **no longer defined manually**. The auto-generated SDK handles all URL construction using `import.meta.env.VITE_API_URL` (set via `@t3-oss/env-core`). See [env.ts](#environment-config-constantsenvts) below.

For domains not covered by `@repo/api-client`, API endpoints can still be defined — see the legacy pattern at the end of this document.

## Folder Structure

```
constants/
├── env.ts                ← Environment variables (required)
├── query-keys.ts         ← Cache keys (when using manual TanStack React Query)
└── index.ts              ← Optional re-exports
```

## Environment Config (`constants/env.ts`)

Use `@t3-oss/env-core` with Zod schemas for validated, typed environment variables. Choose the example that matches your framework.

### Vite / TanStack Start

Uses `import.meta.env` with `VITE_` prefix:

```typescript
// constants/env.ts
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().nonempty(),
    API_SECRET: z.string().nonempty()
  },

  clientPrefix: "VITE_",
  client: {
    VITE_API_URL: z.string().nonempty().url(),
    VITE_BASE_URL: z.string().nonempty().url(),
    VITE_APP_NAME: z.string().nonempty(),
    VITE_APP_VERSION: z.string().nonempty()
  },

  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true
});
```

> **Note:** `VITE_API_URL` is consumed by `@repo/api-client` (Orval config reads `import.meta.env.VITE_API_URL`). No manual URL construction needed.

### ✅ DO — Use `createEnv` with Zod for validated env vars
### ✅ DO — Separate `server` and `client` blocks
### ✅ DO — Set `emptyStringAsUndefined: true`
### ✅ DO — Use `VITE_` prefix for client variables
### ❌ DON'T — Access raw env vars directly in service/hook files

```typescript
// ❌ DON'T — Raw access
const apiUrl = import.meta.env.VITE_API_URL;

// ✅ DO — Always import from ./env
import { env } from "[project-root]/constants/env";
const apiUrl = env.VITE_API_URL;
```

## If Using Manual TanStack React Query (Non-api-client Domains)

Query keys go in `constants/query-keys.ts`. QueryClient setup and cache utilities belong in `lib/query-client.ts` — see the [React Query Cache Utilities](./react-query-cache-utilities/SKILL.md) skill.

## Legacy Pattern: Manual API Endpoints (Non-api-client Domains)

For domains **not covered by `@repo/api-client`**, define API endpoints manually:

```typescript
// constants/api-endpoints.ts
import { env } from "./env";

const API_ENDPOINTS = {
  metadata: {
    app: `${env.VITE_API_URL}/app_metadata`
  },
  auth: {
    createAccount: `${env.VITE_API_URL}/auth/create_account`
  },
  users: {
    getMe: `${env.VITE_API_URL}/users/me`,
  },
} as const;

export default API_ENDPOINTS;
```

### ✅ DO — Legacy endpoint conventions
- `API_ENDPOINTS` uses `as const` for type safety
- Template literals for URL construction: `` `${env.VITE_API_URL}/path` ``
- Only define endpoints for APIs not covered by `@repo/api-client`

### ❌ DON'T — Duplicate what api-client already provides
```typescript
// ❌ DON'T — @repo/api-client already defines these URLs
const API_ENDPOINTS = {
  guides: {
    create: `${env.VITE_API_URL}/guides`,
    getAll: `${env.VITE_API_URL}/guides`,
  }
} as const;
```

## Rules

### ✅ DO
- Use `createEnv` from `@t3-oss/env-core` with Zod for env validation
- Separate `server` and `client` env vars
- Set `emptyStringAsUndefined: true`
- Match `clientPrefix` to your framework's convention
- Access env through `env` export, never directly from env globals
- Let `@repo/api-client` handle all API URL construction for covered domains
- Only define manual API endpoints for domains NOT covered by `@repo/api-client`
- Query keys are enum members, not string literals
- One config concern per file

### ❌ DON'T
- Don't manually define API endpoints for domains covered by `@repo/api-client`
- Don't access raw env vars in service, hook, or component files
- Don't mix config concerns in the same file
- Don't skip Zod validation on environment variables
