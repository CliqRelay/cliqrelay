import { z } from "zod";

export const boundingBoxSchema = z.object({
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
});
export type BoundingBox = z.infer<typeof boundingBoxSchema>;

export const elementMetadataSchema = z
	.object({
		selector: z.string().min(1).optional(),
		boundingBox: boundingBoxSchema.optional(),
		innerText: z.string().optional(),
		tagName: z.string().optional(),
		elementType: z.string().optional(),
		ariaLabel: z.string().optional(),
		placeholder: z.string().optional(),
		name: z.string().optional(),
		role: z.string().optional(),
		labelText: z.string().optional(),
		alt: z.string().optional(),
		checked: z.boolean().optional(),
		value: z.string().optional(),
	})
	.loose();
export type ElementMetadata = z.infer<typeof elementMetadataSchema>;

export const targetElementSchema = z
	.object({
		...elementMetadataSchema.shape,
		url: z.string().optional(),
		tabId: z.string().min(1).optional(),
		clickX: z.number().optional(),
		clickY: z.number().optional(),
		viewportWidth: z.number().optional(),
		viewportHeight: z.number().optional(),
		elementTag: z.string().nullable().optional(),
	})
	.loose();
export type TargetElement = z.infer<typeof targetElementSchema>;
