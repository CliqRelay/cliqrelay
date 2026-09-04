// @vitest-environment jsdom
import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { extensionRegistry } from "@repo/extensions-sdk";

import { ExtensionSlotKeys } from "@/constants/extension-slots";
import type { AppUser } from "@/models/auth";

// The shell owns router-bound chrome (sidebar, top bar, mobile sheet) that is
// irrelevant here — stub it down to its children so the assertions are about
// what DashboardLayout composes.
vi.mock("./dashboard-shell", () => ({
	DashboardShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import { DashboardLayout } from "./dashboard-layout";

const user = { id: "user-1", metadata: {} } as AppUser;

describe("DashboardLayout", () => {
	beforeEach(() => {
		extensionRegistry.clear();
	});

	test("should render the registered banner slot above its children", () => {
		extensionRegistry.install({
			id: "banner-test",
			slots: [
				{
					name: ExtensionSlotKeys.DASHBOARD_BANNER,
					component: () => <div>Banner</div>,
				},
			],
			navItems: [],
		});

		const { container } = render(
			<DashboardLayout user={user}>
				<div>Page</div>
			</DashboardLayout>,
		);

		expect(screen.getByText("Banner")).toBeDefined();
		expect(container.textContent).toBe("BannerPage");
	});

	test("should render nothing extra when the banner slot is unregistered", () => {
		const { container } = render(
			<DashboardLayout user={user}>
				<div>Page</div>
			</DashboardLayout>,
		);

		expect(container.innerHTML).toBe("<div>Page</div>");
	});
});
