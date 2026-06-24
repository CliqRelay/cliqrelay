import { Label, Pie, PieChart } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

type GuideStatusChartProps = {
	total: number;
	published: number;
	draft: number;
	archived: number;
};

const STATUS_COLORS = {
	Published: "var(--color-sky-400)",
	Draft: "var(--color-amber-400)",
	Archived: "var(--color-muted-foreground)",
};

export default function GuideStatusChart({
	total,
	published,
	draft,
	archived,
}: GuideStatusChartProps) {
	const chartData = [
		{
			status: "Published",
			count: published,
			fill: STATUS_COLORS.Published,
		},
		{
			status: "Draft",
			count: draft,
			fill: STATUS_COLORS.Draft,
		},
		{
			status: "Archived",
			count: archived,
			fill: STATUS_COLORS.Archived,
		},
	].filter((d) => d.count > 0);

	const chartConfig = {
		count: { label: "Count" },
		Published: {
			label: "Published",
			color: STATUS_COLORS.Published,
		},
		Draft: {
			label: "Draft",
			color: STATUS_COLORS.Draft,
		},
		Archived: {
			label: "Archived",
			color: STATUS_COLORS.Archived,
		},
	} satisfies ChartConfig;

	return (
		<Card className="h-full w-full py-6 gap-6">
			<CardHeader className="px-6">
				<CardTitle>
					<h4 className="text-lg font-semibold">Guide Status Breakdown</h4>
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col justify-between gap-2 flex-1 px-6">
				<ChartContainer
					config={chartConfig}
					className="aspect-square max-h-[250px]"
				>
					<PieChart>
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent hideLabel />}
						/>
						<Pie
							data={chartData}
							dataKey="count"
							nameKey="status"
							innerRadius={65}
							strokeWidth={50}
						>
							<Label
								content={({ viewBox }) => {
									if (viewBox && "cx" in viewBox && "cy" in viewBox) {
										return (
											<text
												x={viewBox.cx}
												y={viewBox.cy}
												textAnchor="middle"
												dominantBaseline="middle"
											>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) - 10}
													className="fill-muted-foreground text-sm"
												>
													Total
												</tspan>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) + 15}
													className="fill-foreground text-xl font-medium"
												>
													{total}
												</tspan>
											</text>
										);
									}
								}}
							/>
						</Pie>
					</PieChart>
				</ChartContainer>
				<div className="flex flex-col gap-3">
					{[
						{
							label: "Published",
							count: published,
							color: "bg-sky-400",
							badge:
								total > 0 ? `${Math.round((published / total) * 100)}%` : "0%",
						},
						{
							label: "Draft",
							count: draft,
							color: "bg-amber-400",
							badge: total > 0 ? `${Math.round((draft / total) * 100)}%` : "0%",
						},
						{
							label: "Archived",
							count: archived,
							color: "bg-muted-foreground",
							badge:
								total > 0 ? `${Math.round((archived / total) * 100)}%` : "0%",
						},
					].map((item) => (
						<div key={item.label} className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className={cn(item.color, "w-1 h-4 rounded-full")} />
								<h6 className="text-sm font-medium leading-tight">
									{item.label}
								</h6>
							</div>
							<div className="flex items-center gap-1">
								<h6 className="text-sm font-medium">{item.count}</h6>
								<Badge
									className={cn(
										"bg-teal-400/10 text-muted-foreground shadow-none",
									)}
								>
									{item.badge}
								</Badge>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
