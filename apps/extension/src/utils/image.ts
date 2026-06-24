import {
	THUMBNAIL_QUALITY,
	THUMBNAIL_WIDTH,
	WEBP_QUALITY,
} from "./constants";

export const dataUrlToBlob = (dataUrl: string): Blob => {
	const parts = dataUrl.split(",");
	const mimeMatch = parts[0].match(/:(.*?);/);
	const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
	const byteString = atob(parts[1]);
	const ab = new ArrayBuffer(byteString.length);
	const ia = new Uint8Array(ab);
	for (let i = 0; i < byteString.length; i++) {
		ia[i] = byteString.charCodeAt(i);
	}
	return new Blob([ab], { type: mimeType });
};

export const blobToDataUrl = (blob: Blob): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});

export const compressToWebP = async (
	dataUrl: string,
	quality = WEBP_QUALITY,
): Promise<Blob> => {
	const blob = dataUrlToBlob(dataUrl);
	const img = await createImageBitmap(blob);
	const canvas = new OffscreenCanvas(img.width, img.height);
	const ctx = canvas.getContext("2d")!;
	ctx.drawImage(img, 0, 0);
	return canvas.convertToBlob({ type: "image/webp", quality });
};

export const generateThumbnail = async (
	dataUrl: string,
	width = THUMBNAIL_WIDTH,
	quality = THUMBNAIL_QUALITY,
): Promise<string> => {
	const blob = dataUrlToBlob(dataUrl);
	const img = await createImageBitmap(blob);
	const aspectRatio = img.height / img.width;
	const thumbHeight = Math.round(width * aspectRatio);
	const canvas = new OffscreenCanvas(width, thumbHeight);
	const ctx = canvas.getContext("2d")!;
	ctx.drawImage(img, 0, 0, width, thumbHeight);
	const webpBlob = await canvas.convertToBlob({
		type: "image/webp",
		quality,
	});
	return blobToDataUrl(webpBlob);
};

export const processScreenshotForUpload = async (
	dataUrl: string,
): Promise<{ webpBlob: Blob; thumbnailBase64: string; width: number; height: number }> => {
	const blob = dataUrlToBlob(dataUrl);
	const img = await createImageBitmap(blob);
	const [webpBlob, thumbnailBase64] = await Promise.all([
		compressToWebP(dataUrl),
		generateThumbnail(dataUrl),
	]);
	return { webpBlob, thumbnailBase64, width: img.width, height: img.height };
};


