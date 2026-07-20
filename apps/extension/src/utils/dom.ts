import type { StepAction } from "@repo/api-client";

import type { TargetElement } from "@/models";

const escapeAttributeValue = (value: string) =>
	value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');

export const getSelector = (element: Element) => {
	const dataTestId = element.getAttribute("data-testid");
	if (dataTestId) {
		return `${element.tagName.toLowerCase()}[data-testid="${escapeAttributeValue(dataTestId)}"]`;
	}

	const id = element.getAttribute("id");
	if (id) {
		return `${element.tagName.toLowerCase()}[id="${escapeAttributeValue(id)}"]`;
	}

	const name = element.getAttribute("name");
	if (name) {
		return `${element.tagName.toLowerCase()}[name="${escapeAttributeValue(name)}"]`;
	}

	return element.tagName.toLowerCase();
};

const getLabelText = (element: Element): string | undefined => {
	if (element.id) {
		const label = element.ownerDocument?.querySelector(
			`label[for="${element.id}"]`,
		);
		if (label?.textContent) {
			return label.textContent.replace(/\s+/g, " ").trim();
		}
	}

	const parentLabel = element.closest("label");
	if (parentLabel?.textContent) {
		const labelText = parentLabel.textContent
			.replace(element.textContent ?? "", "")
			.replace(/\s+/g, " ")
			.trim();

		if (labelText) {
			return labelText;
		}
	}

	return undefined;
};

const getElementText = (element: Element): string => {
	// Faster path for HTMLElement — respects CSS visibility, excludes layout-hidden text
	if (element instanceof HTMLElement) {
		const text = element.innerText;
		if (text) {
			return text;
		}
	}
	// Fallback: walk the subtree collecting text, excluding <script> and <style>
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
		acceptNode: (node) => {
			const { parentElement } = node as Text;
			if (
				parentElement?.tagName === "SCRIPT" ||
				parentElement?.tagName === "STYLE"
			) {
				return NodeFilter.FILTER_REJECT;
			}
			return NodeFilter.FILTER_ACCEPT;
		},
	});
	const results: string[] = [];
	let node = walker.nextNode() as Text | null;
	while (node) {
		results.push(node.textContent ?? "");
		node = walker.nextNode() as Text | null;
	}
	return results.join("");
};

export const getCaptureAction = (
	event: Event,
	targetElement: Element | null,
): StepAction | null => {
	if (event.type === "click") {
		return "click";
	}

	if (
		event.type === "blur" &&
		targetElement instanceof HTMLInputElement
	) {
		return "input";
	}

	if (
		event.type === "blur" &&
		targetElement instanceof HTMLTextAreaElement
	) {
		return "input";
	}

	if (
		event.type === "blur" &&
		targetElement instanceof HTMLElement &&
		targetElement.isContentEditable
	) {
		return "input";
	}

	if (event.type === "change" && targetElement instanceof HTMLSelectElement) {
		return "input";
	}

	if (event.type === "keydown" && event instanceof KeyboardEvent) {
		if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) return null;

		const el = event.target as Element | null;
		const isInputField =
			el instanceof HTMLInputElement ||
			el instanceof HTMLTextAreaElement ||
			(el instanceof HTMLElement && el.isContentEditable);
		if (isInputField) return null;

		if (event.ctrlKey || event.altKey || event.metaKey) return "keypress";

		const controlKeys = new Set([
			"Escape",
			"Enter",
			"F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
			"ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
			"Home", "End", "PageUp", "PageDown", "Delete", "Backspace",
		]);
		if (controlKeys.has(event.key)) return "keypress";

		if (event.key.length === 1) return "input";

		return null;
	}

	return null;
};

export const getEventTargetElement = (
	target: EventTarget | null,
	url: string,
): TargetElement | undefined => {
	if (!(target instanceof Element)) {
		return undefined;
	}

	const selector = getSelector(target);
	const boundingBox =
		"getBoundingClientRect" in target
			? target.getBoundingClientRect()
			: undefined;

	const tagName = target.tagName;
	const isInput = target instanceof HTMLInputElement;
	const isTextarea = target instanceof HTMLTextAreaElement;

	return {
		selector,
		boundingBox: boundingBox
			? {
					x: boundingBox.x,
					y: boundingBox.y,
					width: boundingBox.width,
					height: boundingBox.height,
				}
			: undefined,
		innerText: getElementText(target).replace(/\s+/g, " ").trim() || undefined,
		tagName,
		elementType: isInput ? target.type : undefined,
		ariaLabel: target.getAttribute("aria-label") || undefined,
		placeholder:
			isInput || isTextarea
				? (target as HTMLInputElement | HTMLTextAreaElement).placeholder ||
					undefined
				: undefined,
		name: target.getAttribute("name") || undefined,
		role: target.getAttribute("role") || undefined,
		labelText: getLabelText(target),
		alt:
			target instanceof HTMLImageElement ? target.alt || undefined : undefined,
		value:
			isInput && target.type !== "password"
				? target.value || undefined
				: undefined,
		checked:
			isInput && (target.type === "checkbox" || target.type === "radio")
				? target.checked
				: undefined,
		url,
	};
};

export const getNavigationAnchor = (
	event: Event,
	target: Element | null,
): HTMLAnchorElement | null => {
	if (event.type !== "click" || !(event instanceof MouseEvent)) return null;
	if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey)
		return null;

	let el: Element | null = target;
	while (el) {
		if (el instanceof HTMLAnchorElement && el.href) {
			try {
				const href = new URL(el.href);
				if (href.href !== window.location.href) return el;
			} catch {
				// invalid URL — skip
			}
		}
		el = el.parentElement;
	}
	return null;
};
