import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, FileText, Plus, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type GuideRecord = {
	id: string;
	title: string;
	status: string;
	createdAt?: string | null;
	updatedAt?: string | null;
};

type ActivityTimelineProps = {
	guides: GuideRecord[];
};

const statusIcon: Record<string, typeof FileText> = {
	draft: Plus,
	published: FileText,
	archived: RefreshCw,
};

const statusColor: Record<string, string> = {
	draft: "text-amber-400 bg-amber-400/10",
	published: "text-sky-400 bg-sky-400/10",
	archived: "text-muted-foreground bg-muted",
};

export default function ActivityTimeline({ guides }: ActivityTimelineProps) {
	const recent = guides.slice(0, 6);

	return (
		<Card className="h-full py-6 gap-6">
			<CardHeader className="flex items-center justify-between px-6">
				<CardTitle className="text-lg font-medium text-foreground">
					Recent Activity
				</CardTitle>
				<CalendarDays className="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent className="px-0">
				<div className="flex flex-col gap-3">
					{recent.map((guide, index) => {
						const Icon = statusIcon[guide.status] ?? FileText;
						return (
							<div key={guide.id}>
								<div className="flex gap-3 items-center px-6">
									<div
										className={cn(
											"w-8 h-8 rounded-full flex items-center justify-center shrink-0",
											statusColor[guide.status],
										)}
									>
										<Icon size={16} />
									</div>
									<div className="flex items-center justify-between flex-1 min-w-0">
										<div className="min-w-0">
											<h5 className="text-sm font-medium text-foreground truncate">
												{guide.title}
											</h5>
											<p className="text-xs text-muted-foreground capitalize">
												{guide.status}
											</p>
										</div>
										<Badge
											className={cn(
												"text-muted-foreground shrink-0 ml-2",
												statusColor[guide.status],
											)}
										>
											{guide.updatedAt
												? format(new Date(guide.updatedAt), "MMM d")
												: "—"}
										</Badge>
									</div>
								</div>
								{index < recent.length - 1 && <Separator className="my-3" />}
							</div>
						);
					})}
					{recent.length === 0 && (
						<p className="text-sm text-muted-foreground text-center px-6 py-4">
							No activity yet. Create your first guide to get started.
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
