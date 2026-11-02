import { ListOrderedIcon } from "lucide-react";

import { StepsReorderWidgetButton } from "./steps-reorder-widget-button";
import type { EditorWidgetManifest } from "@/models";

export const CORE_WIDGET_MANIFESTS = [
  {
    id: "reorder-steps",
    label: "Reorder steps",
    icon: ListOrderedIcon,
    button: StepsReorderWidgetButton,
  },
] as const satisfies readonly EditorWidgetManifest[];
