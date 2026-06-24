---
name: error-handling
description: Handle errors across the three tiers — HTTP/Drizzle layer rejection, service factory validation failure, and component-level try/catch with toast notifications
---

# Error Handling

This project follows a **three-tier error handling pattern**, with an additional tier for `@repo/api-client` usage:

1. **Implementation layer** — rejects on errors (non-ok HTTP response or DB failure)
2. **Service layer** — throws on Zod validation failure
3. **Component layer** — catches errors and displays via toast

No custom error classes. No centralized error reporting. Errors propagate up from Implementation → Service → Component.

---

## Tier 0: api-client + Server Function Response Handling

When using `@repo/api-client` via server functions (web app), responses are checked after the SDK call:

```typescript
// server-fns/guides.ts
import { createServerFn } from "@tanstack/react-start";

import { api } from "@repo/api-client";

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
- Check `response.status` against the expected success code
- Check `response.data` for the expected shape
- Log the error and return a safe value (`null`) or throw
- The auto-generated SDK handles transport-level errors (network, 5xx)

---

## Tier 1: Implementation Layer Rejection

### Extension (HTTP) — For non-api-client domains

All HTTP implementations use the same error pattern:

```typescript
if (!response.ok) {
  throw new Error(`Failed: ${response.status} ${response.statusText}`);
}
```

**Rules:**
- Always include the HTTP status in the error message
- Throw synchronously with `throw new Error(...)`
- Parse the JSON error body from the API response if available

### Web (Drizzle) — For non-api-client domains

Drizzle operations throw on DB failure naturally. They are wrapped by the composition layer:

```typescript
// Errors from Drizzle propagate up unmodified
const guide = await drizzleCreateGuide(db, input);
```

---

## Tier 2: Service Factory Validation Failure

### Extension (HTTP implementation validation) — For non-api-client domains

Service HTTP implementations use `getValidationResult` from `@repo/data-commons` to validate response bodies:

```typescript
import { getValidationResult } from "@repo/data-commons";
// or import the domain-specific validator from models:
import { validateHttpCreateGuide } from "@/models";

const data = await response.json();
const validationResult = validateHttpCreateGuide(data);
if (!validationResult.success) {
  throw new Error(validationResult.error);
}
```

**Rules:**
- Import `getValidationResult` from `@repo/data-commons` or use domain-specific validators from `models/`
- Always check `validationResult.success === false` for type narrowing
- Throw `new Error(validationResult.error)` — the error string comes from `ValidationResult.error`

---

## Tier 3: Component-Level Catch and Toast

Every async operation in components/pages follows the same pattern:

```typescript
try {
  await someOperation();
} catch (error: any) {
  showToastError("Error", error.message ?? "An error occurred");
}
```

The toast service exposes three methods:

```typescript
showToastSuccess(title, message)  // green
showToastInfo(title, message)     // blue
showToastError(title, message)    // red
```

**Rules:**
- Always use `catch (error: any)` — caught errors are `unknown` by default
- Always provide a fallback message: `error.message ?? "An error occurred"`
- Use the error message from the service layer — it contains the Zod validation error or the implementation error message

---

## Try/Catch with Finally

When cleanup is needed after an operation (regardless of success/failure), use `finally`:

```typescript
try {
  await operation();
} catch (error: any) {
  showToastError("Error", error.message);
} finally {
  setLoading(false);
}
```

---

## Rules Summary

### ✅ DO
- Check status + data shape when using `@repo/api-client` in server functions
- Throw `new Error(...)` on HTTP/Drizzle errors
- Use `getValidationResult` from `@repo/data-commons` for Zod validation in HTTP implementations
- Wrap every async component operation in `try { ... } catch (error: any) { showToastError(...) }`
- Use `finally` when cleanup is needed regardless of outcome

### ❌ DON'T
- Don't define custom error classes — use `new Error(message)` consistently
- Don't catch errors silently — always show feedback via toast
- Don't log errors to console in production paths
- Don't use `catch (error)` without the `: any` type annotation
