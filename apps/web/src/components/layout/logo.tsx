export function Logo({
	className = "",
	collapsed = false,
}: {
	className?: string;
	collapsed?: boolean;
}) {
	if (collapsed) {
		return (
			<div className="flex items-center justify-center w-full">
				<img
					src="/app-icon-logo.svg"
					alt="CliqRelay"
					className="size-6 rounded"
				/>
			</div>
		);
	}

	return (
		<div className="flex items-center">
			<img
				src="/app-logo-dark.png"
				alt="CliqRelay"
				className={`block dark:hidden h-10 w-auto ${className}`}
			/>
			<img
				src="/app-logo-light.png"
				alt="CliqRelay"
				className={`hidden dark:block h-10 w-auto ${className}`}
			/>
		</div>
	);
}
