import { test, expect } from "@playwright/test";
import { attachScenarioEvidence, controlByLabel, createClient, hardRefresh, login, openNav, rowByText, selectByLabel, uniqueName } from "./helpers.js";

test("pipeline flow creates an opportunity, adds notes, and rolls up role revenue", async ({ page }, testInfo) => {
  const clientName = uniqueName("PW Client");
  const opportunityName = uniqueName("PW Opportunity");

  await login(page);
  await hardRefresh(page);
  await createClient(page, clientName);

  await openNav(page, "Pipeline");
  await page.getByRole("button", { name: "Add Opportunity" }).click();
  await expect(page.getByRole("heading", { name: "Create Opportunity" })).toBeVisible();

  await selectByLabel(page, "Client Name", clientName);
  await controlByLabel(page, "Project / Opportunity Name").fill(opportunityName);
  await selectByLabel(page, "Source of Opportunity", "Referral");
  await controlByLabel(page, "Deal Type").fill("Managed Services");
  await selectByLabel(page, "Stage", "Proposed");
  await controlByLabel(page, "Probability").fill("60");
  await selectByLabel(page, "Account Manager", "Rohan Account");
  await selectByLabel(page, "Delivery Manager", "Divya Delivery");

  await page.getByRole("button", { name: "Timeline & Financials" }).click();
  await controlByLabel(page, "Estimated Revenue").fill("120000");
  await controlByLabel(page, "Target Margin %").fill("35");
  await controlByLabel(page, "Expected Close").fill("2026-06-15");
  await controlByLabel(page, "Expected Start").fill("2026-07-01");
  await controlByLabel(page, "Expected End").fill("2026-12-31");

  await page.getByRole("button", { name: "Notes" }).click();
  await controlByLabel(page, "Engagement Summary Notes").fill("QA summary note");
  await controlByLabel(page, "Add Progress Note").fill("QA progress note for verification");
  await page.getByRole("button", { name: "Save Opportunity" }).click();

  await page.getByPlaceholder("Search client, project...").fill(opportunityName);
  const registerRow = await rowByText(page, opportunityName);
  await expect(registerRow).toContainText("$72,000");

  await registerRow.getByRole("button", { name: "View" }).click();
  await expect(page.getByRole("heading", { name: opportunityName })).toBeVisible();

  await page.getByRole("button", { name: "Roles" }).click();
  await page.getByRole("button", { name: "Add Role" }).click();
  await expect(page.getByRole("heading", { name: "Add Opportunity Role" })).toBeVisible();

  await controlByLabel(page, "Role Title").fill("QA FICO Consultant");
  await selectByLabel(page, "SAP Module", "SAP FICO");
  await selectByLabel(page, "SAP Sub-Module", "GL");
  await selectByLabel(page, "Role Location", "Offshore");
  await selectByLabel(page, "Engagement Type", "Full-Time");
  await controlByLabel(page, "Start Date").fill("2026-07-01");
  await controlByLabel(page, "Duration (Weeks)").fill("4");
  await controlByLabel(page, "Estimated Hours (Per Resource)").fill("320");
  await controlByLabel(page, "Bill Rate").fill("110");
  await controlByLabel(page, "Target Margin %").fill("35");
  await page.getByRole("button", { name: "Save Role" }).click();

  await expect(page).toHaveURL(/\/opportunities\/.+$/);
  await page.getByRole("button", { name: "Roles" }).click();
  await expect(page.locator("tbody tr").filter({ hasText: "QA FICO Consultant" }).first()).toContainText("Offshore");
  await expect(page.getByText("$35,200")).toBeVisible();

  await page.getByRole("button", { name: "Notes" }).click();
  await expect(page.getByText("QA progress note for verification")).toBeVisible();

  await attachScenarioEvidence(page, testInfo, {
    title: "Pipeline Flow",
    inputData: {
      clientName,
      opportunityName,
      source: "Referral",
      dealType: "Managed Services",
      stage: "Proposed",
      probability: 60,
      estimatedRevenue: 120000,
      targetMargin: 35,
      opportunityRole: {
        title: "QA FICO Consultant",
        module: "SAP FICO",
        subModule: "GL",
        location: "Offshore",
        estimatedHours: 320,
        billRate: 110
      }
    },
    outputData: {
      weightedValue: "$72,000",
      roleRevenue: "$35,200",
      noteVisible: "QA progress note for verification"
    }
  });
});
