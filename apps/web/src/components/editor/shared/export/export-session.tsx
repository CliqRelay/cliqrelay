import { useEffect, useEffectEvent, type ReactNode } from "react";

import type { GuideExportContext, GuideExportController, GuideExportManifest } from "@/models";

type Props = {
  strategy: GuideExportManifest;
  context: GuideExportContext;
  onDone?: () => void;
  children: (controller: GuideExportController) => ReactNode;
};

export function ExportStrategySession({ strategy, context, onDone, children }: Props) {
  const controller = strategy.useController(context);
  const notifyDone = useEffectEvent(() => onDone?.());

  useEffect(() => {
    if (strategy.closeOnDone && controller.status === "done") {
      notifyDone();
    }
  }, [strategy.closeOnDone, controller.status]);

  return children(controller);
}
