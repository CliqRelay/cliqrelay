import { type KeyboardEvent, useEffect } from "react";

import { useForm } from "@tanstack/react-form";

import type { Step, StepCanvasContent, StepCanvasType } from "@repo/api-client";

import { useDebouncedSave } from "./useDebouncedSave";
import { DEFAULT_CODE_LANGUAGE, canvasFormSchema, type CanvasFormValues } from "@/models";

type Options = {
  step: Step;
  onUpdate?: (stepId: string, updates: Record<string, unknown>) => void;
};

export function useCanvasStepForm({ step, onUpdate }: Options) {
  const form = useForm({
    defaultValues: {
      headingText: step.canvasContent?.headingText ?? "",
      bodyText: step.canvasContent?.bodyText ?? "",
      language: step.canvasContent?.language ?? DEFAULT_CODE_LANGUAGE,
      code: step.canvasContent?.code ?? "",
      caption: step.canvasContent?.caption ?? "",
    } satisfies CanvasFormValues,
    validators: { onChange: canvasFormSchema },
  });

  useEffect(() => {
    if (form.state.isDirty) return;
    form.reset({
      headingText: step.canvasContent?.headingText ?? "",
      bodyText: step.canvasContent?.bodyText ?? "",
      language: step.canvasContent?.language ?? DEFAULT_CODE_LANGUAGE,
      code: step.canvasContent?.code ?? "",
      caption: step.canvasContent?.caption ?? "",
    });
  }, [
    form,
    step.canvasContent?.headingText,
    step.canvasContent?.bodyText,
    step.canvasContent?.language,
    step.canvasContent?.code,
    step.canvasContent?.caption,
  ]);

  const debouncedSave = useDebouncedSave(step.id, onUpdate ?? (() => {}));
  const canvasType = step.canvasContent?.type ?? "tip";

  function saveCanvasContent(overrides: Partial<StepCanvasContent>): void {
    const content: StepCanvasContent =
      canvasType === "code"
        ? {
            type: "code",
            language: form.getFieldValue("language"),
            code: form.getFieldValue("code"),
            caption: form.getFieldValue("caption"),
          }
        : {
            type: canvasType,
            headingText: form.getFieldValue("headingText"),
            bodyText: form.getFieldValue("bodyText"),
          };

    debouncedSave("canvasContent", { ...content, ...overrides });
  }

  function handleTypeChange(value: StepCanvasType): void {
    onUpdate?.(step.id, {
      canvasContent:
        value === "code"
          ? { type: "code", language: DEFAULT_CODE_LANGUAGE, code: "", caption: "" }
          : { type: value, headingText: "", bodyText: "" },
    });
  }

  function handleCodeTab(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== "Tab") return;

    event.preventDefault();

    const textarea = event.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const nextValue = `${current.slice(0, start)}  ${current.slice(end)}`;

    form.setFieldValue("code", nextValue);
    saveCanvasContent({ code: nextValue });

    requestAnimationFrame(() => {
      textarea.setSelectionRange(start + 2, start + 2);
      textarea.focus();
    });
  }

  return {
    form,
    canvasType,
    saveCanvasContent,
    handleTypeChange,
    handleCodeTab,
  };
}
