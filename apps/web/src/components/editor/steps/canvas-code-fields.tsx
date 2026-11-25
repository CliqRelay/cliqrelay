import type { KeyboardEvent } from "react";

import type { StepCanvasContent } from "@repo/api-client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { useCanvasStepForm } from "@/hooks/useCanvasStepForm";
import { CODE_LANGUAGES } from "@/models";

type Props = {
  form: ReturnType<typeof useCanvasStepForm>["form"];
  onSave: (overrides: Partial<StepCanvasContent>) => void;
  onTab: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};

export function CanvasCodeFields({ form, onSave, onTab }: Props) {
  return (
    <div onClick={(event) => event.stopPropagation()}>
      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Language</label>
        <form.Field name="language">
          {(field) => (
            <Select
              value={field.state.value}
              onValueChange={(value) => {
                field.handleChange(value);
                onSave({ language: value });
              }}
            >
              <SelectTrigger aria-label="Language" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CODE_LANGUAGES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </form.Field>
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Caption</label>
        <form.Field name="caption">
          {(field) => (
            <Input
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                onSave({ caption: event.target.value });
              }}
              onBlur={field.handleBlur}
              onClick={(event) => event.stopPropagation()}
              placeholder="docker-compose.prod.yml"
            />
          )}
        </form.Field>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Code</label>
        <form.Field name="code">
          {(field) => (
            <Textarea
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                onSave({ code: event.target.value });
              }}
              onBlur={field.handleBlur}
              onKeyDown={onTab}
              onClick={(event) => event.stopPropagation()}
              aria-label="Code"
              className="font-mono text-sm"
              rows={10}
              spellCheck={false}
              autoCapitalize="off"
            />
          )}
        </form.Field>
      </div>
    </div>
  );
}
