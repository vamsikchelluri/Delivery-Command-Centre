import { test, expect } from "@playwright/test";
import { attachScenarioEvidence, controlByLabel, createClient, hardRefresh, login, openNav, rowByText, selectByLabel, uniqueName } from "./helpers.js";

test("sow flow persists commercials, adds a role, and shows role-aware assignment candidates", async ({ page }, testInfo) => {
  const clientName = uniqueName("PW Client");
  const sowName = uniqueName("PW SOW");
  const resourceFirstName = `PWBasis${Date.now().toString().slice(-6)}`;
  const resourceLastName = "Onsite";
  const resourceFullName = `${resourceFirstName} ${resourceLastName}`;

  await login(page);
  await hardRefresh(page);
  await createClient(page, clientName);

  await openNav(page, "Resources");
  await page.getByRole("button", { name: "Add Resource" }).click();
  await expect(page.getByRole("heading", { name: "Create Resource" })).toBeVisible();
  await controlByLabel(page, "First Name").fill(resourceFirstName);
  await controlByLabel(page, "Last Name").fill(resourceLastName);
  await controlByLabel(page, "Contact Email").fill("qa.basis.onsite@example.com");
  await controlByLabel(page, "Contact Number").fill("9000000002");
  await selectByLabel(page, "Primary SAP Module", "SAP Basis");
  await selectByLabel(page, "Primary Sub-Module", "S/4 Upgrade");
  await selectByLabel(page, "Location", "USA");
  await selectByLabel(page, "Location Type", "Onsite");
  await selectByLabel(page, "Engagement Type", "Full-Time");
  await page.getByRole("button", { name: "Resource Planning and Costing" }).click();
  await controlByLabel(page, "Cost Basis Amount").fill("120000");
  await page.getByRole("button", { name: "Save Resource" }).click();

  await openNav(page, "SOWs");
  await page.getByRole("button", { name: "Add SOW" }).click();
  await expect(page.getByRole("heading", { name: "Create SOW" })).toBeVisible();
  await selectByLabel(page, "Client Name", clientName);
  await controlByLabel(page, "SOW / Engagement Name").fill(sowName);
  await selectByLabel(page, "Project Manager", "Priya PM");
  await selectByLabel(page, "Delivery Manager", "Divya Delivery");
  await selectByLabel(page, "Account Manager", "Rohan Account");

  await page.getByRole("button", { name: "Timeline & Commercials" }).click();
  await selectByLabel(page, "Billing Model", "T&M Hourly");
  await selectByLabel(page, "Status", "Active");
  await controlByLabel(page, "Start Date").fill("2026-07-01");
  await controlByLabel(page, "End Date").fill("2026-12-31");
  await controlByLabel(page, "Contract Value").fill("90000");
  await controlByLabel(page, "Visible Revenue").fill("90000");
  await controlByLabel(page, "Visible Cost").fill("60000");
  await controlByLabel(page, "Target Margin %").fill("35");
  await page.getByRole("button", { name: "Save SOW" }).click();

  await page.getByPlaceholder("Search client, engagement...").fill(sowName);
  const registerRow = await rowByText(page, sowName);
  await expect(registerRow).toContainText("ACTIVE");
  await expect(registerRow).toContainText("$90,000");
  await expect(registerRow).toContainText("$60,000");
  await expect(registerRow).toContainText("33.33%");

  await registerRow.getByRole("button", { name: "View" }).click();
  await expect(page.getByText(sowName, { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Roles" }).click();
  await page.getByRole("button", { name: "Add Role" }).click();
  await expect(page.getByRole("heading", { name: "Add SOW Role" })).toBeVisible();

  await controlByLabel(page, "Role Title").fill("QA Basis Lead");
  await selectByLabel(page, "SAP Module", "SAP Basis");
  await selectByLabel(page, "SAP Sub-Module", "S/4 Upgrade");
  await selectByLabel(page, "Role Location", "Onsite");
  await selectByLabel(page, "Engagement Type", "Full-Time");
  await controlByLabel(page, "Start Date").fill("2026-07-01");
  await controlByLabel(page, "Duration (Weeks)").fill("12");
  await controlByLabel(page, "Planned Allocation %").fill("100");
  await controlByLabel(page, "Planned Hours (Per Resource)").fill("400");
  await controlByLabel(page, "Bill Rate").fill("120");
  await controlByLabel(page, "Target Margin %").fill("35");
  await page.getByRole("button", { name: "Save Role" }).click();

  await page.getByRole("button", { name: "Roles" }).click();
  const roleRow = page.locator("tbody tr").filter({ hasText: "QA Basis Lead" }).first();
  await expect(roleRow).toContainText("Onsite");

  await roleRow.getByRole("button", { name: "Assign" }).click();
  await expect(page.getByRole("heading", { name: "Candidate Resource Matching" })).toBeVisible();
  await expect(page.getByText("Showing only resources that match module, location, and project start-date availability for this role.")).toBeVisible();
  await expect(page.getByText("Selected role: SAP FICO Lead")).toHaveCount(0);
  await expect(page.locator("tbody tr").filter({ hasText: resourceFullName }).first()).toContainText("SAP Basis");

  await selectByLabel(page, "Assign Resource", `${resourceFullName} / SAP Basis / Onsite`);
  await page.getByRole("button", { name: "Save and Assign" }).click();

  await page.getByRole("button", { name: "Assignments" }).click();
  await expect(page.getByText(resourceFullName)).toBeVisible();

  await attachScenarioEvidence(page, testInfo, {
    title: "SOW Flow",
    inputData: {
      clientName,
      sowName,
      commercials: {
        status: "Active",
        contractValue: 90000,
        visibleRevenue: 90000,
        visibleCost: 60000,
        targetMargin: 35
      },
      sowRole: {
        title: "QA Basis Lead",
        module: "SAP Basis",
        subModule: "S/4 Upgrade",
        location: "Onsite",
        plannedHours: 400,
        billRate: 120
      },
      assignedResource: resourceFullName
    },
    outputData: {
      registerStatus: "ACTIVE",
      registerMarginPercent: "33.33%",
      assignmentCandidateSeen: resourceFullName,
      deploymentVisible: resourceFullName
    }
  });
});
