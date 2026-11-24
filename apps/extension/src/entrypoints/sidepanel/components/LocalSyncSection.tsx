import { useState, type ReactNode } from "react";

import {
  AlertCircle,
  CheckCircle2,
  CloudOff,
  Clock,
  HardDrive,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LocalSession, LocalSyncSessionSummary, OutboxCounts } from "@/models";

export type LocalSyncSectionProps = {
  counts: OutboxCounts;
  sessions: LocalSyncSessionSummary[];
  otherSessions: LocalSession[];
  isPending?: boolean;
  onRetryFailed: (sessionId?: string) => void;
  onDiscardSession: (sessionId: string) => void;
  onDiscardUserData: () => void;
};

type DiscardTarget = { kind: "user" } | { kind: "session"; session: LocalSession };

const totalStored = (counts: OutboxCounts) =>
  counts.pending + counts.uploading + counts.synced + counts.failed;

const formatDate = (value: string) => new Date(value).toLocaleString();

export function LocalSyncSection({
  counts,
  sessions,
  otherSessions,
  isPending = false,
  onRetryFailed,
  onDiscardSession,
  onDiscardUserData,
}: LocalSyncSectionProps) {
  const [discardTarget, setDiscardTarget] = useState<DiscardTarget | null>(null);

  const failedSessions = sessions.filter((session) => session.failedSteps.length > 0);
  const hasAnythingStored = totalStored(counts) > 0;
  const isEmpty = sessions.length === 0 && otherSessions.length === 0;

  const closeDiscard = () => setDiscardTarget(null);

  const confirmDiscard = () => {
    if (discardTarget?.kind === "user") {
      onDiscardUserData();
    }
    if (discardTarget?.kind === "session") {
      onDiscardSession(discardTarget.session.id);
    }
    closeDiscard();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[13px] font-semibold text-foreground/80">Local sync</span>
        {counts.failed > 0 && (
          <Button
            variant="outline"
            size="xs"
            className="gap-1"
            disabled={isPending}
            onClick={() => onRetryFailed()}
          >
            <RefreshCw className="size-3" />
            Retry all failed
          </Button>
        )}
      </div>

      <Card size="sm" className="overflow-hidden border-border/60 shadow-sm">
        <CardContent className="flex flex-col gap-0 p-0">
          {isEmpty ? (
            <EmptyLocalSync />
          ) : (
            <>
              <div className="grid grid-cols-4 gap-1 border-b border-border/50 px-2 py-3">
                <CountTile
                  icon={<Clock className="size-3.5" />}
                  label="Pending"
                  value={counts.pending}
                />
                <CountTile
                  icon={<Upload className="size-3.5" />}
                  label="Uploading"
                  value={counts.uploading}
                />
                <CountTile
                  icon={<CheckCircle2 className="size-3.5" />}
                  label="Synced"
                  value={counts.synced}
                  tone="success"
                />
                <CountTile
                  icon={<AlertCircle className="size-3.5" />}
                  label="Failed"
                  value={counts.failed}
                  tone={counts.failed > 0 ? "destructive" : "default"}
                />
              </div>

              {failedSessions.length > 0 && (
                <div className="flex flex-col divide-y divide-border/50 border-b border-border/50">
                  {failedSessions.map((summary) => (
                    <FailedSessionRow
                      key={summary.session.id}
                      summary={summary}
                      isPending={isPending}
                      onRetry={() => onRetryFailed(summary.session.id)}
                    />
                  ))}
                </div>
              )}

              {otherSessions.length > 0 && (
                <div className="flex flex-col gap-2 border-b border-border/50 px-3 py-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600">
                    <CloudOff className="size-3.5" />
                    Captures from another account
                  </div>
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    These steps belong to a different account and will not sync until you sign back
                    in.
                  </p>
                  {otherSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5"
                    >
                      <span className="min-w-0 truncate text-[10px] text-muted-foreground">
                        {formatDate(session.startedAt)}
                      </span>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="gap-1 text-destructive/80 hover:text-destructive"
                        disabled={isPending}
                        onClick={() => setDiscardTarget({ kind: "session", session })}
                      >
                        <Trash2 className="size-3" />
                        Discard
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <span className="text-[10px] text-muted-foreground/70">
                  Stored only in this browser.
                </span>
                {hasAnythingStored && (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="gap-1 text-destructive/80 hover:text-destructive"
                    disabled={isPending}
                    onClick={() => setDiscardTarget({ kind: "user" })}
                  >
                    <Trash2 className="size-3" />
                    Discard local captures
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={discardTarget !== null}
        onOpenChange={(open) => {
          if (!open) closeDiscard();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {discardTarget?.kind === "session"
                ? "Discard this session?"
                : "Discard local captures?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {discardTarget?.kind === "session"
                ? "This permanently deletes this session's local captures from this browser. Steps already synced to the server are kept."
                : "This permanently deletes pending, failed, and synced step history stored in this browser for your account. Guides already on the server are not affected."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isPending} onClick={confirmDiscard}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyLocalSync() {
  return (
    <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center">
      <HardDrive className="size-6 text-muted-foreground/30" />
      <p className="text-[11px] font-medium text-muted-foreground">Nothing stored locally</p>
      <p className="max-w-52 text-[10px] leading-relaxed text-muted-foreground/60">
        Captured steps are saved in this browser first, then synced in the background.
      </p>
    </div>
  );
}

function CountTile({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone?: "default" | "success" | "destructive";
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={
          tone === "success"
            ? "text-green-600"
            : tone === "destructive"
              ? "text-destructive"
              : "text-muted-foreground/60"
        }
      >
        {icon}
      </span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-[9px] tracking-wide text-muted-foreground/60 uppercase">{label}</span>
    </div>
  );
}

function FailedSessionRow({
  summary,
  isPending,
  onRetry,
}: {
  summary: LocalSyncSessionSummary;
  isPending: boolean;
  onRetry: () => void;
}) {
  const failed = summary.failedSteps.length;
  const lastError = summary.failedSteps.find((step) => step.lastError !== undefined)?.lastError;

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[11px] font-medium text-foreground/80">
          {formatDate(summary.session.startedAt)}
        </span>
        <Button
          variant="outline"
          size="xs"
          className="shrink-0 gap-1"
          disabled={isPending}
          onClick={onRetry}
        >
          <RefreshCw className="size-3" />
          Retry failed
        </Button>
      </div>
      <span className="text-[10px] text-destructive/80">
        {failed} step{failed !== 1 ? "s" : ""} failed to sync
      </span>
      {lastError && (
        <span className="text-[10px] leading-relaxed text-muted-foreground/70">{lastError}</span>
      )}
    </div>
  );
}
