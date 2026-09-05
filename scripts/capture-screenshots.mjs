// Captures real screenshots of the deployed app for the PWA manifest and
// for app-store listings (Indus Appstore, Oppo App Market). Runs in CI
// (.github/workflows/screenshots.yml) against the live production URL,
// since GitHub's runners can reach it and this sandbox's dev environment
// cannot (no DB access here to render a real dashboard locally).
//
// Run manually with: node scripts/capture-screenshots.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../public/screenshots");
mkdirSync(outDir, { recursive: true });

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "https://sgbtracker.vercel.app";

// Clean, exact output pixel dimensions (deviceScaleFactor: 1 => viewport
// size *is* the PNG size) rather than a device preset's fractional scale
// factor, so these numbers can be hardcoded into app/manifest.ts's
// `screenshots` field with certainty rather than guessed after the fact.
// 1080x1920 is a standard, widely-accepted mobile screenshot size for
// Android app store listings.
const shots = [
  { path: "/", file: "dashboard-narrow.png", viewport: { width: 1080, height: 1920 }, formFactor: "narrow" },
  { path: "/alerts", file: "alerts-narrow.png", viewport: { width: 1080, height: 1920 }, formFactor: "narrow" },
  { path: "/", file: "dashboard-wide.png", viewport: { width: 1280, height: 800 }, formFactor: "wide" },
];

const browser = await chromium.launch();
const results = [];

for (const shot of shots) {
  const context = await browser.newContext({ viewport: shot.viewport });
  const page = await context.newPage();
  const url = `${BASE_URL}${shot.path}`;
  console.log(`Capturing ${url} -> ${shot.file}`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  // Give client-rendered rankings/tables a moment past networkidle.
  await page.waitForTimeout(1500);
  const filePath = path.join(outDir, shot.file);
  await page.screenshot({ path: filePath });
  results.push({ file: shot.file, formFactor: shot.formFactor, widthPx: shot.viewport.width, heightPx: shot.viewport.height });
  await context.close();
}

await browser.close();

console.log("\nCaptured:");
for (const r of results) {
  console.log(`  ${r.file}: ${r.widthPx}x${r.heightPx} (${r.formFactor})`);
}
