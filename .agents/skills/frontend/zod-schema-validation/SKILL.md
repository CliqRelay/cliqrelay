---
name: zod-schema-validation
description: Use Zod schemas for runtime validation of form data — API response validation is handled by @repo/api-client which provides auto-generated Zod schemas
---

# Zod Schema Validation

This project uses Zod for runtime validation at two levels:

1. **Form/Input validation** — user-facing forms with cross-field validation (manual Zod schemas)
2. **API response validation** — handled automatically by `@repo/api-client` (auto-generated Zod schemas)

The `getValidationResult` utility and shared entity schemas (`guideSchema`, `stepSchema`, etc.) live in `packages/data-commons` and are imported as `@repo/data-commons`.

---

## Key Change: API Response Validation

With `@repo/api-client`, **API response validation is handled automatically** by the auto-generated SDK. The SDK includes Zod schemas that validate every response from the backend. No manual validation needed.

```typescript
// ✅ DO — Use api-client directly; response validation is automatic
import { api } from "@repo/api-client";

const response = await api.guides.getAllGuides();
// response.data is already validated and typed
```

For domains **not covered by `@repo/api-client`**, use the manual validation patterns described below.

---

## Folder Structure

```
packages/data-commons/src/models/
├── index.ts                     ← Re-exports all shared schemas
├── guides.ts                    ← Canonical schema + inferred type
├── steps.ts                     ← Canonical schema + inferred type
└── ...

apps/web/src/models/
├── guides.ts                    ← Web-specific schemas + types (non-api-client domains)
├── steps.ts
└── index.ts

apps/extension/src/models/
├── guides.ts                    ← Extension HTTP response schemas (non-api-client domains)
├── steps.ts
└── index.ts
```

Shared Zod schemas belong in `packages/data-commons/src/models/`, using the `getValidationResult` utility from `packages/data-commons/src/helpers/`.

---

## Pattern 1: Shared Canonical Schemas

Entity schemas are defined in `packages/data-commons` and represent the single source of truth:

```typescript
// packages/data-commons/src/models/guides.ts
import { z } from "zod";

export const guideSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(255),
  status: z.enum(["draft", "published", "archived"]),
  // ...
});
export type Guide = z.infer<typeof guideSchema>;
```

---

## Pattern 2: Form Schemas (Per-App)

Form schemas live in the respective app's `models/{domain}.ts`:

```typescript
// apps/web/src/models/steps.ts
import { z } from "zod";
import { stepActionSchema } from "@repo/data-commons";

const createStepInputSchema = z.object({
  guideId: z.string().uuid("guideId must be a valid UUID"),
  action: stepActionSchema,
  url: z.string().min(1, "url is required"),
});
export type CreateStepInput = z.infer<typeof createStepInputSchema>;
```

---

## Pattern 3: HTTP Response Schemas (Extension Fallback — Non-api-client Domains)

For endpoints **not covered by `@repo/api-client`**, define response body schemas:

```typescript
// apps/extension/src/models/guides.ts
import { z } from "zod";
import { getValidationResult, guideSchema } from "@repo/data-commons";

export const httpCreateGuideResponseBodySchema = z.object({
  data: guideSchema,
});
export type HttpCreateGuideResponseBody = z.infer<typeof httpCreateGuideResponseBodySchema>;

export const validateHttpCreateGuide = (data: unknown) =>
  getValidationResult(data, httpCreateGuideResponseBodySchema);
```

These validators are used in the HTTP implementation layer (not factories):

```typescript
// services/guides/http-guides.service.ts
import { validateHttpCreateGuide, type HttpCreateGuide } from "@/models";

export const httpCreateGuide: HttpCreateGuide = async (url, body) => {
  const response = await fetch(url, { ... });
  const data = await response.json();
  const validationResult = validateHttpCreateGuide(data);
  if (!validationResult.success) {
    throw new Error(validationResult.error);
  }
  return validationResult.value;
};
```

---

## Pattern 4: Cross-Field Validation with superRefine

Use `superRefine` for validations involving multiple fields:

```typescript
// packages/data-commons/src/models/steps.ts
export const stepSchema = z.object({
  id: z.uuid(),
  action: stepActionSchema.nullable().optional(),
  url: z.string().url().or(z.literal("")).nullable().optional(),
  // ...
}).superRefine((arg, ctx) => {
  if (hasScreenshot && !hasAction) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["action"],
      message: "Capture steps require an action.",
    });
  }
});
```

---

## Common Utilities

The shared `getValidationResult` utility wraps Zod's `safeParse`:

```typescript
// packages/data-commons/src/helpers/generics.ts
import { z } from "zod";

type ValidationResult<T> =
  | { success: true; value: T }
  | { success: false; error: string };

export function getValidationResult<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, value: result.data };
  }
  return { success: false, error: result.error.errors.map(e => e.message).join(", ") };
}
```

---

## When to Use What

| Scenario | Validation Source |
|----------|------------------|
| API response (api-client domain) | Auto-generated by `@repo/api-client` |
| API response (non-api-client domain) | Manual Zod schema in `models/{domain}.ts` |
| Form input | Manual Zod schema in component or `models/{domain}.ts` |
| Shared entity | `@repo/data-commons` |

## Rules

### ✅ DO
- Let `@repo/api-client` handle API response validation for covered domains
- Define shared entity schemas in `packages/data-commons/src/models/`
- Define form/input schemas in the app's `models/{domain}.ts`
- Use `z.infer` to derive TypeScript types from schemas
- Use `superRefine` for cross-field validation
- Import `getValidationResult` from `@repo/data-commons`

### ❌ DON'T
- Don't manually validate API responses that are already handled by `@repo/api-client`
- Don't put schemas in component files — they go in `models/`
- Don't manually type what `z.infer` can derive
- Don't catch validation errors silently — let them propagate
- Don't duplicate schemas across apps — share them via `@repo/data-commons`
