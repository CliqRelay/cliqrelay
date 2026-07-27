import { Button } from "@/components/ui/button";
import { envClient } from "@/constants/env-client";

export function LearnAboutProButton() {
	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			onClick={() => window.open(envClient.siteUrl)}
		>
			Learn More
		</Button>
	);
}
