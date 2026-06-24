---
name: service-layer-composition
description: Wire factories to implementations at a single composition point — but the primary pattern uses @repo/api-client which needs no composition
---

# Service Layer Composition

This project has two composition patterns depending on whether `@repo/api-client` covers the domain.

---

## Pattern A: No Composition Needed — `@repo/api-client` (Preferred)

When `@repo/api-client` covers a domain, **no composition layer is needed**. The SDK is the composition.

### Web App

```
Server Function (wraps api.* call)
    ↓
api-client SDK (handles URL, fetch, types)
    ↓
API Server
```

Server functions import `api` from `@repo/api-client` directly:

```typescript
// server-fns/guides.ts — no composition file needed
import { createServerFn } from "@tanstack/react-start";
import { api } from "@repo/api-client";

export const getAllGuides = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await api.guides.getAllGuides();
    return data.guides;
  });
```

### Extension App

```
// Programmatic usage:
Background Script / Service
    ↓
api.* from @repo/api-client
    ↓
API Server

// React components:
Component
    ↓
use*() hooks from @repo/api-client
    ↓
API Server
```

The extension uses `@repo/api-client` directly — no service files, factory functions, or composition needed:

```typescript
// ✅ DO — Programmatic calls: import api directly
import { api } from "@repo/api-client";

const response = await api.guides.getAllGuides();

// ✅ DO — React components: import hooks directly
import { useGetAllGuides } from "@repo/api-client";
```

---

## Pattern B: Traditional Composition (Fallback — Non-api-client Domains)

For domains not covered by `@repo/api-client`, use factory functions with composition.

### Web App: Composition via `{domain}.composition.ts`

```
┌────────────────────────────────────────────────┐
│  1. models/{domain}.ts                         │
│     Type contracts (function signatures)        │
├────────────────────────────────────────────────┤
│  2. services/server/drizzle-{domain}.service.ts│
│     Drizzle implementations (IO, side effects) │
├────────────────────────────────────────────────┤
│  3. services/{domain}/{domain}.service.ts      │
│     Factory functions (pure logic)             │
├────────────────────────────────────────────────┤
│  4. services/{domain}/{domain}.composition.ts  │
│     Composition layer (wiring dependencies)    │
├────────────────────────────────────────────────┤
│  5. services/{domain}/index.ts                 │
│     Barrel re-export of composed service       │
└────────────────────────────────────────────────┘
```

```typescript
// services/guides/guides.composition.ts
import { db } from "@/db";
import { drizzleCreateGuide } from "../server/drizzle-guides.service";
import { createGuideFactory } from "./guides.service";

export const guideService = {
  createGuide: createGuideFactory((input) => drizzleCreateGuide(db, input)),
};
```

```typescript
// services/guides/index.ts
export { guideService } from "./guides.composition";
export type { CreateGuide } from "./guides.service";
```

### Extension App: Composition in `index.ts`

```
┌────────────────────────────────────────────────┐
│  1. models/{domain}.ts                         │
│     Type contracts (HTTP function signatures)  │
├────────────────────────────────────────────────┤
│  2. services/{domain}/http-{domain}.service.ts │
│     HTTP implementations (fetch + validation)  │
├────────────────────────────────────────────────┤
│  3. services/{domain}/{domain}.service.ts      │
│     Factory functions (pure logic)             │
├────────────────────────────────────────────────┤
│  4. services/{domain}/index.ts                 │
│     Wiring (factory called with dependencies)  │
├────────────────────────────────────────────────┤
│  5. Call site (background/content script)      │
│     Imports already-wired function from barrel │
└────────────────────────────────────────────────┘
```

```typescript
// services/guides/index.ts — single source of truth for wiring
import { env } from "@/constants";
import { createGuideFactory } from "./guides.service";
import { httpCreateGuide } from "./http-guides.service";

export const createGuide = createGuideFactory(
  `${env.apiUrl}/api/guides`,
  httpCreateGuide,
);

export type { CreateGuide } from "./guides.service";
```

---

## Decision Guide

| Scenario | Composition Pattern |
|----------|-------------------|
| Domain covered by `@repo/api-client` | **None needed** — use SDK directly |
| Web app, non-api-client domain | `{domain}.composition.ts` |
| Extension app, non-api-client domain | Wire in domain `index.ts` |

---

## Barrel Export Conventions

### api-client Domains — Import from server-fns or @repo/api-client:

```typescript
// ✅ DO — Web: import server functions
import { getAllGuides } from "@/server-fns/guides";

// ✅ DO — Extension: import api or hooks from api-client
import { api } from "@repo/api-client";
import { useGetAllGuides } from "@repo/api-client";

// ✅ DO — Types from api-client
import type { Guide } from "@repo/api-client";
```

### Fallback Domains — Import from services barrel:

```typescript
// ✅ DO — Web: import composed service
import { guideService } from "@/services/guides";
import type { CreateGuide } from "@/services/guides";

// ✅ DO — Extension: import wired function
import { createGuide } from "@/services/guides";
import type { CreateGuide } from "@/services/guides";
```

### ❌ DON'T — Bypass the barrel or wire at the call site:
```typescript
// NEVER do this — bypassing established patterns
import { httpCreateGuide } from "@/services/guides/http-guides.service";
import { createGuideFactory } from "@/services/guides/guides.service";
const createGuide = createGuideFactory(API_ENDPOINTS.guides.create, httpCreateGuide);
```

---

## Rules

### ✅ DO
- Use `@repo/api-client` directly — no composition needed for covered domains
- For fallback: web uses `{domain}.composition.ts`; extension wires in `index.ts`
- Export a type alongside each wired function — defined via `ReturnType<typeof createGuideFactory>`
- Import from barrels: `@/services/guides` or `@/server-fns/guides`
- Each domain subfolder must have an `index.ts` that exports the final wired service(s)

### ❌ DON'T
- Don't create composition files for domains covered by `@repo/api-client`
- Don't compose factories in components, pages, or scripts
- Don't import directly from individual service files — always use the barrel
- Don't use classes for services
- Don't hardcode URLs or import them directly
- Don't define types in `index.ts` that duplicate what's already in `models/` or `@repo/api-client`
