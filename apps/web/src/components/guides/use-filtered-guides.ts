import { useMemo } from "react";

import type { Guide } from "@repo/api-client";

import { useGuidesStore } from "@/store/guides-store";

export function useFilteredGuides(guides: Guide[]) {
	const filter = useGuidesStore((state) => state.filter);

	return useMemo(() => {
		let result = [...guides];

		if (filter === "draft") {
			result = result.filter((g) => g.status === "draft");
		} else if (filter === "published") {
			result = result.filter((g) => g.status === "published");
		} else if (filter === "archived") {
			result = result.filter((g) => g.status === "archived");
		}

		if (filter === "all") {
			result.sort((a, b) => {
				const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
				const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
				return dateB - dateA;
			});
		}

		return result;
	}, [guides, filter]);
}
