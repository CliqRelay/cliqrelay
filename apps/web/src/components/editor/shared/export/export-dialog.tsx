import { useState } from "react";

import type { Guide } from "@repo/api-client";

import { ExportFooter } from "./export-footer";
import { ExportFormatSelector } from "./export-format-selector";
import { ExportStrategySession } from "./export-session";
import { ExportStatus } from "./export-status";
import { CORE_EXPORT_STRATEGIES, getExportStrategy } from "./strategies";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GuideExportContext, GuideExportManifest } from "@/models";

type Props = {
  guide: Pick<Guide, "id" | "title" | "description" | "metadata">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replacingStepIds?: string[];
  strategies?: readonly GuideExportManifest[];
};

export function ExportDialog({ open, ...props }: Props) {
  return (
    <Dialog open={open} onOpenChange={props.onOpenChange}>
      <ExportDialogBody key={String(open)} {...props} />
    </Dialog>
  );
}

function ExportDialogBody({
  guide,
  onOpenChange,
  replacingStepIds = [],
  strategies = CORE_EXPORT_STRATEGIES,
}: Omit<Props, "open">) {
  const context: GuideExportContext = { guide, replacingStepIds };
  const options = strategies.map((strategy) => ({
    strategy,
    availability: strategy.getAvailability(context),
  }));

  const [selectedId, setSelectedId] = useState(
    () =>
      options.find((option) => option.availability.available)?.strategy.id ??
      options[0]?.strategy.id ??
      "",
  );

  const selected = getExportStrategy(strategies, selectedId);
  const selectedOption = options.find((option) => option.strategy.id === selected.id);
  const close = () => onOpenChange(false);

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Export Guide</DialogTitle>
        <DialogDescription>Choose a format to export &ldquo;{guide.title}&rdquo;</DialogDescription>
      </DialogHeader>

      <ExportStrategySession key={selected.id} strategy={selected} context={context} onDone={close}>
        {(controller) => (
          <>
            {controller.status === "idle" ? (
              <>
                {controller.config}
                <ExportFormatSelector
                  options={options}
                  selectedId={selected.id}
                  onSelect={setSelectedId}
                />
              </>
            ) : (
              <ExportStatus controller={controller} />
            )}

            <ExportFooter
              controller={controller}
              startDisabled={!selectedOption?.availability.available}
              onClose={close}
            />
          </>
        )}
      </ExportStrategySession>
    </DialogContent>
  );
}
