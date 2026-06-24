import { CliqRelayEvents } from "@repo/data-commons";

import type {
	CaptureEventPayload,
	CaptureService,
	CaptureSink,
} from "@/models";
import {
	getCaptureAction,
	getEventTargetElement,
	getNavigationAnchor,
} from "@/utils/dom";

export const buildCaptureEventPayload = (
	event: Event,
	url: string,
	capturedAt = new Date().toISOString(),
): CaptureEventPayload | null => {
	const action = getCaptureAction(event, event.target as Element | null);
	if (!action) {
		return null;
	}

	const payload: CaptureEventPayload = {
		action,
		url,
		capturedAt,
		targetElement: getEventTargetElement(event.target, url),
	};

	if (event instanceof MouseEvent) {
		const target = event.target as Element | null;
		payload.targetElement = {
			...payload.targetElement,
			clickX: event.clientX,
			clickY: event.clientY,
			viewportWidth: window.innerWidth,
			viewportHeight: window.innerHeight,
			elementTag: target?.tagName?.toLowerCase() ?? null,
		};
	}

	return payload;
};

export const createCaptureService = (sink: CaptureSink): CaptureService => {
	const handleEvent = (event: Event) => {
		const payload = buildCaptureEventPayload(event, window.location.href);
		if (!payload) {
			return;
		}

		const navigationAnchor = getNavigationAnchor(
			event,
			event.target as Element | null,
		);

		if (navigationAnchor) {
			payload.navigationUrl = navigationAnchor.href;
			Promise.resolve(
				sink({
					source: "content-script",
					type: CliqRelayEvents.CAPTURE_EVENT,
					payload,
				}),
			).catch(() => {});
			return;
		}

		Promise.resolve(
			sink({
				source: "content-script",
				type: CliqRelayEvents.CAPTURE_EVENT,
				payload,
			}),
		).catch(() => {});
	};

	return {
		start: (root: Document = document) => {
			root.addEventListener("click", handleEvent, true);
			root.addEventListener("blur", handleEvent, true);
			root.addEventListener("change", handleEvent, true);

			return () => {
				root.removeEventListener("click", handleEvent, true);
				root.removeEventListener("blur", handleEvent, true);
				root.removeEventListener("change", handleEvent, true);
			};
		},
	};
};
