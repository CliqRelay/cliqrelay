import type { Step, StepCanvasType } from "@repo/api-client";

import { CanvasCodeFields } from "./canvas-code-fields";
import { StepMedia } from "./step-media";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCanvasStepForm } from "@/hooks/useCanvasStepForm";

const CANVAS_TYPE_OPTIONS = [
  { value: "tip", label: "Tip" },
  { value: "callout", label: "Callout" },
  { value: "alert", label: "Alert" },
  { value: "header", label: "Header" },
  { value: "code", label: "Code Block" },
] as const;

type CanvasStepFormProps = {
  step: Step;
  onUpdate?: (stepId: string, updates: Record<string, unknown>) => void;
  onReplaceMedia?: () => void;
  isReplacing?: boolean;
};

export function CanvasStepForm({
  step,
  onUpdate,
  onReplaceMedia,
  isReplacing,
}: CanvasStepFormProps) {
  const { form, canvasType, saveCanvasContent, handleTypeChange, handleCodeTab } =
    useCanvasStepForm({ step, onUpdate });

  const isHeader = canvasType === "header";
  const isCode = canvasType === "code";

  return (
    <>
      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
        <Select
          value={canvasType}
          onValueChange={(value) => handleTypeChange(value as StepCanvasType)}
        >
          <SelectTrigger aria-label="Type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CANVAS_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isCode ? (
        <CanvasCodeFields form={form} onSave={saveCanvasContent} onTab={handleCodeTab} />
      ) : (
        <>
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Heading</label>
            <form.Field name="headingText">
              {(field) => (
                <Input
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    saveCanvasContent({ headingText: e.target.value });
                  }}
                  onBlur={field.handleBlur}
                  onClick={(e) => e.stopPropagation()}
                  placeholder={isHeader ? "Section heading" : "Alert heading text"}
                />
              )}
            </form.Field>
          </div>

          {!isHeader && (
            <>
              <div className="mb-4">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Body</label>
                <form.Field name="bodyText">
                  {(field) => (
                    <Textarea
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        saveCanvasContent({ bodyText: e.target.value });
                      }}
                      onBlur={field.handleBlur}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Markdown body text"
                      rows={3}
                    />
                  )}
                </form.Field>
              </div>

              <StepMedia
                step={step}
                className="mb-0"
                onUpdate={onUpdate}
                onReplaceMedia={onReplaceMedia}
                isReplacing={isReplacing}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
