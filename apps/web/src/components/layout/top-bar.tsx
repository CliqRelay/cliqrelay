import { Menu } from "lucide-react";

import { OrgDropdown } from "./org-dropdown";
import UserDropdown from "./user-dropdown";
import { ThemeToggle } from "@/components/motion/theme-toggle";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import type { AppUser } from "@/models/auth";
import { useTeamStore } from "@/stores";

export function TopBar({
  onMenuToggle,
  user,
}: {
  onMenuToggle?: () => void;
  user?: AppUser | null;
}) {
  const teamLoaded = useTeamStore((s) => s.loaded);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-6">
      {onMenuToggle && (
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-[14px] bg-surface-1 text-muted-foreground transition-colors hover:text-foreground md:hidden"
          aria-label="Open navigation menu"
          onClick={onMenuToggle}
        >
          <Menu className="size-4" />
        </button>
      )}

      <div className="flex flex-1 items-center">
        <OrgDropdown />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* <Button
					type="button"
					aria-label="Notifications"
					variant="ghost"
					className="relative rounded-full"
				>
					<Bell className="size-4" />
					<span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
				</Button> */}

        <ThemeToggle
          className="size-8 cursor-pointer rounded-[14px] hover:bg-muted"
          iconClassName="size-4"
          variant="circle-blur"
        />

        {user && teamLoaded && (
          <UserDropdown
            user={user}
            defaultOpen={false}
            align="end"
            trigger={
              <Button
                variant="ghost"
                className="flex size-8 items-center justify-center rounded-full p-0"
              >
                <UserAvatar user={user} />
              </Button>
            }
          />
        )}
      </div>
    </header>
  );
}
