import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import type { GuideExportController } from "@/models";

type Props = {
  controller: GuideExportController;
  onClose: () => void;
  startDisabled?: boolean;
};

export function ExportFooter({ controller, onClose, startDisabled = false }: Props) {
  const isRunning = controller.status === "running";

  return (
    <DialogFooter>
      <Button
        variant="outline"
        onClick={isRunning && controller.cancel ? controller.cancel : onClose}
        disabled={isRunning && !controller.cancel}
      >
        {isRunning && controller.cancel ? "Cancel" : "Close"}
      </Button>

      {controller.status === "idle" && (
        <Button onClick={controller.start} disabled={controller.startDisabled || startDisabled}>
          {controller.startLabel}
        </Button>
      )}

      {isRunning && <Button disabled>{controller.runningLabel}</Button>}
    </DialogFooter>
  );
}
