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

function getDirectSendMessage():
	| ((extensionId: string, message: unknown) => Promise<unknown>)
	| null {
	const chromeRuntime = (globalThis as any).chrome?.runtime;
	if (chromeRuntime?.sendMessage) {
		return chromeRuntime.sendMessage.bind(chromeRuntime);
	}
	const browserRuntime = (globalThis as any).browser?.runtime;
	if (browserRuntime?.sendMessage) {
		return browserRuntime.sendMessage.bind(browserRuntime);
	}
	return null;
}

export function createExtensionRuntime() {
	function isAvailable(): boolean {
		if (typeof document === "undefined") {
			return false;
		}
		if (getDirectSendMessage()) {
			return true;
		}
		return document.documentElement.dataset.cliqrelayExtension === "true";
	}

	function sendMessage<T>(extensionId: string, msg: unknown): Promise<T> {
		if (typeof window === "undefined") {
			return Promise.reject(new Error("Not in a browser context"));
		}

		const directSend = getDirectSendMessage();
		if (directSend) {
			return directSend(extensionId, msg) as Promise<T>;
		}

		return sendViaBridge<T>(extensionId, msg);
	}

	function sendViaBridge<T>(extensionId: string, msg: unknown): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const messageId = generateMessageId();

			const timer = setTimeout(() => {
				pendingRequests.delete(messageId);
				reject(new Error("Extension runtime request timed out"));
			}, 5000);

			pendingRequests.set(messageId, {
				resolve: resolve as (value: unknown) => void,
				reject,
				timer,
			});

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
