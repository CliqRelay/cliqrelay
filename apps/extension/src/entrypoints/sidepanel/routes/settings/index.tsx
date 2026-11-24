import { createFileRoute, Link } from "@tanstack/react-router";

import { ArrowLeft } from "lucide-react";

import { SettingsView } from "../../components";
import { useAuthSession } from "../../hooks/useAuthSession";
import { useLocalSyncOverview } from "../../hooks/useLocalSyncOverview";
import { useSidePanelCommands } from "../../hooks/useSidePanelCommands";
import { useSidePanelSettings } from "../../hooks/useSidePanelSettings";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings/")({
  component: Settings,
});

function Settings() {
  const { user } = useAuthSession();
  const { settings, updateSettings } = useSidePanelSettings();
  const { overview, isLoading } = useLocalSyncOverview(user?.id);
  const commands = useSidePanelCommands();

  return (
    <div className="flex flex-col gap-4 p-2">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-xs" asChild>
          <Link to="/" className="text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <span className="text-[13px] font-semibold">Settings</span>
      </div>
      <SettingsView
        settings={settings}
        onUpdate={updateSettings}
        localSync={{
          counts: overview.counts,
          sessions: overview.sessions,
          otherSessions: overview.otherSessions,
          isPending: isLoading,
          onRetryFailed: (sessionId) => {
            void commands.retryFailed(sessionId);
          },
          onDiscardSession: (sessionId) => {
            void commands.discardSession(sessionId);
          },
          onDiscardUserData: () => {
            void commands.discardUserData();
          },
        }}
      />
    </div>
  );
}
