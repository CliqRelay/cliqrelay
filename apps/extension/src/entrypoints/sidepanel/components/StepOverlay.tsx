import { INDICATOR_DEFAULTS } from "@repo/data-commons";

export function StepOverlay() {
	return (
		<div
			className="-translate-x-1/2 -translate-y-1/2 rounded-full transition-transform group-hover:scale-125"
			style={{
				width: INDICATOR_DEFAULTS.size,
				height: INDICATOR_DEFAULTS.size,
				borderWidth: INDICATOR_DEFAULTS.borderWidth,
				borderColor: INDICATOR_DEFAULTS.color,
				backgroundColor: `${INDICATOR_DEFAULTS.color}33`,
			}}
		/>
	);
}
