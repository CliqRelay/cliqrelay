import { archiveExportStrategy } from "./archive-export.strategy";
import { CORE_EXPORT_STRATEGIES, getExportStrategy } from "./index";
import type { GuideExportContext } from "@/models";

const createContext = (replacingStepIds: string[] = []): GuideExportContext => ({
  guide: {
    id: "guide-1",
    title: "Checkout flow",
    description: null,
    metadata: null,
  },
  replacingStepIds,
});

describe("guide export strategies", () => {
  it("enables the archive strategy when no steps are being replaced", () => {
    expect(archiveExportStrategy.getAvailability(createContext())).toEqual({ available: true });
  });

  it("disables the archive strategy while steps are being replaced", () => {
    expect(archiveExportStrategy.getAvailability(createContext(["step-1"]))).toEqual({
      available: false,
      reason: "Uploads in progress",
    });
  });

  it("falls back to the first strategy for an unknown id", () => {
    expect(getExportStrategy(CORE_EXPORT_STRATEGIES, "unknown").id).toBe("pdf");
  });
});
