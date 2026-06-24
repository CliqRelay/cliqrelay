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

export const formatTimeSaved = (totalMinutes: number): string => {
	if (totalMinutes < 60) {
		return `${Math.round(totalMinutes)} Mins`;
	}

	const hours = totalMinutes / 60;
	// If it's a whole number, don't show decimals. If it has decimals, round to 1 decimal place.
	const formattedHours = hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1);
	return `${formattedHours} Hours`;
};
