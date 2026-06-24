import { useState } from "react";

import { Info } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { DashboardCard } from "./dashboard-card";

type Props = {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: string;
	isLoading?: boolean;
	tip?: string;
};

export function Kpi({ icon: Icon, label, value, isLoading, tip }: Props) {
	const [hover, setHover] = useState(false);

	return (
		<DashboardCard className="relative overflow-hidden hover:border-brand/30">
			<div className="flex items-start justify-between">
				<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
					<Icon className="h-5 w-5" />
				</div>
				{tip && (
					<div
						className="relative"
						onMouseEnter={() => setHover(true)}
						onMouseLeave={() => setHover(false)}
					>
						<Info className="h-3.5 w-3.5 cursor-help text-muted-foreground/60" />
						{hover && (
							<div className="absolute right-0 top-6 z-10 w-56 rounded-lg border border-hairline bg-popover p-2.5 text-xs leading-relaxed text-muted-foreground shadow-xl">
								{tip}
							</div>
						)}
					</div>
				)}
			</div>
			<div className="mt-5">
				<div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{label}
				</div>
				<div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
					{isLoading ? <Skeleton className="h-8 w-24" /> : value}
				</div>
			</div>
		</DashboardCard>
	);
}
