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
import { buildKeyCombo } from "@/utils/action-text";
import { TYPING_DEBOUNCE_MS } from "@/utils/constants";

type BufferEntry =
	| { kind: "char"; value: string }
	| { kind: "special"; label: string };

const BUFFER_KEY_LABELS: Record<string, string> = {
	Escape: "Esc",
	Enter: "Enter",
	Tab: "Tab",
	ArrowUp: "Up",
	ArrowDown: "Down",
	ArrowLeft: "Left",
	ArrowRight: "Right",
	Delete: "Del",
	Home: "Home",
	End: "End",
	PageUp: "PgUp",
	PageDown: "PgDn",
};

const formatBuffer = (buffer: BufferEntry[]): string => {
	const parts: string[] = [];
	let word = "";
	for (const entry of buffer) {
		if (entry.kind === "char") {
			word += entry.value;
		} else {
			if (word) {
				parts.push(word);
				word = "";
			}
			parts.push(entry.label);
		}
	}
	if (word) parts.push(word);
	return parts.join(" ");
};

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

	if (event instanceof KeyboardEvent && action === "keypress") {
		payload.keyCombo = buildKeyCombo(event);
	}

	return payload;
};

export const createCaptureService = (sink: CaptureSink): CaptureService => {
	let typingBuffer: BufferEntry[] = [];
	let flushTimeout: ReturnType<typeof setTimeout> | null = null;

	const send = (payload: CaptureEventPayload) => {
		Promise.resolve(
			sink({
				source: "content-script",
				type: CliqRelayEvents.CAPTURE_EVENT,
				payload,
			}),
		).catch(() => { });
	};

	const flushTypingBuffer = () => {
		if (flushTimeout !== null) {
			clearTimeout(flushTimeout);
			flushTimeout = null;
		}
		if (typingBuffer.length === 0) {
			return;
		}
		const text = formatBuffer(typingBuffer);
		typingBuffer = [];
		send({
			action: "input",
			url: window.location.href,
			capturedAt: new Date().toISOString(),
			typedText: text,
		});
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === "Backspace") {
			typingBuffer.pop();
		} else if (event.key === " ") {
			const last = typingBuffer[typingBuffer.length - 1];
			if (last?.kind === "char" && last.value === " ") {
				return;
			}
			typingBuffer.push({ kind: "char", value: " " });
		} else if (event.key.length === 1) {
			typingBuffer.push({ kind: "char", value: event.key });
		} else {
			const label = BUFFER_KEY_LABELS[event.key];
			if (!label) {
				return;
			}
			typingBuffer.push({ kind: "special", label });
		}

		if (flushTimeout !== null) clearTimeout(flushTimeout);
		flushTimeout = setTimeout(flushTypingBuffer, TYPING_DEBOUNCE_MS);
	};

	const handleEvent = (event: Event) => {
		if (event.type === "keydown" && event instanceof KeyboardEvent) {
			const action = getCaptureAction(event, event.target as Element | null);
			if (!action) {
				return;
			}

			if (action === "keypress") {
				flushTypingBuffer();
				const payload = buildCaptureEventPayload(
					event,
					window.location.href,
				);
				if (payload) {
					send(payload);
				}
				return;
			}

			handleKeydown(event);
			return;
		}

		flushTypingBuffer();

		const payload = buildCaptureEventPayload(event, window.location.href);
		if (!payload) return;

		const navigationAnchor = getNavigationAnchor(
			event,
			event.target as Element | null,
		);

		if (navigationAnchor) {
			payload.navigationUrl = navigationAnchor.href;
			send(payload);
			return;
		}

		send(payload);
	};

	return {
		start: (root: Document = document) => {
			root.addEventListener("click", handleEvent, true);
			root.addEventListener("blur", handleEvent, true);
			root.addEventListener("change", handleEvent, true);
			root.addEventListener("keydown", handleEvent, true);

			return () => {
				root.removeEventListener("click", handleEvent, true);
				root.removeEventListener("blur", handleEvent, true);
				root.removeEventListener("change", handleEvent, true);
				root.removeEventListener("keydown", handleEvent, true);
			};
		},
	};
};
