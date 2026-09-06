import { Lock } from "lucide-react";

import { Separator } from "../ui/separator";
import { LearnAboutProButton } from "@/components/shared/learn-about-pro-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  isUpgradeAvailable: boolean;
  onUpgrade?: () => Promise<void>;
};

export function OrgSettingsTeamsFallback({ isUpgradeAvailable = false, onUpgrade }: Props) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage teams across your organization
          </p>
        </div>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock size={16} className="text-muted-foreground" />
            Unlock Team Management
          </CardTitle>
          <CardDescription>
            Upgrade to Pro to create teams, manage members, and organize your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              Create multiple teams for different departments
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              Assign members to specific teams
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              Keep guides and workflows scoped to the right team
            </li>
          </ul>
          <Separator />
          {isUpgradeAvailable ? (
            <Button className="w-full" onClick={() => onUpgrade?.()}>
              Upgrade to Pro
            </Button>
          ) : (
            <LearnAboutProButton />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
