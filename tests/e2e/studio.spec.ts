import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { exportVtt } from "../../src/domain/captions";
const firstText = "[Soft bell notes open the melody]";
const storageKey = "cuecraft:small-hours-pcm-v1";
const vtt = (text: string) =>
  `WEBVTT\n\n1\n00:00:00.000 --> 00:00:03.000\n${text}\n`;

test("real playback, pause, keyboard seeking, active cue and reset (C5/C6)", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Play audio", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".waveform rect")).toHaveCount(180);
  await page.getByRole("button", { name: "Play audio", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator("audio")
        .evaluate((audio: HTMLAudioElement) => audio.currentTime),
    )
    .toBeGreaterThan(0.15);
  await page.getByRole("button", { name: "Pause audio", exact: true }).click();
  const paused = await page
    .locator("audio")
    .evaluate((audio: HTMLAudioElement) => audio.currentTime);
  await page.waitForTimeout(250);
  expect(
    await page
      .locator("audio")
      .evaluate((audio: HTMLAudioElement) => audio.currentTime),
  ).toBe(paused);
  const range = page.getByRole("slider", { name: "Seek audio" });
  await range.fill("5000");
  await expect(page.getByTestId("active-caption")).toHaveText(
    "[A bright, repeating arpeggio]",
  );
  await range.focus();
  await page.keyboard.press("ArrowRight");
  await expect(range).toHaveValue("5010");
  await page.getByRole("button", { name: "Reset playback" }).click();
  await expect(page.getByTestId("current-time")).toHaveText("00:00.000");
  await page.locator("h1").click();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Pause audio", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Play audio", exact: true }),
  ).toBeVisible();
});

test("edits, history, invalid timing, safe content, export and reimport (C5)", async ({
  page,
}) => {
  await page.goto("/");
  const text = "日本語 & <img src=x onerror=alert(1)> sound";
  await page.getByLabel("Caption text", { exact: true }).fill(text);
  await page.getByRole("button", { name: "Save caption" }).click();
  await expect(
    page.getByRole("button", { name: "Edit caption 1", exact: true }),
  ).toContainText(text);
  await expect(page.locator("img")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
    firstText,
  );
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
    text,
  );
  await page.getByLabel("End time", { exact: true }).fill("00:00:06.000");
  await page.getByRole("button", { name: "Save caption" }).click();
  await expect(page.getByRole("alert")).toContainText("overlap");
  await expect(
    page.getByRole("button", { name: "Edit caption 1", exact: true }),
  ).toContainText("00:03.750");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export VTT" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("small-hours.vtt");
  await page
    .getByLabel("Import WebVTT file")
    .setInputFiles((await download.path())!);
  await expect(page.getByRole("status")).toContainText("Imported 5 captions");
  await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
    text,
  );
  await page.getByRole("button", { name: "Delete caption" }).click();
  await expect(
    page.getByRole("button", { name: /^Edit caption \d/ }),
  ).toHaveCount(4);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Edit caption \d/ }),
  ).toHaveCount(5);
  await page.getByRole("button", { name: "Add caption in next gap" }).click();
  await expect(page.getByLabel("Start time", { exact: true })).toHaveValue(
    "00:00:03.750",
  );
  await expect(
    page.getByRole("button", { name: "Redo", exact: true }),
  ).toBeDisabled();
});

test("native WebVTT parser decodes exported markup, Unicode and newlines", async ({
  page,
}) => {
  await page.goto("/");
  const text = "  日本語 & <voice>\n\nsecond &amp; line\r  ";
  const encoded = exportVtt({
    version: 1,
    durationMs: 10000,
    cues: [{ id: "one", startMs: 0, endMs: 5000, text }],
  });
  const cuePayload = encoded.split("\n")[4];
  const decoded = await page.evaluate(
    (payload) => new VTTCue(0, 5, payload).getCueAsHTML().textContent,
    cuePayload,
  );
  expect(decoded).toBe(text);
});

test("malformed and oversized imports preserve document; empty imports are editable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Import WebVTT file").setInputFiles({
    name: "broken.vtt",
    mimeType: "text/vtt",
    buffer: Buffer.from("not WebVTT"),
  });
  await expect(page.getByRole("alert")).toContainText("WEBVTT header");
  await expect(
    page.getByRole("button", { name: /^Edit caption \d/ }),
  ).toHaveCount(5);
  await page.getByLabel("Import WebVTT file").setInputFiles({
    name: "huge.vtt",
    mimeType: "text/vtt",
    buffer: Buffer.alloc(524289, "x"),
  });
  await expect(page.getByRole("alert")).toContainText("512 KiB");
  await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
    firstText,
  );
  await page.getByLabel("Import WebVTT file").setInputFiles({
    name: "empty.vtt",
    mimeType: "text/vtt",
    buffer: Buffer.from("WEBVTT\n\n"),
  });
  await expect(
    page.getByText("A clean track. Add your first sound description."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add caption in next gap" }).click();
  await expect(page.getByLabel("Start time", { exact: true })).toHaveValue(
    "00:00:00.000",
  );
});

test("optional persistence restores validated edits and reset is undoable", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Caption text", { exact: true })
    .fill("[A saved local caption]");
  await page.getByRole("button", { name: "Save caption" }).click();
  await page.getByLabel("Remember edits on this device").check();
  await page.reload();
  await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
    "[A saved local caption]",
  );
  await page.getByRole("button", { name: "Reset to sample" }).click();
  await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
    firstText,
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
    "[A saved local caption]",
  );
  await page.getByLabel("Remember edits on this device").uncheck();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBeNull();
});

test("corrupt and unavailable persistence are nonfatal", async ({ page }) => {
  await page.addInitScript(
    (key) => localStorage.setItem(key, "{broken"),
    storageKey,
  );
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("could not be restored");
  await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
    firstText,
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error("denied");
    };
  });
  await page.getByLabel("Remember edits on this device").check();
  await expect(page.getByRole("status")).toContainText(
    "storage is unavailable",
  );
  await page
    .getByLabel("Caption text", { exact: true })
    .fill("[Still editable]");
  await page.getByRole("button", { name: "Save caption" }).click();
  await expect(
    page.getByRole("button", { name: "Edit caption 1", exact: true }),
  ).toContainText("Still editable");
});

test("stale file read never overwrites a newer edit", async ({ page }) => {
  await page.addInitScript(() => {
    const original = File.prototype.text;
    File.prototype.text = function () {
      return new Promise((resolve) => {
        (window as unknown as { finishFileRead: () => void }).finishFileRead =
          () => {
            void original.call(this).then(resolve);
          };
      });
    };
  });
  await page.goto("/");
  await page.getByLabel("Import WebVTT file").setInputFiles({
    name: "slow.vtt",
    mimeType: "text/vtt",
    buffer: Buffer.from(vtt("Old import")),
  });
  await expect(page.getByRole("button", { name: "Reading…" })).toBeVisible();
  await page.getByLabel("Caption text", { exact: true }).fill("[Newer edit]");
  await page.getByRole("button", { name: "Save caption" }).click();
  await page.evaluate(() =>
    (window as unknown as { finishFileRead: () => void }).finishFileRead(),
  );
  await expect(page.getByRole("alert")).toContainText("Captions changed");
  await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
    "[Newer edit]",
  );
});

test("audio load failure is explicit, retry recovers and play rejection never fakes progress", async ({
  page,
}) => {
  await page.route("**/small-hours.wav", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("audio could not load");
  await expect(page.getByTestId("current-time")).toHaveText("00:00.000");
  await page.unroute("**/small-hours.wav");
  await page.getByRole("button", { name: "Retry audio" }).click();
  await expect(
    page.getByRole("button", { name: "Play audio", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => {
    HTMLMediaElement.prototype.play = () =>
      Promise.reject(new DOMException("blocked"));
  });
  await page.getByRole("button", { name: "Play audio", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Playback was blocked");
  await expect(page.getByTestId("current-time")).toHaveText("00:00.000");
  await expect(
    page.getByRole("button", { name: "Play audio", exact: true }),
  ).toBeVisible();
});

test("typing spaces does not trigger transport; ended resets play state", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Caption text", { exact: true }).focus();
  await page.keyboard.press("Space");
  expect(
    await page
      .locator("audio")
      .evaluate((audio: HTMLAudioElement) => audio.paused),
  ).toBe(true);
  await page.getByRole("slider", { name: "Seek audio" }).fill("23990");
  await page.getByRole("button", { name: "Play audio", exact: true }).click();
  await expect
    .poll(() =>
      page.locator("audio").evaluate((audio: HTMLAudioElement) => audio.ended),
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Play audio", exact: true }),
  ).toBeVisible();
});

test("desktop, mobile, 320px and 200% text remain usable; actual screenshots", async ({
  page,
}) => {
  await mkdir("docs/screenshots", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/");
  await expect(page.locator(".waveform rect")).toHaveCount(180);
  await expect(
    page.getByRole("button", { name: "Save caption" }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "docs/screenshots/mobile.png",
    fullPage: true,
  });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.evaluate(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("body *"),
    );
    const sizes = elements.map((element) =>
      parseFloat(getComputedStyle(element).fontSize),
    );
    elements.forEach((element, i) => {
      element.style.fontSize = `${sizes[i] * 2}px`;
    });
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Edit caption 2", exact: true })
    .click();
  await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
    "[A bright, repeating arpeggio]",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.getByRole("button", { name: "Save caption" }),
  ).toBeEnabled();
});

test("media error and retry preserve unsaved session edits and history", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Caption text", { exact: true })
    .fill("[An edit that must survive retry]");
  await page.getByRole("button", { name: "Save caption" }).click();
  await page.evaluate(() =>
    document.querySelector("audio")!.dispatchEvent(new Event("error")),
  );
  await expect(page.getByRole("alert")).toContainText("audio could not load");
  await page.getByRole("button", { name: "Retry audio" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
    "[An edit that must survive retry]",
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
    firstText,
  );
});

test("loading waits for actual metadata; waveform-only failure keeps audio usable", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/small-hours.wav", async (route) => {
    await gate;
    if (route.request().resourceType() === "fetch") await route.abort();
    else await route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: "Play audio", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "The caption studio opens when the audio duration is known.",
    ),
  ).toBeVisible();
  release();
  await expect(
    page.getByRole("button", { name: "Play audio", exact: true }),
  ).toBeEnabled();
  await expect(page.getByRole("status")).toContainText("Waveform unavailable");
  await page.getByRole("button", { name: "Play audio", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator("audio")
        .evaluate((audio: HTMLAudioElement) => audio.currentTime),
    )
    .toBeGreaterThan(0.1);
  await expect(page.locator(".waveform rect")).toHaveCount(0);
});
