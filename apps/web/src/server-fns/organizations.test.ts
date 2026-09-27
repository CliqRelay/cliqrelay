import { afterEach, describe, expect, test, vi } from "vitest";

import { api } from "@repo/api-client";

import { getMyOrgMembership } from "./organizations";

vi.mock("@repo/api-client", () => ({
  api: {
    organizations: {
      getMyOrgMembership: vi.fn(),
    },
  },
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let handler: ((opts: any) => any) | undefined;
    const chain: any = {
      validator: () => chain,
      middleware: () => chain,
      handler: (fn: (opts: any) => any) => {
        handler = fn;
        return (opts: any) =>
          handler!({
            ...opts,
            context: { headers: new Headers({ Cookie: "session=abc" }) },
          });
      },
    };
    return chain;
  },
}));

vi.mock("@/middleware/auth.middleware", () => ({
  authMiddleware: {},
}));

const member = {
  id: "member-1",
  organizationId: "org-1",
  role: "editor",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  user: { id: "user-1", name: "Bob", email: "bob@example.com" },
};

describe("OrganizationServerFunctions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getMyOrgMembership", () => {
    test("should return the caller's membership, forwarding the session cookie", async () => {
      // Arrange
      vi.mocked(api.organizations.getMyOrgMembership).mockResolvedValue(member as never);

      // Act
      const result = await getMyOrgMembership({ data: "org-1" });

      // Assert
      expect(result).toEqual(member);
      expect(api.organizations.getMyOrgMembership).toHaveBeenCalledWith("org-1", {
        headers: { Cookie: "session=abc" },
      });
    });

    test("should return null when the membership lookup fails", async () => {
      // Arrange
      vi.mocked(api.organizations.getMyOrgMembership).mockRejectedValue(
        new Error("organization membership not found"),
      );

      // Act
      const result = await getMyOrgMembership({ data: "org-1" });

      // Assert
      expect(result).toBeNull();
      expect(api.organizations.getMyOrgMembership).toHaveBeenCalledWith("org-1", {
        headers: { Cookie: "session=abc" },
      });
    });
  });
});
