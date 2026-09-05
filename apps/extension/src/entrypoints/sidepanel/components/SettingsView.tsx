import { useEffect, useState } from "react";

import { useForm, useStore } from "@tanstack/react-form";

import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  defaultExtensionSettings,
  type ExtensionSettings,
  extensionSettingsSchema,
} from "@/models";

type SettingsViewProps = {
  settings: ExtensionSettings | undefined;
  onUpdate: (payload: Partial<ExtensionSettings>) => void;
};

export function SettingsView({ settings, onUpdate }: SettingsViewProps) {
  const [saved, setSaved] = useState<boolean>(false);

  const form = useForm({
    defaultValues: defaultExtensionSettings,
    validators: { onChange: extensionSettingsSchema },
  });

  const isDirty = useStore(form.store, (state) => state.isDirty);
  const formValues = useStore(form.store, (state) => state.values);

  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, form.reset]);

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-[11px] text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  const handleSave = () => {
    onUpdate(formValues);
    form.reset(formValues);
    setSaved(true);
  };

  const handleReset = () => {
    form.reset(settings);
    setSaved(false);
  };

  return (
    <Card size="sm" className="overflow-hidden border-border/60 shadow-sm">
      <CardContent className="flex flex-col gap-0 p-0">
        <p className="px-4 py-3 text-[11px] text-muted-foreground">
          There are no settings to configure yet.
        </p>
      </CardContent>

      {isDirty && (
        <CardFooter className="flex items-center justify-between border-t border-border/50 px-4 py-2.5">
          <Button variant="ghost" size="xs" onClick={handleReset}>
            Reset
          </Button>
          <Button size="xs" onClick={handleSave}>
            Save Changes
          </Button>
        </CardFooter>
      )}
      {saved && !isDirty && (
        <CardFooter className="border-t border-border/50 px-4 py-2.5">
          <span className="slide-in-from-bottom-0.5 flex animate-in items-center gap-1.5 text-[10px] text-green-600 duration-300 fade-in">
            <CheckCircle2 className="size-3.5" />
            Settings saved
          </span>
        </CardFooter>
      )}
    </Card>
  );
}
