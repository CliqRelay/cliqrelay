import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { Guide } from "@repo/api-client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

type GuideActivityChartProps = {
	guides: Guide[];
};

export default function GuideActivityChart({
	guides,
}: GuideActivityChartProps) {
	const monthlyData = useMemo(() => {
		const counts = new Array(12).fill(0);
		for (const guide of guides) {
			if (!guide.createdAt) continue;
			const month = new Date(guide.createdAt).getMonth();
			counts[month]++;
		}
		return MONTHS.map((month, i) => ({
			month,
			guides: counts[i],
		}));
	}, [guides]);

	const totalCreated = guides.length;
	const thisMonth = monthlyData[new Date().getMonth()]?.guides ?? 0;
	const lastMonth = monthlyData[new Date().getMonth() - 1]?.guides ?? 0;
	const growth =
		lastMonth > 0
			? `+${Math.round(((thisMonth - lastMonth) / lastMonth) * 100)}%`
			: "+0%";

	const chartConfig = {
		guides: {
			label: "Guides",
			color: "var(--color-sky-400)",
		},
	} satisfies ChartConfig;

	return (
		<Card className="w-full py-6 gap-6">
			<CardHeader className="flex sm:flex-row flex-col justify-between sm:items-center items-start gap-3 px-6">
				<div className="flex flex-col gap-1">
					<CardTitle className="text-lg font-medium">
						Guide Creation Activity
					</CardTitle>
					<div className="flex items-center gap-2">
						<h3 className="text-3xl font-medium text-card-foreground">
							{totalCreated}
						</h3>
						<Badge
							className={cn("bg-teal-400/10 text-muted-foreground shadow-none")}
						>
							{growth}
						</Badge>
						<span className="text-xs text-muted-foreground">vs last month</span>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2">
						<span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
						<p className="text-sm text-muted-foreground">Guides created</p>
					</div>
				</div>
			</CardHeader>
			<CardContent className="px-6">
				<ChartContainer config={chartConfig} className="h-[300px] w-full">
					<BarChart accessibilityLayer data={monthlyData}>
						<CartesianGrid
							vertical={false}
							strokeDasharray="3 3"
							stroke="rgba(144, 164, 174, 0.3)"
						/>
						<XAxis
							dataKey="month"
							tickLine={false}
							tickMargin={10}
							axisLine={false}
							fontSize={12}
						/>
						<YAxis
							tickLine={false}
							axisLine={false}
							tickMargin={10}
							fontSize={12}
							allowDecimals={false}
						/>
						<Bar
							dataKey="guides"
							fill="var(--color-sky-400)"
							radius={[4, 4, 0, 0]}
							barSize={20}
						/>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
