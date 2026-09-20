import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, within } from "storybook/test";

import { GuideEditableTitle } from "./guide-editable-title";

const meta = {
  title: "Editor/Guides/GuideEditableTitle",
  component: GuideEditableTitle,
  args: {
    title: "My guide",
    isEditMode: true,
    onUpdate: fn(),
    isEditing: false,
    onStartEditing: fn(),
    onStopEditing: fn(),
  },
} satisfies Meta<typeof GuideEditableTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

function StaleRefetchHarness({ staleTitle }: { staleTitle: string }) {
  const [title, setTitle] = useState("My guide");
  const [isEditing, setIsEditing] = useState(false);
  return (
    <>
      <GuideEditableTitle
        title={title}
        isEditMode
        onUpdate={fn()}
        isEditing={isEditing}
        onStartEditing={() => setIsEditing(true)}
        onStopEditing={() => setIsEditing(false)}
      />
      {/* mousedown is prevented so the input keeps focus, mirroring a refetch landing mid-typing */}
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          setTitle(staleTitle);
        }}
      >
        Simulate stale refetch
      </button>
    </>
  );
}

export const ViewMode: Story = {
  args: { isEditMode: false },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("heading")).toHaveTextContent("My guide");
  },
};

export const KeepsTypingWhenServerRefetchesStaleValue: Story = {
  render: () => <StaleRefetchHarness staleTitle="abc" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("heading"));
    const input = canvas.getByRole("textbox");

    await userEvent.clear(input);
    await userEvent.type(input, "abcdef");

    await userEvent.click(canvas.getByRole("button", { name: "Simulate stale refetch" }));

    await expect(input).toHaveFocus();
    await expect(input).toHaveValue("abcdef");
  },
};
