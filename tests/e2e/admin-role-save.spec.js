import { test, expect } from "@playwright/test";
import { hardRefresh, login, openNav } from "./helpers.js";

test("admin role edit and role permission saves work", async ({ page }) => {
  await login(page);
  await hardRefresh(page);
  await openNav(page, "Admin");

  await page.getByRole("button", { name: "Roles" }).click();
  const directorRow = page.locator("tbody tr").filter({ hasText: "Director" }).first();
  await expect(directorRow).toBeVisible();
  await directorRow.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit Role" })).toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Edit Role" })).toHaveCount(0);
  await expect(directorRow).toBeVisible();

  await page.getByRole("button", { name: "Role Permissions" }).click();
  await page.locator(".role-permissions-toolbar select").selectOption({ label: "Director" });
  await page.getByRole("button", { name: "Save Permissions" }).click();
  await expect(page.getByText("Permissions saved")).toBeVisible();
});
