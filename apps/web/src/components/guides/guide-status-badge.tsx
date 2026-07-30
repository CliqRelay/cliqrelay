import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
	draft:
		"bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
	published:
		"bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
	archived:
		"bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-900",
	deleted:
		"bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-900",
};

type Props = {
	status: string;
};

export function GuideStatusBadge({ status }: Props) {
	return (
		<Badge
			variant="outline"
			className={cn(
				"rounded-md px-2 py-0.5 text-[10.5px] font-medium capitalize",
				statusStyles[status] || statusStyles.draft,
			)}
		>
			{status}
		</Badge>
	);
}
