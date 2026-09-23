import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";

const source =
  "WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000\nFirst\n\n2\n00:00:05.000 --> 00:00:07.000\nSecond\n";
test("timing offset is one reversible saved edit and protects all drafts", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Timing offset in milliseconds").fill("250");
  await page.getByRole("button", { name: "Apply timing offset" }).click();
  await expect(page.getByLabel("Start time", { exact: true })).toHaveValue(
    "00:00:00.250",
  );
  await expect(page.getByLabel("End time", { exact: true })).toHaveValue(
    "00:00:04.000",
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Start time", { exact: true })).toHaveValue(
    "00:00:00.000",
  );
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByLabel("Start time", { exact: true })).toHaveValue(
    "00:00:00.250",
  );
  await page.getByLabel("Timing offset in milliseconds").fill("501");
  await expect(
    page.getByRole("button", { name: "Apply timing offset" }),
  ).toBeDisabled();
  await expect(page.locator(".timing-offset")).toContainText("−250 to +500 ms");
  await page.getByLabel("Caption text", { exact: true }).fill("Unfinished");
  await page
    .getByRole("button", { name: "Edit caption 2", exact: true })
    .click();
  await page.getByLabel("Timing offset in milliseconds").fill("100");
  await expect(
    page.getByRole("button", { name: "Apply timing offset" }),
  ).toBeDisabled();
  await expect(page.locator(".timing-offset")).toContainText(
    "Save or discard caption drafts",
  );
});

test("whole track shifts exact exported times and mobile reviewer links are keyboard reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Import WebVTT file").setInputFiles({
    name: "offset.vtt",
    mimeType: "text/vtt",
    buffer: Buffer.from(source),
  });
  await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
    "First",
  );
  await page.getByLabel("Timing offset scope").selectOption("all");
  await page.getByLabel("Timing offset in milliseconds").fill("500");
  await page.getByLabel("Timing offset in milliseconds").press("Enter");
  await expect(page.getByLabel("Start time", { exact: true })).toHaveValue(
    "00:00:01.500",
  );
  await fs.mkdir("docs/screenshots", { recursive: true });
  await page
    .locator(".timing-offset")
    .screenshot({ path: "docs/screenshots/timing-offset.png" });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export VTT" }).click();
  const path = await (await download).path();
  const text = await fs.readFile(path!, "utf8");
  expect(text).toContain("00:00:01.500 --> 00:00:03.500");
  expect(text).toContain("00:00:05.500 --> 00:00:07.500");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Start time", { exact: true })).toHaveValue(
    "00:00:01.000",
  );
  await expect(
    page.getByRole("link", { name: "Source", exact: true }),
  ).toHaveAttribute("href", "https://github.com/nen-io/cuecraft");
  const guide = page.getByRole("link", {
    name: "Engineering walkthrough",
    exact: true,
  });
  await expect(guide).toHaveAttribute(
    "href",
    "https://github.com/nen-io/cuecraft/blob/main/docs/REVIEWER_GUIDE.md",
  );
  await page.getByRole("link", { name: "Source", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(guide).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("timing edits supersede a pending import and empty tracks cannot shift", async ({
  page,
}) => {
  await page.addInitScript(() => {
    File.prototype.text = function () {
      return new Promise((resolve) => {
        (
          window as unknown as { finishOffsetImport: (source: string) => void }
        ).finishOffsetImport = resolve;
      });
    };
  });
  await page.goto("/");
  await page.getByLabel("Import WebVTT file").setInputFiles({
    name: "slow.vtt",
    mimeType: "text/vtt",
    buffer: Buffer.from(source),
  });
  await page.getByRole("button", { name: "Apply timing offset" }).click();
  await page.evaluate(
    (source) =>
      (
        window as unknown as { finishOffsetImport: (source: string) => void }
      ).finishOffsetImport(source),
    source,
  );
  await expect(page.getByRole("alert")).toContainText("Captions changed");
  await expect(page.getByLabel("Start time", { exact: true })).toHaveValue(
    "00:00:00.250",
  );
  await page.getByLabel("Import WebVTT file").setInputFiles({
    name: "empty.vtt",
    mimeType: "text/vtt",
    buffer: Buffer.from("WEBVTT\n"),
  });
  await page.evaluate(() =>
    (
      window as unknown as { finishOffsetImport: (source: string) => void }
    ).finishOffsetImport("WEBVTT\n"),
  );
  await expect(
    page.getByRole("heading", { name: "A fresh start." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Apply timing offset" }),
  ).toBeDisabled();
  await expect(page.locator(".timing-offset")).toContainText(
    "No saved caption selected.",
  );
});
