// @vitest-environment jsdom
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	test,
	vi,
} from "vitest";

const startMock = vi.fn();

vi.mock("wxt/browser", () => ({
	browser: {
		runtime: {
			sendMessage: vi.fn(),
			onMessage: {
				addListener: vi.fn(),
			},
		},
		storage: {
			local: vi.fn(),
		},
	},
}));

vi.mock("../services/capture/capture.service", () => ({
	createCaptureService: vi.fn(() => ({
		start: startMock,
	})),
}));

beforeAll(async () => {
	vi.stubGlobal(
		"defineContentScript",
		vi.fn((config: { main: () => void }) => {
			config.main();
		}),
	);

	await import("../entrypoints/content");
});

afterEach(() => {
	vi.restoreAllMocks();
});

afterAll(() => {
	vi.unstubAllGlobals();
});

describe("content script", () => {
	test("creates capture service and starts it", () => {
		expect(startMock).toHaveBeenCalledTimes(1);
	});
});
