import ms from "ms";

export function timeAgo(dateStr: string): string {
	return `${ms(Math.max(0, Date.now() - new Date(dateStr).getTime()))} ago`;
}

export function formatDuration(totalSeconds: number): string {
	if (totalSeconds < 60) return `${totalSeconds}s`;
	const minutes = Math.round(totalSeconds / 60);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
