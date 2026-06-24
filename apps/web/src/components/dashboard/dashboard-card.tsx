import { cn } from "@/lib/utils";

export function DashboardCard({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"rounded-2xl border border-hairline bg-surface-elevated p-6 transition-all duration-200",
				className,
			)}
		>
			{children}
		</div>
	);
}
