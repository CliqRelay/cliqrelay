import { useCallback, useEffect, useRef } from "react";

import { debounce, type DebouncedFunction } from "es-toolkit";

export function useDebouncedSave(
	id: string | undefined | null,
	onSave: (id: string, updates: Record<string, unknown>) => void,
	delay = 600,
) {
	const debouncedFns = useRef<
		Map<string, DebouncedFunction<(val: unknown) => void>>
	>(new Map());

	const debouncedSave = useCallback(
		(field: string, value: unknown) => {
			if (!id) return;

			const key = `${id}-${field}`;
			let fn = debouncedFns.current.get(key);
			if (!fn) {
				fn = debounce((val: unknown) => onSave(id, { [field]: val }), delay);
				debouncedFns.current.set(key, fn);
			}
			fn(value);
		},
		[id, onSave, delay],
	);

	useEffect(() => {
		return () => {
			debouncedFns.current.forEach((fn) => {
				fn.cancel();
			});
		};
	}, []);

	return debouncedSave;
}
