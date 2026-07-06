import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

function readPngSize(filePath) {
  const buffer = readFileSync(filePath);
  if (buffer.toString("ascii", 1, 4) !== "PNG") {
    throw new Error(`${filePath} is not a PNG`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

const checks = [
  { name: "social-share.png", maxBytes: 120_000, width: 1200, height: 630 },
  { name: "og-image.png", maxBytes: 120_000, width: 1200, height: 630 },
  { name: "apple-touch-icon.png", maxBytes: 20_000, width: 180, height: 180 },
];

for (const check of checks) {
  const filePath = path.join(root, check.name);
  const bytes = statSync(filePath).size;
  const { width, height } = readPngSize(filePath);

  if (bytes > check.maxBytes) {
    throw new Error(`${check.name} is too large (${bytes} bytes)`);
  }
  if (width !== check.width || height !== check.height) {
    throw new Error(`${check.name} must be ${check.width}x${check.height}, got ${width}x${height}`);
  }
}

console.log("Brand assets verified.");
