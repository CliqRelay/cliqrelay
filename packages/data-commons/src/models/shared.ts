import { z } from "zod";

export const timestamp = () =>
	z.union([z.date().transform((d) => d.toISOString()), z.iso.datetime()]);

export const urlContextSchema = z.object({
	url: z.url(),
	tabId: z.string().min(1),
});
export type UrlContext = z.infer<typeof urlContextSchema>;
