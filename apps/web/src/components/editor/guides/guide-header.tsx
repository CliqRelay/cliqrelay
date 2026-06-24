import { useState } from "react";

import type { Guide } from "@repo/api-client";

import { GuideEditableTitle } from "./guide-editable-title";
import { GuideEditableDescription } from "./guide-editable-description";
import { GuideMetadataCard } from "./guide-metadata-card";
import type { AppUser } from "@/models/auth";

type Props = {
	user: AppUser;
	guide: Guide;
	isEditMode: boolean;
	stepCount: number;
	onUpdateGuide?: (updates: {
		title?: string;
		description?: string | null;
	}) => void;
};

export function GuideHeader({
	user,
	guide,
	isEditMode,
	stepCount,
	onUpdateGuide,
}: Props) {
	const [editingGuideField, setEditingGuideField] = useState<
		"title" | "description" | null
	>(null);

	return (
		<div className="mb-6">
			<GuideEditableTitle
				title={guide.title}
				isEditMode={isEditMode}
				onUpdate={(title) => onUpdateGuide?.({ title })}
				isEditing={editingGuideField === "title"}
				onStartEditing={() => setEditingGuideField("title")}
				onStopEditing={() => setEditingGuideField(null)}
			/>

			<GuideEditableDescription
				description={guide.description ?? null}
				isEditMode={isEditMode}
				onUpdate={(description) => onUpdateGuide?.({ description })}
				isEditing={editingGuideField === "description"}
				onStartEditing={() => setEditingGuideField("description")}
				onStopEditing={() => setEditingGuideField(null)}
			/>

			<GuideMetadataCard user={user} guide={guide} stepCount={stepCount} />
		</div>
	);
}
