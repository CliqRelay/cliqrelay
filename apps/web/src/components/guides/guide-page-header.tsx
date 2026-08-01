import { FileText } from "lucide-react";

export function GuidePageHeader() {
	return (
		<div className="relative mb-6 flex items-start justify-between">
			<div>
				<div className="flex items-center gap-3">
					<FileText className="size-6 text-primary" strokeWidth={1.8} />
					<h1 className="text-[28px] font-semibold tracking-tight text-foreground leading-tight">
						Guides
					</h1>
				</div>
				<p className="mt-1.5 text-[13px] text-muted-foreground">
					Browse and manage all your captured guides.
				</p>
			</div>
		</div>
	);
}
