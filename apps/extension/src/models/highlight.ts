import { INDICATOR_DEFAULTS } from "@repo/data-commons";

export const HIGHLIGHT_HOST_ID = "cliqrelay-highlight-host";

export const HIGHLIGHT_STYLE = {
  color: INDICATOR_DEFAULTS.color,
  fill: `${INDICATOR_DEFAULTS.color}14`, // 8% opacity
  borderWidth: INDICATOR_DEFAULTS.borderWidth,
  radius: 4,
} as const;

export type HighlightOverlay = {
  enable: () => void;
  disable: () => void;
  suppress: () => Promise<void>;
  restore: () => void;
};

export type SetHighlightSuppressed = (tabId: number, suppressed: boolean) => Promise<void>;
