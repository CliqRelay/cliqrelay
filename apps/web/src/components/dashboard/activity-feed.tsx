import { Activity } from "lucide-react";

import { Blobatar } from "@/components/ui/blobatar";

const activity = [
  {
    name: "Sara Johnson",
    action: "viewed",
    target: "How to Setup Google Analytics 4",
    time: "2m ago",
  },
  {
    name: "Mike Ross",
    action: "commented on",
    target: "Invite Team Members to Workspace",
    time: "1h ago",
  },
  {
    name: "You",
    action: "shared",
    target: "Create a New Project in ClickUp",
    time: "3h ago",
  },
  {
    name: "Emma Watson",
    action: "viewed",
    target: "Export Reports from Salesforce",
    time: "5h ago",
  },
];

export function ActivityFeed() {
  return (
    <div className="overflow-hidden surface-card rounded-[20px]">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          <h3 className="text-[14px] font-semibold text-foreground">Activity Feed</h3>
        </div>
      </div>
      <div className="px-2 pb-2">
        {activity.map((a, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-surface-hover"
          >
            <Blobatar name={a.name} />
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] leading-snug text-muted-foreground">
                <span className="font-medium text-foreground">{a.name}</span> {a.action}
              </div>
              <div className="cursor-pointer truncate text-[12.5px] text-muted-foreground transition-colors hover:text-foreground">
                {a.target}
              </div>
            </div>
            <span className="mt-0.5 shrink-0 text-[11px] text-muted-foreground">{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
