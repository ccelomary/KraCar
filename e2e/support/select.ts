import { type Locator } from "@playwright/test";

export async function selectDropdown(control: Locator, value: string) {
  await control.click();
  await control
    .page()
    .locator(`[role="option"][data-value=${JSON.stringify(value)}]`)
    .click();
}
