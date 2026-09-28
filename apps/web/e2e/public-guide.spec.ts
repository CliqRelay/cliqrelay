import { expect, test } from "@playwright/test";

import { createDemoGuide, createGuideOwner, type GuideOwner } from "./support/seed";

const DEMO_GUIDE_TITLE = "Getting Started with CliqRelay";

let owner: GuideOwner;

test.beforeAll(async () => {
  owner = await createGuideOwner();
});

test.afterAll(async () => {
  await owner.api.dispose();
});

test("signed-out visitor can view a public published guide from its dashboard link", async ({
  page,
}) => {
  const guideId = await createDemoGuide(owner, { visibility: "public", published: true });

  await page.goto(`/dashboard/guides/${guideId}`);

  await expect(page).toHaveURL(`/guides/${guideId}`);
  await expect(page.getByRole("heading", { name: DEMO_GUIDE_TITLE })).toBeVisible();
  await expect(page.getByText("Overview of CliqRelay")).toBeVisible();
});

for (const { name, visibility, published } of [
  { name: "a private guide", visibility: "private", published: true },
  { name: "a public draft", visibility: "public", published: false },
] as const) {
  test(`signed-out visitor cannot view ${name}`, async ({ page }) => {
    const guideId = await createDemoGuide(owner, { visibility, published });

    await page.goto(`/dashboard/guides/${guideId}`);

    await expect(page).toHaveURL(`/guides/${guideId}`);
    await expect(page.getByRole("heading", { name: "Guide unavailable" })).toBeVisible();
    await expect(page.getByText(DEMO_GUIDE_TITLE)).toBeHidden();
  });
}
