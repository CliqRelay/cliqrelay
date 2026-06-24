import { afterEach, describe, expect, test, vi } from "vitest";

import { createPortManager } from "./port-manager.service";

const createMockPort = () => ({
	name: "test-port",
	postMessage: vi.fn(),
	onDisconnect: {
		addListener: vi.fn(),
		removeListener: vi.fn(),
		hasListeners: vi.fn(),
	},
	onMessage: {
		addListener: vi.fn(),
		removeListener: vi.fn(),
		hasListeners: vi.fn(),
	},
	sender: undefined,
	error: undefined,
});

describe("PortManager", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("registerPort", () => {
		test("sends current state via postMessage on registration", async () => {
			const mockState = {
				status: "idle" as const,
				bufferedCount: 0,
				uploadQueue: { pending: 0, inProgress: 0, failed: 0, completed: 0 },
				activeGuideId: null,
			};
			const getCurrentState = vi.fn().mockResolvedValue(mockState);
			const manager = createPortManager(getCurrentState);
			const port = createMockPort();

			await manager.registerPort(port);

			expect(getCurrentState).toHaveBeenCalledTimes(1);
			expect(port.postMessage).toHaveBeenCalledWith({
				type: "state_update",
				state: mockState,
			});
		});

		test("registers disconnect listener on port", async () => {
			const getCurrentState = vi.fn().mockResolvedValue({} as any);
			const manager = createPortManager(getCurrentState);
			const port = createMockPort();

			await manager.registerPort(port);

			expect(port.onDisconnect.addListener).toHaveBeenCalledTimes(1);
		});
	});

	describe("broadcast", () => {
		test("sends message to all registered ports", async () => {
			const getCurrentState = vi.fn().mockResolvedValue({} as any);
			const manager = createPortManager(getCurrentState);
			const port1 = createMockPort();
			const port2 = createMockPort();

			await manager.registerPort(port1);
			await manager.registerPort(port2);

			const message = {
				type: "upload_progress" as const,
				queue: { pending: 1, inProgress: 0, failed: 0, completed: 0 },
			};
			manager.broadcast(message);

			expect(port1.postMessage).toHaveBeenCalledWith(message);
			expect(port2.postMessage).toHaveBeenCalledWith(message);
		});

		test("removes ports that throw on postMessage", async () => {
			const getCurrentState = vi.fn().mockResolvedValue({} as any);
			const manager = createPortManager(getCurrentState);
			const validPort = createMockPort();
			const badPort = createMockPort();
			badPort.postMessage = vi.fn().mockImplementation(() => {
				throw new Error("disconnected");
			});

			await manager.registerPort(validPort);
			await manager.registerPort(badPort);

			const message = {
				type: "upload_progress" as const,
				queue: { pending: 1, inProgress: 0, failed: 0, completed: 0 },
			};
			manager.broadcast(message);

			expect(validPort.postMessage).toHaveBeenCalledWith(message);
		});
	});

	describe("unregisterPort", () => {
		test("removes port from the list so it no longer receives broadcasts", async () => {
			const getCurrentState = vi.fn().mockResolvedValue({} as any);
			const manager = createPortManager(getCurrentState);
			const port = createMockPort();

			await manager.registerPort(port);
			vi.mocked(port.postMessage).mockClear();

			manager.unregisterPort(port);

			const message = {
				type: "upload_progress" as const,
				queue: { pending: 0, inProgress: 0, failed: 0, completed: 1 },
			};
			manager.broadcast(message);

			expect(port.postMessage).not.toHaveBeenCalled();
		});
	});
});
