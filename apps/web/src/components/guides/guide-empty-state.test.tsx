/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { GuideEmptyState } from "./guide-empty-state";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
	}: {
		children: React.ReactNode;
		to: string;
		className?: string;
	}) => <a href={to}>{children}</a>,
}));

describe("GuideEmptyState", () => {
	test("renders the empty state message", () => {
		render(<GuideEmptyState />);
		expect(screen.getByText("No guides yet")).toBeDefined();
	});

	test("renders the create button", () => {
		render(<GuideEmptyState />);
		const button = screen.getByText("Create your first guide");
		expect(button).toBeDefined();
	});

	test("renders description text", () => {
		render(<GuideEmptyState />);
		expect(
			screen.getByText(/Create your first guide to start documenting/),
		).toBeDefined();
	});
});
