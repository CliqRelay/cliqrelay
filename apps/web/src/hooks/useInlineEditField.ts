import { useEffect, useRef, useState } from "react";

import { type DebouncedFunction, debounce } from "es-toolkit";

export function useInlineEditField(
  externalValue: string,
  isEditing: boolean,
  onSave: (value: string) => void,
  delay = 500,
) {
  const [localValue, setLocalValue] = useState(externalValue);
  const beforeEditRef = useRef(externalValue);
  const lastSavedRef = useRef(externalValue);
  const onSaveRef = useRef(onSave);
  const debouncedSaveRef = useRef<DebouncedFunction<(value: string) => void> | null>(null);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    const debouncedSave = debounce((value: string) => {
      onSaveRef.current(value);
      lastSavedRef.current = value;
    }, delay);
    debouncedSaveRef.current = debouncedSave;
    return () => {
      debouncedSave.cancel();
      debouncedSaveRef.current = null;
    };
  }, [delay]);

  useEffect(() => {
    if (isEditing) return;
    if (externalValue !== lastSavedRef.current) {
      setLocalValue(externalValue);
      lastSavedRef.current = externalValue;
    }
  }, [externalValue, isEditing]);

  const startEditing = () => {
    beforeEditRef.current = localValue;
  };

  const handleChange = (value: string) => {
    setLocalValue(value);
    if (value === lastSavedRef.current) {
      debouncedSaveRef.current?.cancel();
      return;
    }
    debouncedSaveRef.current?.(value);
  };

  const flush = () => {
    debouncedSaveRef.current?.cancel();
    const trimmed = localValue.trim();
    if (trimmed !== lastSavedRef.current) {
      onSaveRef.current(trimmed);
      lastSavedRef.current = trimmed;
    }
  };

  const cancelEditing = () => {
    setLocalValue(beforeEditRef.current);
    debouncedSaveRef.current?.cancel();
  };

  return {
    localValue,
    setLocalValue,
    beforeEditRef,
    startEditing,
    handleChange,
    flush,
    cancelEditing,
  };
}
