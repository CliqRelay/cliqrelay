import { Activity } from "lucide-react";

const activity = [
	{
		name: "Sara Johnson",
		action: "viewed",
		target: "How to Setup Google Analytics 4",
		time: "2m ago",
		avatarColor: "from-fuchsia-500 to-purple-600",
	},
	{
		name: "Mike Ross",
		action: "commented on",
		target: "Invite Team Members to Workspace",
		time: "1h ago",
		avatarColor: "from-emerald-500 to-teal-600",
	},
	{
		name: "You",
		action: "shared",
		target: "Create a New Project in ClickUp",
		time: "3h ago",
		avatarColor: "from-sky-500 to-blue-600",
	},
	{
		name: "Emma Watson",
		action: "viewed",
		target: "Export Reports from Salesforce",
		time: "5h ago",
		avatarColor: "from-amber-500 to-orange-600",
	},
];

export function ActivityFeed() {
	return (
		<div className="surface-card rounded-[20px] overflow-hidden">
			<div className="flex items-center justify-between px-5 py-4">
				<div className="flex items-center gap-2">
					<Activity className="size-4 text-primary" />
					<h3 className="text-[14px] font-semibold text-foreground">
						Activity Feed
					</h3>
				</div>
			</div>
			<div className="px-2 pb-2">
				{activity.map((a, i) => (
					<div
						key={i}
						className="flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-surface-hover"
					>
						<div
							className={`size-8 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-semibold text-white bg-gradient-to-br ${a.avatarColor}`}
						>
							{a.name
								.split(" ")
								.map((w) => w[0])
								.join("")
								.slice(0, 2)}
						</div>
						<div className="flex-1 min-w-0">
							<div className="text-[12.5px] text-muted-foreground leading-snug">
								<span className="text-foreground font-medium">{a.name}</span>{" "}
								{a.action}
							</div>
							<div className="text-[12.5px] text-muted-foreground hover:text-foreground transition-colors truncate cursor-pointer">
								{a.target}
							</div>
						</div>
						<span className="text-[11px] text-muted-foreground shrink-0 mt-0.5">
							{a.time}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
