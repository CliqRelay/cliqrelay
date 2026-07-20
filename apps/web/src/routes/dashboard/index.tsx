import { createFileRoute } from "@tanstack/react-router";
import { Clock, FileText } from "lucide-react";

import { api } from "@repo/api-client";
import { formatTimeSaved } from "@repo/data-commons";
import { ExtensionSlot } from "@repo/extensions-sdk";

import { Kpi, OnboardingChecklist } from "@/components/dashboard";

export const Route = createFileRoute("/dashboard/")({
	component: DashboardPage,
});

function DashboardPage() {
	const guidesCountQuery = api.guides.useGetGuidesCount({
		request: { credentials: "include" },
	});

	const timeSaved = guidesCountQuery.data?.count
		? formatTimeSaved(guidesCountQuery.data.count * 15)
		: "N/A";

	return (
		<div className="space-y-6 p-6">
			<OnboardingChecklist />

			<ExtensionSlot name="testcomp" />

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Kpi
					icon={FileText}
					label="Total Guides"
					value={
						guidesCountQuery.data ? `${guidesCountQuery.data.count} Guides` : ""
					}
					isLoading={guidesCountQuery.isLoading}
				/>
				<Kpi
					icon={Clock}
					label="Time Saved"
					value={timeSaved}
					isLoading={guidesCountQuery.isLoading}
				/>
			</div>
		</div>
	);
}
