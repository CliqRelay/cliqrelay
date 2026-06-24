---
name: service-architecture
description: Structure every domain using @repo/api-client (preferred) or as three independent tiers — HTTP/Drizzle implementation, business logic factory, and wiring composition
---

# Service Architecture

This project has **two service architectures** depending on whether `@repo/api-client` covers the domain:

- **Primary**: Use `@repo/api-client` directly — no custom service layers needed
- **Fallback**: Three-tier architecture (implementation → factory → composition)

---

## Primary Architecture: Using `@repo/api-client`

### Web App (TanStack Start): Server Functions

Route loader calls server function, which calls `api.*`:

```
Route Loader
    │
    ▼  (calls server function from server-fns/)
createServerFn({...}).handler(async () => {
    │
    ▼  (imports api from @repo/api-client)
    return api.guides.*(...)
    │
    ▼
API Server (Go backend)
```

### Folder Structure

```
apps/web/src/
├── server-fns/
│   ├── guides.ts         ← Server functions wrapping api.guides.*
│   └── steps.ts
├── routes/
│   ├── dashboard/
│   │   ├── index.tsx     ← Loader calls getAllGuides()
│   │   └── guides/
│   │       └── $guideId.tsx  ← Loader calls getGuideById()
│   └── ...
```

### Server Function Example

```typescript
// server-fns/guides.ts
import { createServerFn } from "@tanstack/react-start";
import { api } from "@repo/api-client";
import type { GuideUpdateInput } from "@/models";

export const getAllGuides = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, status } = await api.guides.getAllGuides();
    if (status !== 200) {
      console.error("Failed to fetch guides:", data);
      throw new Error("Failed to fetch guides");
    }
    return data.guides;
  });

export const getGuideById = createServerFn({ method: "GET" })
  .inputValidator((guideId: string) => guideId)
  .handler(async ({ data: guideId }) => {
    const response = await api.guides.getGuideById(guideId);
    if (response.status !== 200 || !response.data?.guide) {
      return null;
    }
    return response.data.guide;
  });

export const createGuide = createServerFn({ method: "POST" })
  .inputValidator((input: { title: string; description?: string }) => input)
  .handler(async ({ data }) => {
    const response = await api.guides.createGuide({
      title: data.title,
      description: data.description ?? null,
    });
    if (response.status !== 201 || !response.data?.guide) {
      console.error("Failed to create guide:", response.data);
      return null;
    }
    return response.data.guide;
  });
```

### Route Loader Example

```typescript
// routes/dashboard/guides/index.tsx
import { api } from "@repo/api-client";
// OR import from server-fns:
import { getAllGuides } from "@/server-fns/guides";

export const Route = createFileRoute("/dashboard/guides/")({
  loader: async () => {
    // Option A: call server-fn
    const guides = await getAllGuides();
    // Option B: call api-client directly (simpler when no caching needed)
    // const guides = await api.guides.getAllGuides();
    return { guides };
  },
  component: GuidesPage,
});
```

### Rules (api-client pattern):
- Server functions go in `server-fns/{domain}.ts`
- One function per API operation
- Import `api` from `@repo/api-client`
- Check `response.status` and `response.data` for error handling
- Route loaders call server functions (or api-client directly for simple cases)
- No factory functions, no DI, no composition needed

---

### Extension App (WXT / SPA): Use `@repo/api-client` Directly

The extension uses `@repo/api-client` directly for all API calls. The SDK's `api.*` functions use `fetch` under the hood, so no manual HTTP implementations, factory functions, or service layers are needed:

```
// Programmatic usage (background scripts, non-React):
import { api } from "@repo/api-client"
    │
api.guides.*(...)
    │
    ▼
API Server

// React components (auto-generated hooks):
import { useGetAllGuides } from "@repo/api-client"
    │
useGetAllGuides()
    │
    ▼
API Server
```

```typescript
// ✅ DO — Use api.* for programmatic calls
import { api } from "@repo/api-client";

async function handlePublish(guideId: string) {
  const response = await api.guides.publishGuide(guideId);
  if (response.status >= 400 || !response.data?.guide) {
    throw new Error("Failed to publish guide");
  }
  return response.data.guide;
}

// ✅ DO — Use auto-generated hooks in React components
import { useGetAllGuides, useCreateGuide } from "@repo/api-client";

function GuideList() {
  const { data, isLoading } = useGetAllGuides();
  const createMutation = useCreateGuide({ ... });
  // ...
}
```

### Rules (extension api-client pattern):
- Import `api` from `@repo/api-client` for programmatic HTTP calls
- Import hooks from `@repo/api-client` for React components
- No manual `http-{domain}.service.ts` files — the SDK uses `fetch` internally
- No factory functions, no DI, no composition
- No `constants/api-endpoints.ts` — URLs are handled by the SDK

---

## Fallback Architecture: Three-Tier (Non-api-client Domains)

For domains **not covered by `@repo/api-client`**, use the traditional three-tier architecture.

This is built on the **[functional-dependency-injection](../functional-dependency-injection/SKILL.md)** pattern.

### Architecture A: Web App (Server-side / Drizzle)

```
Tier 1: Drizzle Implementation  →  services/server/drizzle-{domain}.service.ts
Tier 2: Business Logic          →  services/{domain}/{domain}.service.ts
Tier 3: Composition             →  services/{domain}/{domain}.composition.ts
```

### Architecture B: Extension App (Client-side / HTTP)

```
Tier 1: HTTP Implementation  →  services/{domain}/http-{domain}.service.ts
Tier 2: Business Logic       →  services/{domain}/{domain}.service.ts
Wiring:                       →  services/{domain}/index.ts
```

### Tier Details (Fallback)

**Tier 1 (Web):** `services/server/drizzle-{domain}.service.ts` — One async function per DB operation.

```typescript
export const drizzleCreateGuide = async (db: DB, input: GuideCreateInput): Promise<Guide> => {
  const [guide] = await db.insert(guidesTable).values(input).returning();
  return guide;
};
```

**Tier 1 (Web):** `services/server/drizzle-{domain}.service.ts` — One async function per DB operation.

```typescript
export const drizzleCreateGuide = async (db: DB, input: GuideCreateInput): Promise<Guide> => {
  const [guide] = await db.insert(guidesTable).values(input).returning();
  return guide;
};
```

**Tier 2:** `services/{domain}/{domain}.service.ts` — Factory functions receiving dependencies via DI.

```typescript
export const createGuideFactory = (createGuide: CreateGuide) => {
  return async (input: GuideCreateInput): Promise<Guide> => createGuide(input);
};
```

**Tier 3 (Web):** `services/{domain}/{domain}.composition.ts` — Wires factories to Drizzle implementations.

```typescript
export const guideService = {
  createGuide: createGuideFactory((input) => drizzleCreateGuide(db, input)),
};
```

---

## Data Flow Comparison

```
api-client (Preferred):
  Web:   Component → Loader → Server Function → api.* → API Server
  Ext:   Component → use*() Hook → API Server
  Ext:   Background script → api.* → API Server

Fallback (Web, non-api-client domains):
  Component → Composition → Factory → Drizzle → DB
```

---

## Rules Summary

### ✅ DO
- Use `@repo/api-client` + server functions (web) as the primary pattern
- Use `@repo/api-client` directly (both `api.*` and hooks) for the extension
- Fall back to three-tier architecture only for non-api-client domains
- Keep tiers independent — factories never import implementations directly

### ❌ DON'T
- Don't create `http-{domain}.service.ts` files for domains covered by `@repo/api-client`
- Don't mix api-client and three-tier patterns for the same domain
- Don't create factory/service files for domains covered by `@repo/api-client`
- Don't define types that already exist in `@repo/api-client`
- Don't instantiate classes — use factory functions + closures for fallback domains
