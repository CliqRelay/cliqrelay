import type { ReactNode } from "react";

import { useOrgStore } from "@/stores";

type Props = {
  skeleton: ReactNode;
  children: ReactNode;
};

export function OrgSettingsPage({ skeleton, children }: Props) {
  const orgId = useOrgStore((state) => state.orgId);

  if (!orgId) {
    return skeleton;
  }

  return children;
}
