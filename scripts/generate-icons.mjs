// One-off icon generator for the PWA manifest. Run with: node scripts/generate-icons.mjs
// Not part of the app build — regenerate manually if the mark ever changes.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../public/icons");
mkdirSync(outDir, { recursive: true });

// Two concentric rings on a dark ground — a simple, font-free "coin" mark
// consistent with the app's gold accent color. Maskable variants keep all
// content inside the inner 80% safe zone Android requires.
function svg({ size, maskable }) {
  const bg = "#14181f";
  const gold = "#d4a441";
  const goldDeep = "#8a5a10";
  const cx = size / 2;
  const cy = size / 2;
  const pad = maskable ? size * 0.1 : size * 0.06;
  const outerR = cx - pad;
  const innerR = outerR * 0.62;
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  <circle cx="${cx}" cy="${cy}" r="${outerR}" fill="none" stroke="${gold}" stroke-width="${size * 0.045}"/>
  <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${goldDeep}"/>
  <circle cx="${cx}" cy="${cy}" r="${innerR * 0.55}" fill="${gold}"/>
</svg>`;
}

async function render(size, maskable, filename) {
  const buf = Buffer.from(svg({ size, maskable }));
  await sharp(buf).png().toFile(path.join(outDir, filename));
  console.log("wrote", filename);
}

await render(192, false, "icon-192.png");
await render(512, false, "icon-512.png");
await render(512, true, "icon-512-maskable.png");
await render(180, false, "apple-touch-icon.png"); // iOS home-screen icon, unused for Android stores but harmless
