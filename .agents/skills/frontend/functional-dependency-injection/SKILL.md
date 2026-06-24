---
name: functional-dependency-injection
description: Apply functional dependency injection where dependencies are passed as function parameters instead of constructor injection — enables trivial testability and loose coupling
---

# Functional Dependency Injection

This project uses **pure functional dependency injection** instead of class-based constructor injection. However, when using `@repo/api-client`, dependencies are imported directly — no injection is needed because the SDK is the single source of truth for API calls.

No classes, no `this`, no decorators, no DI containers. Just functions calling functions.

---

## When to Use Each Pattern

| Scenario | Pattern | Dependency Source |
|----------|---------|-------------------|
| Web app, api-client covers the domain | Direct import of `api` from `@repo/api-client` | No injection needed |
| Extension app, api-client covers the domain | Direct import of `api` or hooks from `@repo/api-client` | No injection needed |
| Neither app has api-client coverage | Functional DI with factory functions | Injected as function parameters |

---

## Pattern A: Direct Import (api-client — Preferred)

When `@repo/api-client` covers a domain, just import and use it directly:

```typescript
// ✅ DO — Web: Import api directly in server functions
import { createServerFn } from "@tanstack/react-start";
import { api } from "@repo/api-client";

export const getGuideById = createServerFn({ method: "GET" })
  .inputValidator((guideId: string) => guideId)
  .handler(async ({ data: guideId }) => {
    const response = await api.guides.getGuideById(guideId);
    if (response.status !== 200 || !response.data?.guide) {
      return null;
    }
    return response.data.guide;
  });
```

```typescript
// ✅ DO — Extension: Import api or hooks directly from api-client
import { api } from "@repo/api-client";
import { useGetAllGuides, useCreateGuide } from "@repo/api-client";

// Programmatic usage (background scripts, services)
async function handleDelete(guideId: string) {
  const response = await api.guides.deleteGuide(guideId);
  return response.data?.guide ?? null;
}

// React components with hooks
function GuideList() {
  const { data } = useGetAllGuides();
  const mutation = useCreateGuide();
  // ...
}
```

No factory functions, no URL injection, no HTTP function injection — the SDK handles everything.

---

## Pattern B: Functional DI (Fallback — Non-api-client Domains)

Every dependency (database implementation, HTTP function, platform SDK) is passed as a parameter to a factory function.

```typescript
// ❌ DON'T — Class-based DI
class GuideService {
  constructor(private createGuide: CreateGuide) {}
  async create(input: GuideCreateInput) { return this.createGuide(input); }
}

// ✅ DO — Functional DI
export const createGuideFactory = (createGuide: CreateGuide) => {
  return async (input: GuideCreateInput) => createGuide(input);
};
```

### Two DI Patterns (Fallback)

#### Pattern B1: Function-only DI (Web App)

Factories take a single function-type dependency. No URL parameter.

```typescript
// ✅ DO — Web: inject the DB operation function
export const getGuideByIdFactory = (getGuideById: GetGuideById) => {
  return async (guideId: string) => {
    return getGuideById(guideId);
  };
};
```

#### Pattern B2: URL + HTTP Function DI (Extension App)

Factories take a URL string and an HTTP function as dependencies.

```typescript
// ✅ DO — Extension: inject URL + HTTP function
export const getGuideFactory = (
  url: string,
  httpGet: HttpGetGuide,
) => {
  return async (id: string) => {
    return httpGet(url, { id });
  };
};
```

## Dependency Categories (Fallback Only)

### Category 1: Database/Service Operation Functions (Web)

The operation implementation (typically a Drizzle function) is passed as a typed function:

```typescript
// ✅ DO — Web: inject DB operation
export const createGuideFactory = (createGuide: CreateGuide) => {
  return async (input: GuideCreateInput): Promise<Guide> => createGuide(input);
};
```

### Category 2: HTTP Functions (Extension)

The HTTP implementation is passed as a typed function:

```typescript
// ✅ DO — Extension: inject HTTP function
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

### Category 3: Platform/Third-Party SDK Functions

Pass SDK methods as function parameters:

```typescript
// ✅ DO — Inject platform function (no URL)
export const signInWithProviderFactory = (signIn: SignInFn) => {
  return async (): Promise<Session> => {
    return await signIn();
  };
};
```

## Where Injection Happens (Fallback Only)

### Web App: In the composition layer (`{domain}.composition.ts`)

```typescript
// services/guides/guides.composition.ts — THE injection site
export const guideService = {
  createGuide: createGuideFactory(
    (input) => drizzleCreateGuide(db, input),
  ),
};
```

### Extension App: In the domain's `index.ts`

```typescript
// services/guides/index.ts — THE injection site
export const createGuide = createGuideFactory(
  `${env.apiUrl}/api/guides`,
  httpCreateGuide,
);
```

### ❌ DON'T — Inject in component files:
```typescript
function GuidePage() {
  // NEVER do this — injection happens in the composition layer, not components
  const handler = createGuideFactory((input) => drizzleCreateGuide(db, input));
}
```

## Why This Pattern (Fallback)?

| Concern | Class DI | Functional DI |
|---------|----------|---------------|
| Testability | Need mock class/framework | Just pass your test framework's mock function |
| Boilerplate | Constructor, `this`, types | Just function params |
| Bundle size | More bytes | Minimal |
| Tree-shaking | Harder | Natural — functions are trees |
| Cognitive load | OOP concepts needed | Just functions |

## Testing Benefit (Fallback)

Because dependencies are function parameters, testing is trivially simple:

```typescript
// ✅ DO — Web: Test by passing mock function directly
test("createGuideFactory", async () => {
  const mockFn = vi.fn().mockResolvedValue(mockGuide);
  const handler = createGuideFactory(mockFn);
  const result = await handler(input);
  expect(mockFn).toHaveBeenCalledWith(input);
  expect(result).toEqual(mockGuide);
});
```

```typescript
// ✅ DO — Extension: Test by passing mock URL + mock HTTP function
test("createGuideFactory", async () => {
  const mockUrl = "test-url";
  const mockFn = vi.fn().mockResolvedValue({ data: mockGuide });
  const handler = createGuideFactory(mockUrl, mockFn);
  const result = await handler(input);
  expect(mockFn).toHaveBeenCalledWith(mockUrl, input);
  expect(result).toEqual(mockGuide);
});
```

## Rules

### ✅ DO
- Use `@repo/api-client` with direct imports as the primary DI pattern
- For non-api-client domains: inject DB operation functions as single parameter (web)
- For non-api-client domains: inject HTTP functions + URL as parameters (extension)
- Use the composition layer or domain index as the single injection site
- Keep factory functions pure (no side effects)

### ❌ DON'T
- Don't mix api-client and factory DI for the same domain
- Don't import implementations inside service factories
- Don't hardcode URLs or DB connections in factories
- Don't use classes or `new` for services
- Don't create DI containers or service locators
- Don't use global singletons as implicit dependencies
