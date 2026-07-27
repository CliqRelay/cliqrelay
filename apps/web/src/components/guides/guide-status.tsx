import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
	draft:
		"bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400 border-slate-200 dark:border-slate-500/20",
	published:
		"bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
	archived:
		"bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400 border-sky-200 dark:border-sky-500/20",
	deleted: "bg-muted text-muted-foreground border-border",
};

type Props = {
	status: string;
};

export function GuideStatus({ status }: Props) {
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
