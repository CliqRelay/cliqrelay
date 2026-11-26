import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GuideExportAvailability, GuideExportGroup, GuideExportManifest } from "@/models";

export type ExportFormatOption = {
  strategy: GuideExportManifest;
  availability: GuideExportAvailability;
};

type Props = {
  options: readonly ExportFormatOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
};

const GROUP_HEADINGS: Record<GuideExportGroup, string | null> = {
  download: null,
  integration: "Integrations",
};

const groupOptions = (options: readonly ExportFormatOption[]) => {
  const groups = new Map<GuideExportGroup, ExportFormatOption[]>();

  for (const option of options) {
    const group = groups.get(option.strategy.group) ?? [];
    group.push(option);
    groups.set(option.strategy.group, group);
  }

  return Array.from(groups, ([group, items]) => ({ group, items }));
};

export function ExportFormatSelector({ options, selectedId, onSelect, disabled = false }: Props) {
  return (
    <div className="grid gap-3 py-4">
      {groupOptions(options).map(({ group, items }) => (
        <div key={group} className="grid gap-3">
          {GROUP_HEADINGS[group] && (
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {GROUP_HEADINGS[group]}
            </p>
          )}

          {items.map(({ strategy, availability }) => {
            const Icon = strategy.icon;
            const isDisabled = disabled || !availability.available;

            return (
              <Button
                key={strategy.id}
                variant="outline"
                onClick={() => !isDisabled && onSelect(strategy.id)}
                disabled={isDisabled}
                className={cn(
                  "flex h-auto w-full items-start justify-start gap-3 rounded-lg border p-3 text-left",
                  selectedId === strategy.id ? "border-primary bg-primary/5" : "hover:bg-muted",
                  !availability.available && "cursor-not-allowed opacity-50",
                )}
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex w-full items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{strategy.label}</div>
                    <p className="text-xs text-muted-foreground">{strategy.description}</p>
                  </div>
                  {!availability.available && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {availability.reason}
                    </span>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
