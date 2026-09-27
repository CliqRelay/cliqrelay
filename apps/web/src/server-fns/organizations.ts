import { createServerFn } from "@tanstack/react-start";

import { api } from "@repo/api-client";

import { authMiddleware } from "@/middleware/auth.middleware";
import type { AppOrganizationMemberResponse } from "@/models";

/**
 * Resolves the signed-in user's membership row in an organization.
 * Returns null when they are not a member (the API answers 404).
 */
export const getMyOrgMembership = createServerFn({ method: "GET" })
  .validator((orgId: string) => orgId)
  .middleware([authMiddleware])
  .handler(async ({ data: orgId, context }) => {
    try {
      const member = await api.organizations.getMyOrgMembership(orgId, {
        headers: {
          Cookie: context?.headers?.get("Cookie") ?? "",
        },
      });

      return member as unknown as AppOrganizationMemberResponse;
    } catch {
      return null;
    }
  });
