---
name: zustand-state-management
description: Manage global application state using Zustand — each domain gets its own store file with typed state and actions, consumed via selector-based hooks
---

# Zustand State Management

> This skill covers Zustand.

This project uses **Zustand** for global state management. Stores are defined with `create()` from `zustand`, organized by domain, and consumed via auto-generated hooks with selector-based subscriptions.

No providers, no context wrappers, no boilerplate. Just stores.

## Folder Structure

```
stores/
├── session-store.ts        # Session + user state
├── product-store.ts        # Product state
├── subscription-store.ts   # Subscription state
└── index.ts                # Re-exports all stores
```

Each domain gets its own store file in `stores/`. Stores are **not** nested — each store is independent.

## Store Definition Pattern

```typescript
// stores/session-store.ts
import { create } from "zustand";

// 1. Define the state + actions interface
interface SessionState {
  // State
  session: Session | undefined | null;
  user: User | undefined | null;
  isFetchingUser: boolean | null;

  // Actions
  setSession: (session: Session | undefined | null) => void;
  setUser: (user: User | undefined | null) => void;
  setIsFetchingUser: (fetching: boolean | null) => void;
  clear: () => void;
}

// 2. Create the store with create()
export const useSessionStore = create<SessionState>((set) => ({
  // Initial state — use undefined for loading, null for absent
  session: undefined,
  user: undefined,
  isFetchingUser: null,

  // Actions — set() does shallow merge
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setIsFetchingUser: (isFetchingUser) => set({ isFetchingUser }),
  clear: () => set({
    session: undefined,
    user: undefined,
    isFetchingUser: null
  }),
}));
```

### ✅ DO — Name the hook `use{Domain}Store`:
```typescript
export const useSessionStore = create<SessionState>(/* ... */);
```

### ❌ DON'T — Default export stores:
```typescript
// ❌ DON'T
export default create<SessionState>()(/* ... */);
```

## Initial State Convention

| Value | Meaning |
|-------|---------|
| `undefined` | Uninitialized / still loading |
| `null` | Absent / empty / not available |
| `default value` | Known initial state |

```typescript
// ✅ DO
session: undefined,           // Haven't checked auth yet
user: null,                   // Checked auth, no user found
selectedCategory: "electronics", // Known default
```

## Reading State — Selector Pattern

Always use selectors to prevent unnecessary re-renders:

```typescript
// ✅ DO — Selector (only re-renders when selected value changes)
function UserProfile() {
  const user = useSessionStore((state) => state.user);
  return <div>{user?.fullName}</div>;
}

// ✅ DO — Multiple selectors
function ProfileActions() {
  const user = useSessionStore((state) => state.user);
  const setUser = useSessionStore((state) => state.setUser);
  // ...
}
```

### ❌ DON'T — Destructure the entire store:
```typescript
// ❌ DON'T — Causes re-render on ANY state change
function BadComponent() {
  const { user, setUser, isFetchingUser } = useSessionStore();
  // ...
}
```

## Writing State — Action Pattern

Actions are defined in the store and update state via `set()`:

```typescript
// ✅ DO — Actions in the store
export const useSessionStore = create<SessionState>((set) => ({
  session: undefined,
  setSession: (session) => set({ session }),
}));

// Used as:
const setSession = useSessionStore((state) => state.setSession);
setSession({ id: "abc", email: "test@test.com" });
```

### ✅ DO — `set()` does shallow merge — only pass changed properties:
```typescript
set({ session: newSession });       // Other state properties are preserved
set({ user: null });                // Only updates user
```

## Async Actions in Stores

For async flows that update multiple state fields, define the action in the store:

```typescript
// stores/subscription-store.ts
import { create } from "zustand";
import { api } from "@repo/api-client"; // or use service imports for local domains

interface SubscriptionState {
  currentSubscription: Subscription | null;
  isFreeTrialUsed: boolean | undefined;
  loading: boolean;
  setCurrentSubscription: (sub: Subscription | null) => void;
  setIsFreeTrialUsed: (used: boolean | undefined) => void;
  hydrate: (id: string) => Promise<void>;  // Async action
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  currentSubscription: null,
  isFreeTrialUsed: undefined,
  loading: false,

  setCurrentSubscription: (currentSubscription) => set({ currentSubscription }),
  setIsFreeTrialUsed: (isFreeTrialUsed) => set({ isFreeTrialUsed }),

  hydrate: async (id: string) => {
    set({ loading: true });
    try {
      const response = await api.subscriptions.getSubscription(id);
      set({ currentSubscription: response.data.subscription, loading: false });
    } catch {
      set({ currentSubscription: null, loading: false });
    }
  },
}));
```

### ✅ DO — Async actions can call `@repo/api-client` or services directly
### ❌ DON'T — Put async logic in components — extract to store actions or custom hooks

## Store Composition Through Hooks

Complex multi-store operations go in custom hooks, not stores:

```typescript
// hooks/useUpdateStoreState.ts
import { api } from "@repo/api-client"; // or import server-fns for web app
import { useSessionStore } from "[project-root]/stores/session-store";
import { useSubscriptionStore } from "[project-root]/stores/subscription-store";

const useUpdateStoreState = () => {
  const session = useSessionStore((state) => state.session);
  const setCurrentSubscription = useSubscriptionStore((state) => state.setCurrentSubscription);

  const updateCurrentSubscription = async () => {
    if (session) {
      const response = await api.subscriptions.getSubscription(session.id);
      setCurrentSubscription(response.data.subscription);
    } else {
      setCurrentSubscription(null);
    }
  };

  return { updateCurrentSubscription };
};

export default useUpdateStoreState;
```

### ✅ DO — Compose stores with `@repo/api-client` or server functions in custom hooks
### ❌ DON'T — Call service factories inside store definitions

## Accessing Store Outside React

Use `.getState()` and `.setState()` for imperative access:

```typescript
// ✅ DO — Read outside React
const state = useSessionStore.getState();
console.log(state.user);

// ✅ DO — Write outside React  
useSessionStore.setState({ user: null });

// Example: hydrate on app boot
async function bootstrapApp() {
  const user = await getCurrentUser();
  useSessionStore.getState().setUser(user);
}
```

## Rules

### ✅ DO
- Create one store per domain in `stores/{domain}-store.ts`
- Use `undefined` for uninitialized, `null` for absent
- Use selectors (`state => state.field`) when reading in components
- Define actions inside the store via `set()`
- Compose multiple stores through custom hooks
- Use `.getState()` for imperative access outside React

### ❌ DON'T
- Don't use providers or context wrappers — Zustand doesn't need them
- Don't destructure the entire store in components
- Don't put service factory logic inside store definitions
- Don't default-export stores (named exports only)
- Don't nest stores or create store hierarchies
