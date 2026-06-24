---
name: http-client-abstraction
description: Use @repo/api-client SDK hooks (preferred) or raw fetch directly in domain-specific HTTP implementations (extension app only) — no generic HTTP wrapper layer needed
---

# HTTP Client Abstraction

The HTTP client pattern applies **only in the extension app** (client-side). The web app uses `@repo/api-client` via server functions (server-side fetch).

## Primary Pattern: Use `@repo/api-client` SDK Directly

The `@repo/api-client` SDK uses `fetch` under the hood, so no manual HTTP implementations are needed. Use `api.*` for programmatic calls (background scripts, services) and auto-generated hooks for React components:

```typescript
// ✅ DO — Use api.* for programmatic HTTP calls
import { api } from "@repo/api-client";

async function deleteGuide(guideId: string) {
  const response = await api.guides.deleteGuide(guideId);
  if (response.status !== 200) {
    console.error("Failed to delete guide:", response.data);
    return null;
  }
  return response.data.guide;
}

// ✅ DO — Use auto-generated hooks in React components
import { useGetAllGuides, useCreateGuide } from "@repo/api-client";

function GuideManager() {
  const { data, isLoading } = useGetAllGuides();
  const createMutation = useCreateGuide({
    mutation: {
      onSuccess: () => { /* handle success */ },
    },
  });
  // ...
}
```

### ✅ DO — Use api-client as the default (both `api.*` and hooks)
### ❌ DON'T — Write manual `http-{domain}.service.ts` files for endpoints covered by api-client

## Fallback Pattern: Direct `fetch` (Non-api-client Domains)

For endpoints **not covered by `@repo/api-client`**, use raw `fetch` directly. No generic HTTP wrapper layer needed.

```typescript
// Non-api-client endpoint (fallback only)
async function callExternalApi(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  // Validate with Zod if needed
  return data;
}
```

## URL Construction Conventions (Fallback)

```typescript
// ✅ DO — Append params as URL segments
`${baseUrl}/${resourceId}/screenshot`

// ✅ DO — Append query strings
`${baseUrl}?cursor=${cursor}`
```

## Rules

### ✅ DO
- Use `@repo/api-client` (both `api.*` and hooks) as the default HTTP client pattern in the extension
- For non-api-client domains: use `fetch` directly
- Import types from `@repo/api-client` or from `@/models` for fallback domains

### ❌ DON'T
- Don't write `http-{domain}.service.ts` files — use `@repo/api-client` directly
- Don't create factory functions for HTTP calls — the SDK handles everything
- Don't create generic HTTP wrapper layers — keep it simple with direct `fetch` calls for fallback domains
