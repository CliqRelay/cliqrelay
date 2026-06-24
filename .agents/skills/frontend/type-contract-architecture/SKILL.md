---
name: type-contract-architecture
description: Define TypeScript function signature types in each project's models/ folder — for domains not covered by @repo/api-client, these types act as contracts between service factories and their implementations
---

# Type Contract Architecture

This project has **two sources of types**:

1. **`@repo/api-client`** — auto-generated types for all API models and operations (preferred)
2. **Project `models/` folder** — manual types for domains not covered by `@repo/api-client`

---

## Source 1: `@repo/api-client` (Preferred)

For API-covered domains, all types come directly from `@repo/api-client`:

```typescript
// ✅ DO — Import types from @repo/api-client
import { api } from "@repo/api-client";
// api.guides.* returns typed responses

// Or import model types directly
import type { Guide, CreateGuideRequest } from "@repo/api-client";
```

Types that come from `@repo/api-client`:
- All entity types (`Guide`, `Step`, `CanvasElement`, etc.)
- All request/response types (`CreateGuideRequest`, `GetAllGuidesResponse`, etc.)
- All operation return types (inferred from the `api.guides.*` calls)

No manual type definitions needed for these domains.

### ✅ DO — Use `@repo/api-client` types as the default source
### ❌ DON'T — Duplicate types in project `models/` that already exist in `@repo/api-client`

---

## Source 2: Project `models/` Folder (Fallback)

For domains **not covered by `@repo/api-client`**, every operation is defined as a TypeScript function type in each project's `models/` folder. These types act as contracts that both the factory (consumer) and implementation (provider) must conform to.

The type IS the API boundary. If the type compiles, the layers fit together.

Types are NEVER defined in service files. They are always defined in the project's `models/` folder and imported into services.

### Folder Structure

```
apps/web/src/models/
├── index.ts                  ← Re-exports all models
├── guides.ts                 ← Types + schemas for guides domain
└── steps.ts

apps/extension/src/models/
├── index.ts
├── guides.ts
└── steps.ts

packages/data-commons/src/models/
├── index.ts
├── guides.ts                 ← Canonical Zod schemas + inferred types
└── steps.ts
```

### Two Naming Conventions (Fallback)

#### Web App: Plain Operation Names

```typescript
// models/guides.ts
import type { Guide } from "@repo/api-client";

import type { guidesTable } from "@/db/schema";

export type GuideCreateInput = typeof guidesTable.$inferInsert;
export type CreateGuide = (input: GuideCreateInput) => Promise<Guide>;
export type GetGuideById = (guideId: string) => Promise<Guide | null>;
```

#### Extension App: Http-prefixed Names

```typescript
// models/guides.ts
import { z } from "zod";
import { getValidationResult, guideSchema, type CreateGuideInput } from "@repo/data-commons";

export const httpCreateGuideResponseBodySchema = z.object({
  data: guideSchema,
});
export type HttpCreateGuideResponseBody = z.infer<typeof httpCreateGuideResponseBodySchema>;

export type HttpCreateGuide = (
  url: string,
  body: CreateGuideInput,
) => Promise<HttpCreateGuideResponseBody>;
```

### Naming Rules (Fallback)

| Operation | Web Type Name | Extension Type Name |
|-----------|---------------|---------------------|
| Create | `Create{Noun}` | `HttpCreate{Noun}` |
| Read by ID | `Get{Noun}ById` | `HttpGet{Noun}ById` |
| List | `List{Nouns}By{Field}` | `HttpGet{Nouns}` |
| Update | `Update{Noun}` | `HttpPatch{Noun}` |
| Delete | `Delete{Noun}` | `HttpDelete{Noun}` |

### Input Types Convention (Fallback)

```typescript
// Web app — Drizzle-inferred
export type GuideCreateInput = typeof guidesTable.$inferInsert;

// Extension app — Zod-inferred
export const createStepInputSchema = z.object({
  guideId: z.string().uuid(),
  action: stepActionSchema,
  url: z.string().min(1),
});
export type CreateStepInput = z.infer<typeof createStepInputSchema>;
```

---

## When to Use What

| Scenario | Type Source | Example |
|----------|-------------|---------|
| Domain covered by api-client | `@repo/api-client` | `import type { Guide } from "@repo/api-client"` |
| Domain NOT covered, uses Drizzle (web) | `models/{domain}.ts` | `export type CreateGuide = ...` |
| Domain NOT covered, uses HTTP (extension) | `models/{domain}.ts` | `export type HttpCreateGuide = ...` |
| Shared entity schemas | `@repo/data-commons` | `export const guideSchema = z.object({...})` |

## Rules

### ✅ DO
- Prefer types from `@repo/api-client` for all covered domains
- Define fallback types in flat `models/{domain}.ts` files (one file per domain)
- Use plain names for web app types (`CreateGuide`)
- Use `Http{Verb}{Noun}` for extension app types
- Export through `models/index.ts`
- Use `@repo/data-commons` for shared entity types

### ❌ DON'T
- Don't duplicate types that already exist in `@repo/api-client`
- Don't define types in service files — they go in `models/`
- Don't repeat the type definition — one type, two consumers
- Don't mix unrelated domain types in the same file
- Don't put types in subdirectories like `models/types/` — use flat files
