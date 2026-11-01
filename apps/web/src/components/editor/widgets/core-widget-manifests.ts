import { ListOrderedIcon } from "lucide-react";

import { StepsReorderWidget } from "./steps-reorder-widget";
import type { EditorWidgetManifest } from "@/models";

export const CORE_WIDGET_MANIFESTS = [
  {
    id: "reorder-steps",
    label: "Reorder steps",
    icon: ListOrderedIcon,
    component: StepsReorderWidget,
  },
] as const satisfies readonly EditorWidgetManifest[];
