---
name: unit-testing
description: Write tests at two layers — server function tests with mocked api-client (preferred) or factory function tests with mocked dependencies
---

# Unit Testing

This project uses [Vitest](https://vitest.dev/) with `globals: true` for test runner configuration.

Testing strategy depends on whether `@repo/api-client` covers the domain:

1. **api-client domains (web)**: Test server functions by mocking the `api` client
2. **api-client domains (extension)**: Mock `@repo/api-client` module when testing code that uses `api.*` or hooks
3. **Factory fallback domains**: Test `{domain}.service.ts` by passing mock functions

---

## Pattern A: Testing Server Functions with api-client (Preferred)

When a server function uses `@repo/api-client`, mock the `api` module:

```typescript
// server-fns/guides.service.test.ts
import { describe, test, expect, vi } from "vitest";

// Mock the api-client module
vi.mock("@repo/api-client", () => ({
  api: {
    guides: {
      getAllGuides: vi.fn(),
      createGuide: vi.fn(),
    },
  },
}));

import { api } from "@repo/api-client";
import { getAllGuides, createGuide } from "./guides";

describe("GuideServerFunctions", () => {
  afterEach(() => { vi.clearAllMocks(); });

  describe("getAllGuides", () => {
    test("should return guides on success", async () => {
      const mockGuides = [{ id: "1", title: "Test Guide" }];
      vi.mocked(api.guides.getAllGuides).mockResolvedValue({
        data: { guides: mockGuides },
        status: 200,
      });

      const result = await getAllGuides();

      expect(result).toEqual(mockGuides);
      expect(api.guides.getAllGuides).toHaveBeenCalledTimes(1);
    });

    test("should throw on non-200 status", async () => {
      vi.mocked(api.guides.getAllGuides).mockResolvedValue({
        data: { guides: [] },
        status: 500,
      });

      await expect(getAllGuides()).rejects.toThrow("Failed to fetch guides");
    });
  });

  describe("createGuide", () => {
    test("should return created guide on success", async () => {
      const mockGuide = { id: "1", title: "New Guide" };
      vi.mocked(api.guides.createGuide).mockResolvedValue({
        data: { guide: mockGuide },
        status: 201,
      });

      const result = await createGuide({ data: { title: "New Guide" } });

      expect(result).toEqual(mockGuide);
      expect(api.guides.createGuide).toHaveBeenCalledWith({
        title: "New Guide",
        description: null,
      });
    });

    test("should return null on failure", async () => {
      vi.mocked(api.guides.createGuide).mockResolvedValue({
        data: null,
        status: 400,
      });

      const result = await createGuide({ data: { title: "" } });

      expect(result).toBeNull();
    });
  });
});
```

### ✅ DO — Test server functions by:
1. Using `vi.mock("@repo/api-client")` to mock the entire SDK
2. Providing mock return values for each `api.*` call
3. Testing both success and error paths (status codes, missing data)
4. Asserting the mock was called with correct arguments

---

## Pattern B: Testing Extension Code Using `@repo/api-client`

When testing extension code (background scripts, services, hooks) that imports from `@repo/api-client`, mock the module:

```typescript
// services/guides/guides.service.test.ts
import { describe, test, expect, vi } from "vitest";

vi.mock("@repo/api-client", () => ({
  api: {
    guides: {
      createGuide: vi.fn(),
      publishGuide: vi.fn(),
    },
  },
}));

import { api } from "@repo/api-client";

describe("GuideExtensionService", () => {
  afterEach(() => { vi.clearAllMocks(); });

  test("should call api.guides.createGuide with correct args", async () => {
    const mockGuide = { id: "1", title: "Test" };
    vi.mocked(api.guides.createGuide).mockResolvedValue({
      data: { guide: mockGuide },
      status: 201,
    });

    const response = await api.guides.createGuide({ title: "Test", description: null });

    expect(response.data?.guide).toEqual(mockGuide);
    expect(api.guides.createGuide).toHaveBeenCalledWith({
      title: "Test",
      description: null,
    });
  });
});
```

---

## Pattern C: Factory Function Tests (Fallback)

### Web App Factory Test

Test the factory by passing a mock function as the dependency (no URL parameter):

```typescript
// services/guides/guides.service.test.ts
import { describe, test, expect, vi } from "vitest";

import type { Guide } from "@repo/api-client";

import { createGuideFactory } from "./guides.service";

describe("GuideService", () => {
  afterEach(() => { vi.clearAllMocks(); });

  describe("createGuideFactory", () => {
    test("should call the dependency function with correct arguments", async () => {
      const mockInput = { title: "Test Guide", organizationId: "org-1" };
      const mockGuide: Guide = { id: "guide-1", title: "Test Guide", ... };
      const mockCreateGuide = vi.fn().mockResolvedValue(mockGuide);

      const handler = createGuideFactory(mockCreateGuide);
      const result = await handler(mockInput);

      expect(result).toEqual(mockGuide);
      expect(mockCreateGuide).toHaveBeenCalledTimes(1);
      expect(mockCreateGuide).toHaveBeenCalledWith(mockInput);
    });
  });
});
```

### ✅ DO — Test factory by:
1. Creating mock data and mock dependency function
2. Creating a `vi.fn().mockResolvedValue(mockData)` for the dependency
3. Calling the factory with mocks
4. Calling the returned handler
5. Asserting both the result AND the mock function call arguments

### ❌ DON'T — Test without asserting mock call args:
```typescript
test("createGuideFactory", async () => {
  const handler = createGuideFactory(vi.fn().mockResolvedValue("ok"));
  const result = await handler(data);
  expect(result).toBe("ok");
  // Where's the assertion that the mock was called with the right args?
});
```

---

## Test Structure Convention

```typescript
describe("DomainName", () => {
  afterEach(() => { vi.clearAllMocks(); });

  describe("functionName", () => {
    test("should ... when ...", async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## Test Coverage Expectations

| Layer | What to test | What to mock |
|-------|-------------|--------------|
| Server function (api-client, web) | Returns correct data, handles errors | Mock `api.*` with `vi.mock("@repo/api-client")` |
| Extension code (api-client) | Returns correct data, handles errors | Mock `api.*` with `vi.mock("@repo/api-client")` |
| Factory function (fallback) | Returns correct result | Pass `vi.fn()` as dependency |
| Factory function (fallback) | Passes correct args to dependency | Assert `toHaveBeenCalledWith` |

## Rules

### ✅ DO
- Use `vi.mock("@repo/api-client")` for testing any code that uses api-client
- Use `vi.fn()` for factory dependency injection (fallback only)
- Use `afterEach(() => vi.clearAllMocks())` or `beforeEach`
- Test both success and error paths
- Assert both return values AND mock function call arguments
- Co-locate test files with source files

### ❌ DON'T
- Don't create `http-{domain}.service.test.ts` files — the api-client SDK is tested by Orval
- Don't test the Drizzle implementation layer (that's integration/E2E territory)
- Don't put integration-level tests in unit test files
- Don't mock what you don't need to — factory tests don't need module mocking
- Don't forget `vi.clearAllMocks()` between tests
