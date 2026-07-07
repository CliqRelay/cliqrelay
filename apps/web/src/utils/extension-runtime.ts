import { BridgeMessageTypes } from "@repo/data-commons";

const pendingRequests = new Map<
	string,
	{
		resolve: (value: unknown) => void;
		reject: (reason: unknown) => void;
		timer: ReturnType<typeof setTimeout>;
	}
>();

let messageIdCounter = 0;

function generateMessageId(): string {
	messageIdCounter++;
	return `cliqrelay_${Date.now()}_${messageIdCounter}`;
}

export function createExtensionRuntime() {
	function isAvailable(): boolean {
		if (typeof document === "undefined") {
			return false;
		}
		return document.documentElement.dataset.cliqrelayExtension === "true";
	}

	function sendMessage<T>(extensionId: string, msg: unknown): Promise<T> {
		if (typeof window === "undefined") {
			return Promise.reject(new Error("Not in a browser context"));
		}

		return new Promise<T>((resolve, reject) => {
			const messageId = generateMessageId();

			const timer = setTimeout(() => {
				pendingRequests.delete(messageId);
				reject(new Error("Extension runtime request timed out"));
			}, 5000);

			pendingRequests.set(messageId, { resolve: resolve as (value: unknown) => void, reject, timer });

			window.postMessage(
				{
					type: BridgeMessageTypes.REQUEST,
					messageId,
					extensionId,
					payload: msg,
				},
				window.location.origin,
			);
		});
	}

	function handleResponse(event: MessageEvent) {
		if (event.data?.type !== BridgeMessageTypes.RESPONSE) {
			return;
		}

		const { messageId, payload } = event.data;
		const pending = pendingRequests.get(messageId);
		if (!pending) {
			return;
		}

		clearTimeout(pending.timer);
		pendingRequests.delete(messageId);
		pending.resolve(payload);
	}

	if (typeof window !== "undefined") {
		window.addEventListener("message", handleResponse);
	}

	return { isAvailable, sendMessage };
}
