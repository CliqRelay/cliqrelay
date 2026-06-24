---
name: react-components
description: Use when writing, refactoring, or reviewing React components inside a TanStack Start application. Focuses on SOLID component design, composition, and correct use of loaders, server functions, and React Query for client-side state.
---

# React Components

## When to use this skill

Use this skill ONLY when:

* Writing React components inside an app
* Refactoring React UI code
* Reviewing React components
* Building UI features using TanStack Start

Do NOT use for:

* Backend architecture design
* API design
* Build tooling or infra
* Non-UI server logic

---

# Core Rules

1. Components must follow SOLID principles
2. Components must stay small and focused
3. Data fetching must follow TanStack Start patterns (loaders + server functions) for the web app, or `@repo/api-client` auto-generated hooks for the extension app
4. Never use `useEffect` for data fetching
5. Business logic must be extracted into hooks
6. Composition is preferred over configuration
7. Components must be easy to read and test
8. Always use Shadcn UI primitives for UI consistency and accessibility

---

# Data Fetching Architecture (IMPORTANT)

TanStack Start uses a hybrid data model, combined with `@repo/api-client`:

## 1. Route Loaders (Server-first, initial data)

Use loaders for:

* Initial page data
* SEO-critical content
* Data required before render
* Avoiding loading states on first paint

Route loaders call either **server functions** (preferred) or **`@repo/api-client` directly**:

```typescript
// routes/guides/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { getAllGuides } from "@/server-fns/guides";
// OR: import { api } from "@repo/api-client";

export const Route = createFileRoute("/guides/")({
  loader: async () => {
    // ✅ DO — Call server function (preferred)
    const guides = await getAllGuides();
    // OR call api-client directly for simple cases:
    // const guides = await api.guides.getAllGuides();
    return { guides };
  },
  component: GuidesPage,
});
```

### Consuming loader data

```typescript
function GuidesPage() {
  const { guides } = Route.useLoaderData();

  return (
    <div>
      {guides.map(guide => (
        <GuideCard key={guide.id} guide={guide} />
      ))}
    </div>
  );
}
```

---

## 2. Server Functions (TanStack Start `createServerFn`)

Server functions wrap `@repo/api-client` calls and are the primary data access pattern:

```typescript
// server-fns/guides.ts
import { createServerFn } from "@tanstack/react-start";
import { api } from "@repo/api-client";

export const getAllGuides = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, status } = await api.guides.getAllGuides();
    if (status !== 200) {
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
      return null;
    }
    return response.data.guide;
  });
```

Server functions:
- Run on the server (not exposed to the client bundle)
- Accept typed inputs via `.inputValidator()`
- Return typed data (types come from `@repo/api-client`)
- Are called from route loaders or from client components

---

## 3. Client-side Mutations (Web App)

For mutations triggered by user actions, call server functions directly in event handlers:

```typescript
function CreateGuideForm() {
  const navigate = Route.useNavigate();

  const handleSubmit = async (data: { title: string; description?: string }) => {
    try {
      const guide = await createGuide({ data });
      if (guide) {
        navigate({ to: `/guides/${guide.id}` });
        showToastSuccess("Guide created");
      }
    } catch (error: any) {
      showToastError("Error", error.message ?? "Failed to create guide");
    }
  };

  return <Form onSubmit={handleSubmit} />;
}
```

For TanStack Query-based mutations (with cache invalidation), use `useMutation`:

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createGuide } from "@/server-fns/guides";

function useCreateGuideMutation() {
  const queryClient = useQueryClient();
  const navigate = Route.useNavigate();

  return useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      createGuide({ data }),
    onSuccess: (guide) => {
      queryClient.invalidateQueries({ queryKey: ["guides"] });
      navigate({ to: `/guides/${guide.id}` });
    },
  });
}
```

---

## 4. Extension App: `@repo/api-client` Directly

The extension app uses `@repo/api-client` directly. Use `api.*` for programmatic calls (background scripts, services) and auto-generated hooks for React components:

```typescript
// ✅ DO — Programmatic calls (background scripts, etc.)
import { api } from "@repo/api-client";

async function archiveGuide(guideId: string) {
  const response = await api.guides.archiveGuide(guideId);
  if (response.status !== 200 || !response.data?.guide) {
    return null;
  }
  return response.data.guide;
}

// ✅ DO — Auto-generated hooks for React components
import { useGetAllGuides, useCreateGuide } from "@repo/api-client";

function GuideList() {
  const { data, isLoading, error } = useGetAllGuides();
  const createMutation = useCreateGuide({
    mutation: {
      onSuccess: () => {
        showToastSuccess("Guide created");
      },
    },
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <div>
      {data?.guides?.map(guide => (
        <GuideCard key={guide.id} guide={guide} />
      ))}
      <button onClick={() => createMutation.mutate({ data: { title: "New" } })}>
        Create Guide
      </button>
    </div>
  );
}
```

---

# Data Flow Diagram

```
Web App (TanStack Start):
  Route Loader → Server Function (createServerFn) → api-client (api.guides.*) → API Server
  Component UI → Route.useLoaderData()              ← typed data

Extension App (WXT / SPA):
  Background/Script → api.* from @repo/api-client → API Server
  Component → use*() Hook from @repo/api-client   → API Server
```

---

# Generic Component

Use a simple, flat structure for generic components:

```typescript
// Generic Component
type Props = {
  title: string;
  description: string;
  disabled?: boolean;
  onClick: () => void;
};

function ActionButton({ title, description, disabled, onClick }: Props) {
  return (
    <button disabled={disabled} onClick={onClick}>
      <span>{title}</span>
      <p>{description}</p>
    </button>
  );
}
```

---

# Generic Hook

Always co-locate hooks with the feature they serve:

```typescript
// hooks/use-guide-mutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@repo/api-client";

export function usePublishGuide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (guideId: string) => api.guides.publishGuide(guideId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guides"] });
      showToastSuccess("Guide published");
    },
    onError: (error: any) => {
      showToastError("Error", error.message);
    },
  });
}
```

---

# Using TanStack Start Forms

Forms use TanStack Form with Zod:

```typescript
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

function CreateGuideForm() {
  const form = useForm({
    validators: { onChange: formSchema },
    defaultValues: { title: "", description: "" },
    onSubmit: async ({ value }) => {
      try {
        await createGuide({ data: value });
        form.reset();
      } catch (error: any) {
        showToastError("Error", error.message);
      }
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
      {/* fields */}
    </form>
  );
}
```

---

# Rules Summary

### ✅ DO
- Use route loaders for initial data (web app)
- Use `createServerFn` to wrap `@repo/api-client` calls (web app)
- Use `@repo/api-client` directly (`api.*` and hooks) for the extension app
- Import types from `@repo/api-client`
- Use `try/catch` with toast for error handling
- Use TanStack Form with Zod for form validation
- Use Shadcn UI primitives
- Co-locate hooks with features

### ❌ DON'T
- Don't use `useEffect` for data fetching
- Don't import from `@repo/api-client` directly in web app client components — use server functions
- Don't create manual `http-{domain}.service.ts` files for endpoints covered by api-client
- Don't bypass route loaders for initial data
- Don't manually type what `z.infer` or `@repo/api-client` types already provide
- Don't put API calls directly in components
