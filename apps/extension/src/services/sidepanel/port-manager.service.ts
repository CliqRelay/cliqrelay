import type { SidePanelPushMessage, SidePanelStateUpdate } from "@/models";

export type BroadcastFn = (message: SidePanelPushMessage) => void;
export type PortManager = ReturnType<typeof createPortManager>;

export const createPortManager = (
	getCurrentState: () => Promise<SidePanelStateUpdate>,
) => {
	let ports: {
		name: string;
		postMessage: (message: unknown) => void;
		onDisconnect: { addListener: (cb: () => void) => void };
	}[] = [];

	const registerPort = async (port: {
		name: string;
		postMessage: (message: unknown) => void;
		onDisconnect: { addListener: (cb: () => void) => void };
	}) => {
		ports.push(port);
		const state = await getCurrentState();
		try {
			port.postMessage({ type: "state_update", state });
		} catch {
			unregisterPort(port);
		}

		port.onDisconnect.addListener(() => {
			unregisterPort(port);
		});
	};

	const unregisterPort = (port: {
		name: string;
		postMessage: (message: unknown) => void;
		onDisconnect: { addListener: (cb: () => void) => void };
	}) => {
		ports = ports.filter((p) => p !== port);
	};

	const broadcast = (message: SidePanelPushMessage) => {
		for (const port of [...ports]) {
			try {
				port.postMessage(message);
			} catch {
				unregisterPort(port);
			}
		}
	};

	return { registerPort, unregisterPort, broadcast };
};
