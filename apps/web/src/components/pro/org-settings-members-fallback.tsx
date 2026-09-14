import { Lock, Users } from "lucide-react";

import { Separator } from "../ui/separator";
import { UpgradeToProButton } from "@/components/shared/upgrade-to-pro-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrgStore } from "@/stores";

type Props = {
  isUpgradeAvailable: boolean;
  onUpgrade?: () => Promise<void>;
};

export function OrgSettingsMembersFallback({ isUpgradeAvailable = false, onUpgrade }: Props) {
  const orgName = useOrgStore((state) => state.orgName);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage who has access to your organization
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Current Members</CardTitle>
              <CardDescription>1 member in your organization</CardDescription>
            </div>
            <span className="text-xs text-muted-foreground">1/1 seats</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase">
              Active Seat
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                  <Users size={14} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">You (Organization Owner)</p>
                  <p className="text-xs text-muted-foreground">{orgName}</p>
                </div>
              </div>
              <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                Owner
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock size={16} className="text-muted-foreground" />
            Unlock Team Collaboration
          </CardTitle>
          <CardDescription>
            Upgrade to Pro to invite team members, assign roles, and manage seats.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              Invite unlimited team members
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              Fine-grained role assignments (Admin, Editor, Viewer)
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              Centralized seat management & billing
            </li>
          </ul>
          <Separator />
          <UpgradeToProButton
            isUpgradeAvailable={isUpgradeAvailable}
            onUpgrade={onUpgrade}
            className="w-full"
          />
        </CardContent>
      </Card>
    </div>
  );
}
