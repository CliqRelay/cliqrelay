export const generateCaptureId = (): string =>
	`capture_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export type GenerateCaptureId = typeof generateCaptureId;
