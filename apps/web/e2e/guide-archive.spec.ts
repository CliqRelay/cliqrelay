import { expect, test } from "@playwright/test";

import {
  createGuideOwner,
  createGuideWithSteps,
  getAuthCookies,
  getGuide,
  getGuideSteps,
  type GuideOwner,
} from "./support/seed";

const DEMO_GUIDE_TITLE = "Getting Started with CliqRelay";
const DEMO_STEP_COUNT = 5;

const DEMO_STEPS = [
  {
    type: "canvas" as const,
    canvas_content: {
      type: "header" as const,
      heading_text: "Overview of CliqRelay",
      body_text: "An introduction to this guide.",
    },
  },
  {
    type: "interaction" as const,
    action: "click",
    action_text: 'Click "Some Button"',
    notes: "This step demonstrates a click step.",
  },
  {
    type: "canvas" as const,
    canvas_content: {
      type: "tip" as const,
      heading_text: "This is a note",
      body_text: "Additional information or tips.",
    },
  },
  {
    type: "canvas" as const,
    canvas_content: {
      type: "callout" as const,
      heading_text: "Callout",
      body_text: "Draw attention to important information.",
    },
  },
  {
    type: "canvas" as const,
    canvas_content: {
      type: "alert" as const,
      heading_text: "Alert",
      body_text: "Highlight critical information.",
    },
  },
];

let owner: GuideOwner;

test.beforeAll(async () => {
  owner = await createGuideOwner();
});

test.afterAll(async () => {
  await owner.api.dispose();
});

test("exports a guide ZIP and imports it as a new draft guide", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(120_000);
  const guideId = await createGuideWithSteps(owner, {
    title: DEMO_GUIDE_TITLE,
    description: "A sample guide to show how CliqRelay works",
    metadata: { source: "e2e", marker: "guide-zip-backup" },
    steps: DEMO_STEPS,
  });

  await context.addCookies(await getAuthCookies(owner));
  await page.goto(`/dashboard/guides/${guideId}`);

  if (new URL(page.url()).pathname.startsWith("/auth/")) {
    test.skip(
      true,
      "Dashboard E2E requires an email-verified user. Configure E2E auth fixtures or disable email verification in the test environment.",
    );
  }

  await expect(page.getByRole("heading", { name: DEMO_GUIDE_TITLE }).first()).toBeVisible();

  await page.getByRole("button", { name: "Guide actions" }).click();
  await page.getByRole("menuitem", { name: "Export" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /ZIP backup/ })
    .click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("dialog").getByRole("button", { name: "Download ZIP backup" }).click();
  const download = await downloadPromise;
  const zipPath = testInfo.outputPath("guide-backup.zip");
  await download.saveAs(zipPath);

  await page.goto("/dashboard/guides");
  await page.getByRole("button", { name: "Import backup" }).click();

  const importDialog = page.getByRole("dialog");
  await importDialog.locator('input[type="file"]').setInputFiles(zipPath);
  await expect(
    importDialog.getByText(`Imported ${DEMO_STEP_COUNT} of ${DEMO_STEP_COUNT} steps.`),
  ).toBeVisible({ timeout: 60_000 });

  await importDialog.getByRole("button", { name: "Open guide" }).click();
  await expect(page).toHaveURL(/\/dashboard\/guides\/[^/]+$/);

  const importedId = new URL(page.url()).pathname.split("/").at(-1);
  expect(importedId).toBeTruthy();

  const importedGuide = await getGuide(owner, importedId!);
  expect(importedGuide.title).toBe(DEMO_GUIDE_TITLE);
  expect(importedGuide.metadata).toEqual({
    source: "e2e",
    marker: "guide-zip-backup",
  });
  expect(importedGuide.status).toBe("draft");
  expect(importedGuide.visibility).toBe("private");

  const importedSteps = await getGuideSteps(owner, importedId!);
  expect(importedSteps).toHaveLength(DEMO_STEP_COUNT);
});
