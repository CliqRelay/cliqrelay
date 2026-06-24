---
name: factory-method-pattern
description: Implement the functional factory method pattern used across all service layers — the single most important architectural convention in this project
---

# Factory Method Pattern

This project uses a **pure functional factory method pattern** for service layers where `@repo/api-client` is not used. For domains covered by `@repo/api-client`, server functions (web) or auto-generated hooks (extension) replace factories entirely.

Types are NEVER defined in service files. All types come from the project's `models/` folder or from `@repo/api-client`. See the **[type-contract-architecture](../type-contract-architecture/SKILL.md)** skill.

---

## When to Use Each Pattern

| Scenario | Pattern | Location |
|----------|---------|----------|
| Web app, api-client covers the domain | Server functions wrapping `api.*` calls | `server-fns/{domain}.ts` |
| Extension app, api-client covers the domain | Auto-generated hooks (`use*`) | Directly in components |
| Neither app has api-client coverage | Factory method pattern | `services/{domain}/{domain}.service.ts` |

---

## Pattern A: Server Functions with api-client (Web App — Preferred)

When `@repo/api-client` covers a domain, use **TanStack Start server functions** that wrap the SDK calls. No factory functions needed.

```typescript
// server-fns/guides.ts
import { createServerFn } from "@tanstack/react-start";
import { api } from "@repo/api-client";

export const getAllGuides = createServerFn({
  method: "GET",
}).handler(async () => {
  const { data, status } = await api.guides.getAllGuides();
  if (status !== 200) {
    console.error("Failed to fetch guides:", data);
    throw new Error("Failed to fetch guides");
  }
  return data.guides;
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

**Rules:**
- One function per API operation
- Import `api` from `@repo/api-client`
- Check `response.status` and `response.data` for error handling
- Return typed data (types come from `@repo/api-client`)
- Server functions are consumed by route loaders

---

## Pattern B: Use `@repo/api-client` Directly (Extension App — Preferred)

The extension app uses `@repo/api-client` directly. The SDK's `api.*` methods use `fetch` under the hood, so no manual HTTP implementations are needed. For React components, auto-generated hooks handle caching and re-fetching:

```typescript
// ✅ DO — Use api.* directly for programmatic calls (background scripts, etc.)
import { api } from "@repo/api-client";

async function handleCreateGuide(title: string) {
  const response = await api.guides.createGuide({ title, description: null });
  if (response.status >= 400 || !response.data?.guide) {
    throw new Error("Failed to create guide");
  }
  return response.data.guide;
}

// ✅ DO — Use auto-generated hooks for React components
import { useGetAllGuides, useCreateGuide } from "@repo/api-client";

function GuideList() {
  const { data, isLoading } = useGetAllGuides();
  const createGuideMutation = useCreateGuide({
    mutation: {
      onSuccess: (data) => {
        console.log("Guide created:", data);
      },
    },
  });
  // ...
}
```

**Rules:**
- Import `api` from `@repo/api-client` for programmatic HTTP calls
- Import hooks from `@repo/api-client` for React components
- No manual HTTP implementation files needed (`http-{domain}.service.ts` is no longer used)
- No factory functions needed
- No `http-{Verb}{Noun}` type contracts in `models/` — types come from the SDK

---

## Pattern C: Traditional Factory Method (Fallback)

This is NOT the Gang of Four class-based factory. This is a functional TypeScript pattern where factories are exported standalone functions that return closures.

### Two Variations

#### Variation C1: Web App (Drizzle/Server-side)

Factories take a single function-type dependency (no URL parameter):

```typescript
// services/guides/guides.service.ts
import type { CreateGuide, GuideCreateInput } from "@/models";

export const createGuideFactory = (createGuide: CreateGuide) => {
  return async (
    input: GuideCreateInput,
  ): Promise<Awaited<ReturnType<CreateGuide>>> => createGuide(input);
};

export type CreateGuide = ReturnType<typeof createGuideFactory>;
```

#### Variation C2: Extension App (Client-side/HTTP)

Factories take a URL string AND an HTTP function as dependencies:

```typescript
// services/guides/guides.service.ts
import type { CreateGuideInput, Guide } from "@repo/data-commons";
import type { HttpCreateGuide } from "@/models";

export const createGuideFactory = (
  url: string,
  httpCreateGuide: HttpCreateGuide,
) => {
  return async (data: CreateGuideInput): Promise<Guide> => {
    const response = await httpCreateGuide(url, data);
    return response.data;
  };
};
```

### Pattern Structure

```typescript
// ✅ CORRECT — Web app fallback pattern (function-only DI)
export const {verb}{Noun}Factory = (
  fn: {Verb}{Noun}
) => {
  return async (
    /* operation-specific params */
  ): Promise<ResultType> => fn(/* params */);
};
```

```typescript
// ✅ CORRECT — Extension app fallback pattern (URL + HTTP function DI)
export const {verb}{Noun}Factory = (
  url: string,
  httpFn: Http{Verb}{Noun}
) => {
  return async (
    /* operation-specific params */
  ): Promise<ResultType> => {
    const result = await httpFn(url, { /* params */ });
    return result;
  };
};
```

### Naming Rules

| Pattern | Example |
|---------|---------|
| `{verb}{Noun}Factory` | `createGuideFactory`, `getGuideByIdFactory`, `updateStepFactory` |
| Handler returned | No special name — it's the return value of the factory |
| File name | `{domain}.service.ts` — e.g. `guides.service.ts`, `steps.service.ts` |
| Export | Named export (not default) for each factory function |
| Dependency type | Matches the type contract defined in `models/{domain}.ts` |
| Service type | `export type {Verb}{Noun} = ReturnType<typeof {verb}{Noun}Factory>` — always in the service file |

## Where Factories Are Wired (Fallback Pattern Only)

For the wiring of factories in the fallback pattern, see the [Service Layer Composition](./service-layer-composition/SKILL.md) and [Functional Dependency Injection](./functional-dependency-injection/SKILL.md) skills.

## Rules

### ✅ DO
- Use server functions + `@repo/api-client` as the primary pattern (web app)
- Use auto-generated hooks from `@repo/api-client` as the primary pattern (extension)
- Fall back to factory functions only for domains NOT covered by `@repo/api-client`
- One factory = one operation (fallback only)
- Factories are pure — they do not make HTTP/DB calls, they compose them

### ❌ DON'T
- Don't use classes for services
- Don't define types in service files — types belong in `models/` or come from `@repo/api-client`
- Don't use factories in parallel with api-client for the same domain
- Don't import HTTP implementations inside factory functions — receive them via DI
