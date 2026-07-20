import type { StepAction } from "@repo/api-client";

import type { TargetElement } from "@/models";

export const mapCaptureActionToReadableAction = (
	action: StepAction,
): string => {
	switch (action) {
		case "click":
			return "Click";
		case "input":
			return "Type";
		case "navigation":
			return "Navigate to";
		case "keypress":
			return "Keypress";
	}
};

const CONTROL_KEY_LABELS: Record<string, string> = {
	Escape: "ESC",
	Enter: "ENTER",
	ArrowUp: "UP",
	ArrowDown: "DOWN",
	ArrowLeft: "LEFT",
	ArrowRight: "RIGHT",
	Delete: "DEL",
	Backspace: "BACKSPACE",
	Home: "HOME",
	End: "END",
	PageUp: "PGUP",
	PageDown: "PGDN",
};

export const buildKeyCombo = (event: KeyboardEvent): string => {
	const parts: string[] = [];
	if (event.ctrlKey) parts.push("CTRL");
	if (event.shiftKey) parts.push("SHIFT");
	if (event.altKey) parts.push("ALT");
	if (event.metaKey) parts.push("META");
	parts.push(CONTROL_KEY_LABELS[event.key] ?? event.key.toUpperCase());
	return parts.join(" + ");
};

const truncateText = (text: string, maxLength = 80): string => {
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength).trimEnd()}...`;
};

export const buildActionText = (
	action: StepAction,
	targetElement?: TargetElement | null,
	typedText?: string | null,
	keyCombo?: string | null,
): string | undefined => {
	if (action === "keypress" && keyCombo) {
		return `Pressed "${keyCombo}"`;
	}

	if (action === "input" && typedText) {
		return `Type "${truncateText(typedText)}"`;
	}

	if (!targetElement) {
		return undefined;
	}

	const readableAction = mapCaptureActionToReadableAction(action);

	const {
		tagName,
		elementType,
		ariaLabel,
		innerText,
		placeholder,
		name,
		labelText,
		alt,
		role,
		value,
	} = targetElement;

	const formatLabel = (label: string) =>
		`${readableAction} "${truncateText(label)}"`;

	if (ariaLabel) {
		return formatLabel(ariaLabel);
	}

	if (action === "click") {
		if (tagName === "BUTTON" && innerText) {
			return formatLabel(innerText);
		}

		if (tagName === "INPUT") {
			if (
				elementType === "submit" ||
				elementType === "button" ||
				elementType === "reset"
			) {
				if (value) {
					return formatLabel(value);
				}
			}

			if (elementType === "checkbox" || elementType === "radio") {
				if (labelText) {
					return formatLabel(labelText);
				}
				if (name) {
					return formatLabel(name);
				}
			}

			if (labelText) {
				return `${formatLabel(labelText)} field`;
			}
			if (placeholder) {
				return `${formatLabel(placeholder)} field`;
			}
			if (name) {
				return `${formatLabel(name)} field`;
			}
		}

		if (tagName === "SELECT") {
			if (labelText) {
				return formatLabel(labelText);
			}
			if (name) {
				return formatLabel(name);
			}
		}

		if (tagName === "TEXTAREA") {
			if (labelText) {
				return formatLabel(labelText);
			}
			if (placeholder) {
				return formatLabel(placeholder);
			}
			if (name) {
				return formatLabel(name);
			}
		}

		if (tagName === "A" && innerText) {
			return formatLabel(innerText);
		}

		if (tagName === "IMG" && alt) {
			return formatLabel(alt);
		}

		if (role === "checkbox" || role === "switch") {
			if (labelText) {
				return formatLabel(labelText);
			}
			if (name) {
				return formatLabel(name);
			}
		}

		if (innerText) {
			return formatLabel(innerText);
		}
	}

	if (action === "input") {
		if (value && labelText) {
			return `${readableAction} "${truncateText(value)}" in "${truncateText(labelText)}" Field`;
		}
		if (value) {
			return formatLabel(value);
		}
		if (labelText) {
			return formatLabel(labelText);
		}
		if (placeholder) {
			return formatLabel(placeholder);
		}
		if (name) {
			return formatLabel(name);
		}
		if (innerText) {
			return formatLabel(innerText);
		}
	}

	return undefined;
};
