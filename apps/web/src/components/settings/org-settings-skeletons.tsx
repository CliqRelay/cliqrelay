import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function OrgSettingsPageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

function OrgSettingsUpgradeCardSkeleton() {
  return (
    <Card className="border-dashed">
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-4 w-80" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

export function OrgSettingsMembersSkeleton() {
  return (
    <div className="space-y-8">
      <OrgSettingsPageHeaderSkeleton />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/30 p-4">
            <Skeleton className="mb-3 h-3 w-20" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-6 w-14 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>

      <OrgSettingsUpgradeCardSkeleton />
    </div>
  );
}

export function OrgSettingsUpgradeSkeleton() {
  return (
    <div className="space-y-8">
      <OrgSettingsPageHeaderSkeleton />
      <OrgSettingsUpgradeCardSkeleton />
    </div>
  );
}

export function OrganizationSettingsGeneralSectionSkeleton() {
  return (
    <div className="space-y-8">
      <OrgSettingsPageHeaderSkeleton />

      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="h-9 w-16" />
        </CardContent>
      </Card>
    </div>
  );
}
