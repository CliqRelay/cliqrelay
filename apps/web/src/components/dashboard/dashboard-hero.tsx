import { useUserStore } from "@/stores";

export function DashboardHero() {
	const userName = useUserStore((s) => s.userName);

	return (
		<div className="mb-4">
			<p className="text-xl text-foreground">
				Hi,{" "}
				<span className="text-sky-500 font-medium">{userName ?? "there"}</span>{" "}
				👋
			</p>
			<h1 className="relative mt-1.5 text-2xl font-semibold tracking-tight text-foreground leading-tight">
				Ready to document your workflows?
			</h1>
		</div>
	);
}
