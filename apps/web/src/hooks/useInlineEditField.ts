import { useCallback, useEffect, useRef, useState } from "react";

import { debounce } from "es-toolkit";

export function useInlineEditField(
	externalValue: string,
	onSave: (value: string) => void,
	delay = 500,
) {
	const [localValue, setLocalValue] = useState(externalValue);
	const beforeEditRef = useRef(externalValue);
	const lastSavedRef = useRef(externalValue);
	const onSaveRef = useRef(onSave);
	onSaveRef.current = onSave;

	const debouncedSave = useRef(
		debounce((value: string) => {
			onSaveRef.current(value);
			lastSavedRef.current = value;
		}, delay),
	).current;

	useEffect(() => {
		if (externalValue !== lastSavedRef.current) {
			setLocalValue(externalValue);
			lastSavedRef.current = externalValue;
		}
	}, [externalValue]);

	useEffect(() => {
		return () => debouncedSave.cancel();
	}, [debouncedSave]);

	const startEditing = useCallback(() => {
		beforeEditRef.current = localValue;
	}, [localValue]);

	const handleChange = useCallback(
		(value: string) => {
			setLocalValue(value);
			if (value === lastSavedRef.current) {
				debouncedSave.cancel();
				return;
			}
			debouncedSave(value);
		},
		[debouncedSave],
	);

	const flush = useCallback(() => {
		debouncedSave.cancel();
		const trimmed = localValue.trim();
		if (trimmed !== lastSavedRef.current) {
			onSaveRef.current(trimmed);
			lastSavedRef.current = trimmed;
		}
	}, [localValue, debouncedSave]);

	const cancelEditing = useCallback(() => {
		setLocalValue(beforeEditRef.current);
		debouncedSave.cancel();
	}, [debouncedSave]);

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
