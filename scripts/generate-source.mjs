import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const SOURCE_WIDTH = 2048;
const SOURCE_HEIGHT = 1536;
const EXPECTED_FILE_SHA256 = "70e42a65fb07b5b6235058e9e94474fadb4bb68b66e5f9ef38e57fb3a173aa28";
const outputPath = resolve(process.argv[2] ?? "original.png");

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function deterministicNoise(x, y) {
  let value = Math.imul(x + 374761393, 668265263) ^ Math.imul(y + 1274126177, 2246822519);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function makeSourcePixels() {
  const pixels = Buffer.alloc(SOURCE_WIDTH * SOURCE_HEIGHT * 3);
  const firstSplit = 682;
  const secondSplit = 1365;
  const horizontalSplit = 768;

  for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
    for (let x = 0; x < SOURCE_WIDTH; x += 1) {
      let red;
      let green;
      let blue;

      if (y < horizontalSplit && x < firstSplit) {
        const localX = (x - firstSplit / 2) / (firstSplit / 2);
        const localY = (y - horizontalSplit / 2) / (horizontalSplit / 2);
        const radiusSquared = localX * localX + localY * localY;
        const wave = 127.5 + 119 * Math.cos(160 * Math.PI * radiusSquared);
        red = wave;
        green = 127.5 + 119 * Math.cos(160 * Math.PI * radiusSquared + 0.08);
        blue = 127.5 + 119 * Math.cos(160 * Math.PI * radiusSquared - 0.08);
      } else if (y < horizontalSplit && x < secondSplit) {
        const centerX = (firstSplit + secondSplit) / 2;
        const centerY = horizontalSplit / 2;
        const deltaX = x - centerX;
        const deltaY = y - centerY;
        const angle = Math.atan2(deltaY, deltaX);
        const radius = Math.hypot(deltaX, deltaY);
        const spoke = Math.sin(angle * 72) >= 0 ? 238 : 17;
        const ring = Math.sin(radius * 0.42) * 10;
        red = spoke + ring;
        green = spoke;
        blue = spoke - ring;
      } else if (y < horizontalSplit) {
        const localX = x - secondSplit;
        const band = Math.min(7, Math.floor(y / 96));
        const period = [1, 2, 3, 4, 6, 8, 12, 16][band];
        const checker = (Math.floor(localX / period) + Math.floor((y - band * 96) / period)) % 2;
        const value = checker ? 245 : 10;
        red = value;
        green = band % 2 ? value : 255 - value;
        blue = band % 3 ? value : 255 - value;
      } else if (x < firstSplit) {
        const localY = y - horizontalSplit;
        const band = Math.min(7, Math.floor(localY / 96));
        const period = [2, 3, 5, 7, 9, 13, 21, 34][band];
        const slant = Math.floor(x + localY * (0.13 + band * 0.045));
        const stripe = ((slant % period) + period) % period < period / 2;
        const edge = x > 110 + localY * 0.57 && x < 122 + localY * 0.57;
        red = edge ? 220 : stripe ? 250 : 14;
        green = edge ? 30 : stripe ? 250 : 14;
        blue = edge ? 30 : stripe ? 250 : 14;
      } else if (x < secondSplit) {
        const localX = x - firstSplit;
        const localY = y - horizontalSplit;
        const noise = deterministicNoise(x, y) - 0.5;
        const broad = Math.sin(localX * 0.021 + localY * 0.009) + Math.sin(localX * 0.047 - localY * 0.031);
        const detail = Math.sin(localX * 0.19 + Math.sin(localY * 0.037) * 9) + Math.cos(localY * 0.27 - localX * 0.11);
        const vein = Math.abs(Math.sin(localX * 0.083 + localY * 0.057 + 7 * Math.sin(localY * 0.011)));
        red = 102 + broad * 34 + detail * 20 + noise * 36 + vein * 38;
        green = 119 + broad * 27 - detail * 13 + noise * 30 + vein * 54;
        blue = 82 - broad * 19 + detail * 28 + noise * 34 + vein * 18;
      } else {
        const localX = x - secondSplit;
        const localY = y - horizontalSplit;
        const normalizedX = localX / (SOURCE_WIDTH - secondSplit - 1);
        const normalizedY = localY / (SOURCE_HEIGHT - horizontalSplit - 1);
        const frequency = 1 + Math.floor(normalizedY * 23);
        const stripe = Math.floor(localX / frequency) % 6;
        const palette = [
          [245, 26, 42],
          [252, 224, 20],
          [32, 184, 83],
          [18, 178, 220],
          [42, 61, 232],
          [221, 32, 190]
        ][stripe];
        const fade = 0.3 + normalizedX * 0.7;
        red = palette[0] * fade + 255 * (1 - fade);
        green = palette[1] * fade + 255 * (1 - fade);
        blue = palette[2] * fade + 255 * (1 - fade);
      }

      if (Math.abs(x - firstSplit) < 3 || Math.abs(x - secondSplit) < 3 || Math.abs(y - horizontalSplit) < 3) {
        red = 255;
        green = 255;
        blue = 255;
      }

      if (Math.abs(x - firstSplit) === 3 || Math.abs(x - secondSplit) === 3 || Math.abs(y - horizontalSplit) === 3) {
        red = 0;
        green = 0;
        blue = 0;
      }

      const offset = (y * SOURCE_WIDTH + x) * 3;
      pixels[offset] = clampByte(red);
      pixels[offset + 1] = clampByte(green);
      pixels[offset + 2] = clampByte(blue);
    }
  }

  return pixels;
}

const pixels = makeSourcePixels();
const { data: png, info } = await sharp(pixels, {
  raw: {
    width: SOURCE_WIDTH,
    height: SOURCE_HEIGHT,
    channels: 3
  }
})
  .png({
    adaptiveFiltering: false,
    compressionLevel: 9,
    palette: false,
    progressive: false
  })
  .toBuffer({ resolveWithObject: true });

const fileHash = createHash("sha256").update(png).digest("hex");
const rgbHash = createHash("sha256").update(pixels).digest("hex");
if (fileHash !== EXPECTED_FILE_SHA256) {
  throw new Error(`Generated file SHA-256 mismatch: expected ${EXPECTED_FILE_SHA256}, received ${fileHash}`);
}

await writeFile(outputPath, png);
console.log(`Wrote ${outputPath} (${info.size} bytes)`);
console.log(`File SHA-256: ${fileHash}`);
console.log(`Decoded RGB SHA-256: ${rgbHash}`);