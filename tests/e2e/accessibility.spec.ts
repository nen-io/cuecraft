import { expect, test } from "@playwright/test";

test("keyboard save retains focus, timing errors guide correction, deletion has an undo path", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Caption text", { exact: true })
    .fill("[A keyboard caption]");
  await page.getByRole("button", { name: "Save caption", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Save caption", exact: true }),
  ).toBeFocused();
  await page.getByLabel("Start time", { exact: true }).fill("bad");
  await page.getByRole("button", { name: "Save caption", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Start time", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Start time", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(
    page.getByLabel("Start time", { exact: true }),
  ).toHaveAccessibleDescription(/HH:MM:SS/);
  await page.getByRole("button", { name: "Save caption", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Start time", { exact: true })).toBeFocused();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("00:00:00.000");
  await page.getByRole("button", { name: "Save caption", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", { name: "Delete caption", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Make every moment clear." }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Undo", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Edit caption 1", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit caption 1", exact: true })
    .press("Enter");
  await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
    "[A keyboard caption]",
  );
});

async function tabTo(
  page: import("@playwright/test").Page,
  locator: import("@playwright/test").Locator,
) {
  for (let i = 0; i < 100; i++) {
    if (await locator.evaluate((element) => element === document.activeElement))
      return;
    await page.keyboard.press("Tab");
  }
  throw new Error("Control was not reachable by Tab");
}

test("completes a caption edit and export with Tab and Enter at phone width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByLabel("Caption text", { exact: true })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to workspace", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const help = page.locator(".workspace-help summary");
  await tabTo(page, help);
  await page.keyboard.press("Space");
  await expect(page.locator(".workspace-help details")).toHaveAttribute(
    "open",
    "",
  );
  expect(
    await page
      .locator("audio")
      .evaluate((element: HTMLAudioElement) => element.paused),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Edit caption 1", exact: true }),
  ).toHaveAccessibleDescription(/Soft bell notes/);
  await tabTo(
    page,
    page.getByRole("link", { name: "Jump to caption editor", exact: true }),
  );
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Make every moment clear." }),
  ).toBeFocused();
  await tabTo(page, page.getByLabel("Caption text", { exact: true }));
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("[Edited without a pointer]");
  await tabTo(
    page,
    page.getByRole("button", { name: "Save caption", exact: true }),
  );
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Save caption", exact: true }),
  ).toBeFocused();
  await tabTo(
    page,
    page.getByRole("button", { name: "Export VTT", exact: true }),
  );
  const download = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  expect((await download).suggestedFilename()).toBe("small-hours.vtt");
});

test("forced colors, reduced motion and doubled text keep the editor usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByLabel("Caption text", { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "Jump to caption editor", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Make every moment clear." }),
  ).toBeFocused();
  await page.evaluate(() => {
    const elements = [...document.querySelectorAll<HTMLElement>("body *")];
    const sizes = elements.map((element) =>
      parseFloat(getComputedStyle(element).fontSize),
    );
    elements.forEach(
      (element, index) => (element.style.fontSize = `${sizes[index] * 2}px`),
    );
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByLabel("Caption text", { exact: true })
    .fill("[Still usable at larger text]");
  await page
    .getByRole("button", { name: "Save caption", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("button", { name: "Save caption", exact: true }),
  ).toBeFocused();
  await page.screenshot({
    path: "docs/screenshots/accessibility-forced-colors.png",
    fullPage: false,
  });
});
