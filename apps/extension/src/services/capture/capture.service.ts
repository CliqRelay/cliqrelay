import { debounce } from "es-toolkit";

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

const CONTROL_KEYS = new Set([
	"Escape",
	"Enter",
	"Tab",
	"Backspace",
	"ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
	"Home", "End", "PageUp", "PageDown", "Delete",
]);

const BUFFER_KEY_LABELS: Record<string, string> = {
	Escape: "Esc",
	Enter: "Enter",
	Tab: "Tab",
	Backspace: "Backspace",
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
	let lastSentText = "";

	const send = (payload: CaptureEventPayload) => {
		try {
			const result = sink({
				source: "content-script",
				type: CliqRelayEvents.CAPTURE_EVENT,
				payload,
			});
			if (result && typeof result === "object" && "catch" in result) {
				(result as Promise<void>).catch(() => {});
			}
		} catch {
			// sink failure is non-fatal
		}
	};

	const debouncedUpdate = debounce(() => {
		if (typingBuffer.length === 0) return;
		const text = formatBuffer(typingBuffer);
		if (text === lastSentText) return;
		lastSentText = text;
		send({
			action: "input",
			url: window.location.href,
			capturedAt: new Date().toISOString(),
			typedText: text,
		});
	}, TYPING_DEBOUNCE_MS);

	const flushTypingSession = () => {
		debouncedUpdate.flush();
		typingBuffer = [];
		lastSentText = "";
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === "Backspace") {
			typingBuffer.pop();
		} else if (event.key === " ") {
			const last = typingBuffer[typingBuffer.length - 1];
			if (last?.kind === "char" && last.value === " ") return;
			typingBuffer.push({ kind: "char", value: " " });
		} else if (event.key.length === 1) {
			typingBuffer.push({ kind: "char", value: event.key });
		} else {
			const label = BUFFER_KEY_LABELS[event.key];
			if (!label) return;
			typingBuffer.push({ kind: "special", label });
		}
		debouncedUpdate();
	};

	const handleEvent = (event: Event) => {
		try {
			if (event.type === "keydown" && event instanceof KeyboardEvent) {
				const action = getCaptureAction(event, event.target as Element | null);
				if (!action) return;

				const isModifierCombo = event.ctrlKey || event.altKey || event.metaKey;

				if (action === "keypress" && (isModifierCombo || typingBuffer.length === 0)) {
					flushTypingSession();
					const payload = buildCaptureEventPayload(event, window.location.href);
					if (payload) send(payload);
					return;
				}

				if (action === "keypress" && CONTROL_KEYS.has(event.key)) {
					handleKeydown(event);
					return;
				}

				if (action === "input") {
					handleKeydown(event);
					return;
				}

				return;
			}

			const isTabBlur =
				event.type === "blur" &&
				typingBuffer.length > 0 &&
				event.target instanceof Element &&
				!(event.target instanceof HTMLInputElement) &&
				!(event.target instanceof HTMLTextAreaElement) &&
				!((event.target as HTMLElement).isContentEditable);

			const isEnterClick =
				event.type === "click" &&
				event instanceof MouseEvent &&
				event.detail === 0 &&
				typingBuffer.length > 0;

			if (isTabBlur || isEnterClick) {
				return;
			}

			flushTypingSession();

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
		} catch (error) {
			console.warn("[capture] handleEvent failed:", error);
		}
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
