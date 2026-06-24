export function GuideTimelineSkeleton() {
	return (
		<div className="relative mt-10 flex flex-col gap-6">
			{[...Array(3)].map((_, i) => (
				<div
					key={i}
					className="flex flex-col gap-6 rounded-xl border bg-card py-6 shadow-sm"
				>
					<div className="flex items-center gap-3 px-6 pt-1">
						<div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
						<div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
					</div>
					<div className="px-6 pb-1">
						<div className="h-48 w-full animate-pulse rounded-lg bg-muted" />
					</div>
				</div>
			))}
		</div>
	);
}
