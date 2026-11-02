import { StepsReorderDialog } from "./steps-reorder-dialog";
import { WidgetRailButton } from "./widget-rail-button";
import type { EditorWidgetButtonProps } from "@/models";

export function StepsReorderWidgetButton({
  label,
  icon,
  isActive,
  widgetProps,
  onActiveChange,
}: EditorWidgetButtonProps) {
  return (
    <>
      <WidgetRailButton
        label={label}
        icon={icon}
        isActive={isActive}
        hasPopup="dialog"
        onClick={(event) => onActiveChange(!isActive, event.currentTarget)}
      />

      <StepsReorderDialog
        {...widgetProps}
        open={isActive}
        onOpenChange={(open) => onActiveChange(open)}
      />
    </>
  );
}
