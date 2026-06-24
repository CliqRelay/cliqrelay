import { Lock } from "lucide-react";

import { Badge } from "../ui/badge";

export default function ProBadge() {
	return (
		<Badge
			variant="outline"
			className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-purple-300/30 bg-linear-to-r from-purple-500/10 to-purple-600/15 px-1.5 py-0.5 text-[9px] font-normal text-purple-600"
		>
			<Lock className="size-2.5" />
			PRO
		</Badge>
	);
}
