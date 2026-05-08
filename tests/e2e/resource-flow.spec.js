import { test, expect } from "@playwright/test";
import { attachScenarioEvidence, controlByLabel, hardRefresh, login, openNav, rowByText, selectByLabel } from "./helpers.js";

test("resource flow creates an offshore resource with secondary skills and register visibility", async ({ page }, testInfo) => {
  const firstName = `QARes${Date.now().toString().slice(-6)}`;
  const lastName = "Tester";
  const fullName = `${firstName} ${lastName}`;

  await login(page);
  await hardRefresh(page);
  await openNav(page, "Resources");

  await page.getByRole("button", { name: "Add Resource" }).click();
  await expect(page.getByRole("heading", { name: "Create Resource" })).toBeVisible();
  await controlByLabel(page, "First Name").fill(firstName);
  await controlByLabel(page, "Last Name").fill(lastName);
  await controlByLabel(page, "Contact Email").fill("qa.resource@example.com");
  await controlByLabel(page, "Contact Number").fill("9000000001");
  await selectByLabel(page, "Primary SAP Module", "SAP FICO");
  await selectByLabel(page, "Primary Sub-Module", "GL");

  await page.getByRole("button", { name: "+ Add Skill" }).click();
  const secondarySubModule = page.getByLabel("Secondary Sub-Module");
  await expect(secondarySubModule).toBeHidden();
  await selectByLabel(page, "Secondary Skill 1", "SAP Basis");
  await expect(secondarySubModule).toBeVisible();
  await secondarySubModule.selectOption({ label: "S/4 Upgrade" });

  await page.getByRole("button", { name: "Employment and Compensation" }).click();
  await controlByLabel(page, "Location").fill("Chennai");
  await selectByLabel(page, "Location Type", "Offshore");
  await selectByLabel(page, "Employment Type", "Full-Time");
  await expect(controlByLabel(page, "Visa / Work Authorization")).toHaveValue("NA (Offshore)");
  await expect(controlByLabel(page, "Compensation Input Type")).toHaveValue("Annual CTC");
  await controlByLabel(page, "Compensation Value").fill("1800000");
  await page.getByRole("button", { name: "Save Resource" }).click();

  await expect(page.getByPlaceholder("Search name, skill...")).toBeVisible();
  await page.getByPlaceholder("Search name, skill...").fill(firstName);
  const row = await rowByText(page, fullName);
  await expect(row).toContainText("SAP FICO");
  await expect(row).toContainText("AVAILABLE");

  const filters = page.locator(".register-filter-bar select");
  await filters.nth(0).selectOption({ label: "Chennai" });
  await filters.nth(1).selectOption({ label: "Full-Time" });
  await filters.nth(2).selectOption({ label: "AVAILABLE" });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "View" }).click();
  await page.getByRole("button", { name: "Identity and Skills" }).click();
  await expect(page.getByText("SAP Basis / S/4 Upgrade")).toBeVisible();
  await expect(page.getByRole("heading", { name: fullName })).toBeVisible();

  await attachScenarioEvidence(page, testInfo, {
    title: "Resource Flow",
    inputData: {
      firstName,
      lastName,
      contactEmail: "qa.resource@example.com",
      primaryModule: "SAP FICO",
      primarySubModule: "GL",
      secondarySkill: "SAP Basis",
      secondarySubModule: "S/4 Upgrade",
      location: "Chennai",
      locationType: "Offshore",
      employmentType: "Full-Time",
      compensationValue: 1800000
    },
    outputData: {
      expectedHeading: fullName,
      expectedSecondarySkill: "SAP Basis / S/4 Upgrade",
      expectedDeliveryStatus: "AVAILABLE"
    }
  });
});
