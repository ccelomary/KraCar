import { test, expect } from "@playwright/test";

for (const role of ["agency", "platform"] as const) {
  test(`${role} navigation preserves the shell and loaded data without document reloads`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const response = await page.request.post("/api/auth", {
      headers: {
        Origin: "http://127.0.0.1:3000",
        "X-Forwarded-For": `navigation-${role}-${Date.now()}`,
      },
      data: { demo: role },
    });
    expect(response.ok()).toBeTruthy();
    await page.goto(`/${role}/${role === "agency" ? "contacts" : "bookings"}`);
    await expect(page.locator(".workspace-content h1")).toBeVisible();
    if (role === "agency")
      await expect(page.locator(".management-toolbar")).toBeVisible();
    const sidebar = await page.locator(".sidebar").elementHandle();
    const documentRequests: string[] = [];
    const dataRequests: string[] = [];
    page.on("request", (req) => {
      if (req.isNavigationRequest() && req.frame() === page.mainFrame())
        documentRequests.push(req.url());
      if (
        req.url().includes("/api/workspace") ||
        req.url().includes("/api/management")
      )
        dataRequests.push(req.url());
    });
    // Record any loader that replaces populated views during route changes.
    await page.evaluate(() => {
      document.body.dataset.navigationLoadingFlash = "false";
      new MutationObserver((records) => {
        for (const record of records)
          for (const node of record.addedNodes) {
            if (
              node instanceof HTMLElement &&
              (node.matches(".workspace-content .skeleton") ||
                node.querySelector(".skeleton"))
            )
              document.body.dataset.navigationLoadingFlash = "true";
          }
      }).observe(document.querySelector(".workspace-content")!, {
        childList: true,
        subtree: true,
      });
    });
    const sections =
      role === "agency"
        ? [
            ["Invoices", "Invoices"],
            ["Fleet overview", "Fleet overview"],
            ["Contacts", "Contacts"],
          ]
        : [
            ["Agencies", "Your local network."],
            ["All listings", "All experiences, one place."],
            ["Reservations", "Every journey, in one place."],
          ];
    for (const [label] of sections) {
      await page
        .getByRole("navigation", { name: "Workspace navigation" })
        .getByRole("link", { name: new RegExp(label) })
        .click();
      await expect(
        page.locator(".workspace-topbar .breadcrumb strong"),
      ).toHaveText(label);
      await expect(page.locator(".workspace-content h1")).toBeVisible();
      expect(await sidebar!.evaluate((el) => el.isConnected)).toBeTruthy();
    }
    expect(documentRequests).toEqual([]);
    expect(dataRequests).toEqual([]);
    await expect(page.locator("body")).toHaveAttribute(
      "data-navigation-loading-flash",
      "false",
    );
    if (role === "agency") {
      await page.getByLabel("Search records").fill("A local filter");
      await page
        .getByRole("navigation", { name: "Workspace navigation" })
        .getByRole("link", { name: "Invoices", exact: true })
        .click();
      await expect(page.getByLabel("Search records")).toHaveValue("");
      await page.setViewportSize({ width: 390, height: 844 });
      await page
        .getByRole("button", { name: "Open workspace navigation" })
        .click();
      await page
        .getByRole("navigation", { name: "Workspace navigation" })
        .getByRole("link", { name: "Contacts", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Open workspace navigation" }),
      ).toHaveAttribute("aria-expanded", "false");
    }
    expect(errors).toEqual([]);
  });
}
