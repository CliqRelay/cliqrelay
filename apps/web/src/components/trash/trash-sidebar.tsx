import { Trash2 } from "lucide-react";

type Props = {
	guideCount: number;
};

export function TrashSidebar({ guideCount }: Props) {
	return (
		<div className="flex flex-col gap-5">
			<div className="relative overflow-hidden rounded-[20px] bg-surface-1 p-6 text-center border border-(--trash-card-border) shadow-(--trash-card-shadow)">
				<div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center_top,var(--trash-purple-ambient)_0%,transparent_60%)]" />
				<div className="relative flex flex-col items-center">
					<div className="relative mb-5 mt-1">
						<Trash2 className="relative z-10 size-14 text-primary" />
						<div className="absolute inset-0 scale-[2] blur-2xl pointer-events-none bg-[radial-gradient(circle,var(--trash-purple-glow)_0%,transparent_60%)]" />
					</div>
					<span className="text-[48px] font-bold tracking-[-0.03em] text-foreground leading-none">
						{guideCount}
					</span>
					<p className="mt-2 text-[13px] font-medium text-muted-foreground/70">
						items in trash
					</p>
					<p className="mt-3 text-[12px] text-muted-foreground/50 leading-relaxed max-w-52.5">
						Items are kept here for 30 days before being permanently removed.
					</p>
				</div>
			</div>
		</div>
	);
}
