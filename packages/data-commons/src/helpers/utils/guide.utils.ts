import ms from "ms";

export const formatGuideDuration = (totalSeconds: number): string => {
	return ms(totalSeconds * 1000);
};

export const formatGuideCreationTime = (dateAsIso: string) => {
	const targetDateTimestamp = new Date(dateAsIso).getTime();
	const nowTimestamp = Date.now();
	const diffInMs = nowTimestamp - targetDateTimestamp;
	const humanReadable = ms(diffInMs);
	return humanReadable;
};

export const formatCompactNumber = (value: number): string => {
	const abs = Math.abs(value);
	if (abs < 1000) {
		return String(value);
	}

	const suffixes = [
		{ threshold: 1_000_000_000, suffix: "B", divisor: 1_000_000_000 },
		{ threshold: 1_000_000, suffix: "M", divisor: 1_000_000 },
		{ threshold: 1_000, suffix: "k", divisor: 1_000 },
	];

	const match = suffixes.find((s) => abs >= s.threshold);
	if (!match) {
		return String(value);
	}

	const rounded = abs / match.divisor;
	const formatted =
		rounded % 1 === 0
			? rounded.toFixed(0)
			: rounded < 10
				? rounded.toFixed(1)
				: rounded.toFixed(0);

	return `${value < 0 ? "-" : ""}${formatted}${match.suffix}`;
};

export const formatTimeSaved = (totalMinutes: number): string => {
	if (totalMinutes < 60) {
		return `${Math.round(totalMinutes)} Mins`;
	}

	const hours = totalMinutes / 60;
	// If it's a whole number, don't show decimals. If it has decimals, round to 1 decimal place.
	const formattedHours = hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1);
	return `${formattedHours} Hour${Number(formattedHours) > 1 ? "s" : ""}`;
};
