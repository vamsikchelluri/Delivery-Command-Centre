import { expect } from "@playwright/test";

export function uniqueName(prefix) {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  return `${prefix} ${stamp}`;
}

export async function login(page) {
  await page.goto("/");
  if (await page.getByRole("button", { name: "Sign in" }).isVisible().catch(() => false)) {
    await page.getByLabel("Email").fill("coo@dcc.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign in" }).click();
  }
  await expect(page.getByRole("link", { name: "Clients" })).toBeVisible();
}

export async function hardRefresh(page) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Clients" })).toBeVisible();
}

export async function openNav(page, label) {
  await page.getByRole("link", { name: label }).click();
}

export function controlByLabel(page, label) {
  return page.locator("label").filter({ has: page.locator("span", { hasText: label }) }).locator("input, select, textarea").first();
}

export async function selectByLabel(page, label, optionText) {
  await controlByLabel(page, label).selectOption({ label: optionText });
}

export async function rowByText(page, text) {
  return page.locator("tbody tr").filter({ hasText: text }).first();
}

export async function createClient(page, clientName) {
  await openNav(page, "Clients");
  await page.getByRole("button", { name: "Add Client" }).click();
  await expect(page.getByRole("heading", { name: "Create Client" })).toBeVisible();
  await controlByLabel(page, "Client Name").fill(clientName);
  await selectByLabel(page, "Client Status", "Active");
  await controlByLabel(page, "Industry").fill("Technology");
  await controlByLabel(page, "Region").fill("India");
  await controlByLabel(page, "Contact Person").fill("QA Contact");
  await controlByLabel(page, "Contact Email").fill("qa.client@example.com");
  await controlByLabel(page, "Contact Phone").fill("9999999999");
  await page.getByRole("button", { name: "Save Client" }).click();
  await expect(await rowByText(page, clientName)).toBeVisible();
}

export async function attachScenarioEvidence(page, testInfo, { title, inputData, outputData }) {
  const screenshot = await page.screenshot({ fullPage: true });
  const summary = [
    `# ${title}`,
    "",
    "## Input Data",
    "```json",
    JSON.stringify(inputData, null, 2),
    "```",
    "",
    "## Observed Output",
    "```json",
    JSON.stringify(outputData, null, 2),
    "```"
  ].join("\n");

  await testInfo.attach("scenario-summary", {
    body: summary,
    contentType: "text/markdown"
  });

  await testInfo.attach("scenario-data", {
    body: JSON.stringify({ title, inputData, outputData }, null, 2),
    contentType: "application/json"
  });

  await testInfo.attach("final-ui", {
    body: screenshot,
    contentType: "image/png"
  });
}
