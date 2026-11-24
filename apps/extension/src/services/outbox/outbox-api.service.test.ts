import { beforeEach, describe, expect, test, vi } from "vitest";

import { api, type CreateStepResponse, type StepAction } from "@repo/api-client";

import { createOutboxApi, OutboxPermanentError } from "./outbox-api.service";
import type { OutboxCreateStepInput } from "@/models";

vi.mock("@repo/api-client", () => ({
  StepAction: {
    click: "click",
    input: "input",
    navigation: "navigation",
    keypress: "keypress",
  },
  api: {
    steps: {
      createStep: vi.fn(),
    },
  },
}));

vi.mock("@/lib/csrf", () => ({
  withCsrf: vi.fn(async () => ({})),
}));

const serverStepId = "server-step-1";

const createStepResponse = { step: { id: serverStepId } } as unknown as CreateStepResponse;

const stepInput: OutboxCreateStepInput = {
  guideId: "guide-1",
  clientStepId: "client-step-1",
  action: "click",
  actionText: "Click the button",
  url: "https://example.com",
  targetElement: { selector: "#button" },
  insertAfterStepId: "server-step-0",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("outbox api", () => {
  describe("createStep", () => {
    test("sends a valid stored action to the API", async () => {
      vi.mocked(api.steps.createStep).mockResolvedValue(createStepResponse);

      await expect(createOutboxApi().createStep(stepInput)).resolves.toEqual({
        id: serverStepId,
      });

      expect(api.steps.createStep).toHaveBeenCalledWith(
        {
          guideId: "guide-1",
          clientStepId: "client-step-1",
          type: "interaction",
          action: "click",
          url: "https://example.com",
          actionText: "Click the button",
          targetElement: { selector: "#button" },
          insertAfterStepId: "server-step-0",
        },
        {},
      );
    });

    test("rejects an invalid stored action without calling the API", async () => {
      const invalidInput = {
        ...stepInput,
        action: "explode" as unknown as StepAction,
      };

      const promise = createOutboxApi().createStep(invalidInput);

      await expect(promise).rejects.toBeInstanceOf(OutboxPermanentError);
      await expect(promise).rejects.toMatchObject({ kind: "step-conflict" });

      expect(api.steps.createStep).not.toHaveBeenCalled();
    });
  });
});
