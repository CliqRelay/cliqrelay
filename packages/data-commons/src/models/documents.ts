import { z } from "zod";

export const exportFormatValues = ["pdf", "markdown", "html"] as const;
export const exportFormatSchema = z.enum(exportFormatValues);
export type ExportFormat = z.infer<typeof exportFormatSchema>;

const exportPayloadBaseShape = {
	guideId: z.uuid(),
	includeMedia: z.boolean().default(true),
	filename: z.string().min(1).optional(),
	revision: z.string().min(1).optional(),
} as const;

const createExportPayloadSchema = (format: ExportFormat) =>
	z.object({
		...exportPayloadBaseShape,
		format: z.literal(format),
	});

export const pdfExportPayloadSchema = createExportPayloadSchema("pdf");
export type PdfExportPayload = z.infer<typeof pdfExportPayloadSchema>;

export const markdownExportPayloadSchema =
	createExportPayloadSchema("markdown");
export type MarkdownExportPayload = z.infer<typeof markdownExportPayloadSchema>;

export const htmlExportPayloadSchema = createExportPayloadSchema("html");
export type HtmlExportPayload = z.infer<typeof htmlExportPayloadSchema>;

export const exportPayloadSchema = z.discriminatedUnion("format", [
	pdfExportPayloadSchema,
	markdownExportPayloadSchema,
	htmlExportPayloadSchema,
]);
export type ExportPayload = z.infer<typeof exportPayloadSchema>;
