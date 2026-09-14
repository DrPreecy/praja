import { test, expect } from "@playwright/test";
test("a person can create, pause, record and export real persisted project work", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  const name = "Field notes " + Date.now();
  await page.getByLabel("Project name").fill(name);
  await page
    .getByLabel("Initial idea")
    .fill("A place for observations during fieldwork.");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A clear next step" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Workspace", exact: true }).click();
  await page.getByLabel("Session title").fill("Offline questions");
  await page
    .getByLabel("Your working notes")
    .fill("Will researchers need offline access?");
  await page.getByRole("button", { name: "Save & pause" }).click();
  await expect(page.getByText("Saving / working…")).not.toBeVisible();
  await page.getByRole("button", { name: "Make a record" }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Do researchers need offline access?");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(
    page.getByRole("button", {
      name: /question Do researchers need offline access/,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delivery", exact: true }).click();
  await page.getByRole("button", { name: "Define a work scope" }).click();
  await page.getByLabel("Title", { exact: true }).fill("Save a field note");
  await page
    .getByLabel("Statement / description")
    .fill("Allow the researcher to save a text observation.");
  await page
    .getByLabel("Observable acceptance criteria")
    .fill("A saved note remains visible after reloading.");
  await page.getByRole("button", { name: "Save record" }).click();
  await page.getByRole("button", { name: "Delivery", exact: true }).click();
  await page.getByRole("button", { name: "Approve handoff" }).click();
  await expect(page.getByText("Current snapshot")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Markdown" }).click();
  expect((await download).suggestedFilename()).toMatch(/^praja-/);
  await page.reload();
  await page.getByLabel("Select project").selectOption({ label: name });
  await page.getByRole("button", { name: /^Knowledge/ }).click();
  await expect(
    page.getByRole("button", { name: /scope Save a field note/ }),
  ).toBeVisible();
});
