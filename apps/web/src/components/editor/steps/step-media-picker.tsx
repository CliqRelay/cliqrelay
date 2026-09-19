import type { ChangeEvent, RefObject } from "react";

import { MEDIA_REPLACE_ACCEPT } from "@/models";

type Props = {
  ref: RefObject<HTMLInputElement | null>;
  onSelect: (file: File) => void;
};

export function StepMediaPicker({ ref, onSelect }: Props) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) {
      onSelect(file);
    }
  };

  return (
    <input
      ref={ref}
      type="file"
      accept={MEDIA_REPLACE_ACCEPT}
      className="sr-only"
      tabIndex={-1}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
