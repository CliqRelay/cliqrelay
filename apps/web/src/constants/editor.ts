// Layers that render outside the editor canvas but still belong to it
export const EDITOR_POINTER_IGNORE_SELECTOR = [
  "[data-radix-popper-content-wrapper]",
  "[data-slot='select-content']",
  "[data-slot='dropdown-menu-content']",
  "[data-slot='tooltip-content']",
  "[data-slot='dialog-content']",
  "[data-slot='drawer-content']",
  "[data-slot='sheet-content']",
  "[data-editor-widget-surface]",
].join(", ");
