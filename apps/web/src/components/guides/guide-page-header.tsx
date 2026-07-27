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
			<div
				aria-hidden
				className="pointer-events-none mt-1 flex-shrink-0 opacity-[0.10]"
			>
				<svg
					width="64"
					height="64"
					viewBox="0 0 64 64"
					fill="none"
					className="text-primary"
				>
					<path
						d="M8 48C16 32 28 24 40 28C52 32 56 20 56 12"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
						fill="none"
					/>
					<path
						d="M8 56C20 40 32 32 44 36C56 40 56 28 56 20"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						fill="none"
						opacity="0.5"
					/>
				</svg>
			</div>
		</div>
	);
}
