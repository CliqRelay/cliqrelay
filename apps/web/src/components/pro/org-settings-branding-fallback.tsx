import { Lock } from "lucide-react";

import { LearnAboutProButton } from "@/components/shared/learn-about-pro-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Separator } from "../ui/separator";

type Props = {
  isUpgradeAvailable: boolean;
  onUpgrade?: () => Promise<void>;
};

export function OrgSettingsBrandingFallback({ isUpgradeAvailable = false, onUpgrade }: Props) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Branding</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customize your organization's visual identity
          </p>
        </div>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock size={16} className="text-muted-foreground" />
            Custom Branding
          </CardTitle>
          <CardDescription>Customize your organization's logo and colors.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              <span>Upload your organization logo and favicon</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              Custom primary and accent colors
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              Remove CliqRelay watermark
            </li>
          </ul>
          <Separator />
          {isUpgradeAvailable ? (
            <Button className="w-full" onClick={() => onUpgrade?.()}>
              Upgrade Now
            </Button>
          ) : (
            <LearnAboutProButton />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
