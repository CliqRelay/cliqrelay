import { Badge } from "../ui/badge";

export default function SoonBadge() {
	return (
		<Badge
			variant="outline"
			className="shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
		>
			Coming Soon
		</Badge>
	);
}
