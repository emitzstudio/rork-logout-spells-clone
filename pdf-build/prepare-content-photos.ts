/**
 * Subtle AI-guided retouching without regenerated people, lettering or scenery.
 * Uses the AI-enhanced references only for bounded exposure / colour curves;
 * all image detail comes from the original supplied photograph.
 * Run from pdf-build: bun run prepare-content-photos.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { PNG } from "pngjs";

type PhotoSource = { name: string; page: number; originalUrl: string; enhancementUrl: string };
type PhotoManifest = { method: string; photos: PhotoSource[] };
type ImageData = { width: number; height: number; data: Buffer };

const cache = ".cache/content-photos";
const output = "img/content-real";
const manifest: PhotoManifest = JSON.parse(readFileSync(`${output}/sources.json`, "utf8"));
const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));
const luminance = (r: number, g: number, b: number): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function distribution(image: ImageData): { cdf: Float64Array; colour: number[] } {
  const histogram = new Float64Array(256);
  const colour = [0, 0, 0];
  let samples = 0;
  let middleSamples = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    if (image.data[i + 3]! < 128) continue;
    const y = luminance(image.data[i]!, image.data[i + 1]!, image.data[i + 2]!);
    histogram[Math.round(y)]! += 1;
    samples += 1;
    if (y > 36 && y < 220) {
      for (let channel = 0; channel < 3; channel++) colour[channel]! += image.data[i + channel]! / y;
      middleSamples += 1;
    }
  }
  if (samples === 0) throw new Error("Photo has no opaque pixels");
  let sum = 0;
  const cdf = Float64Array.from(histogram, (count) => {
    sum += count;
    return sum / samples;
  });
  return { cdf, colour: colour.map((total) => total / Math.max(1, middleSamples)) };
}

function retouch(original: ImageData, reference: ImageData): PNG {
  const source = distribution(original);
  const target = distribution(reference);
  const rawCurve = new Float64Array(256);
  for (let tone = 0; tone < 256; tone++) {
    let matched = 0;
    while (matched < 255 && target.cdf[matched]! < source.cdf[tone]!) matched += 1;
    rawCurve[tone] = clamp(matched - tone, -16, 16) * 0.42;
  }
  const curve = Float64Array.from(rawCurve, (_, tone) => {
    let total = 0;
    let weight = 0;
    for (let delta = -10; delta <= 10; delta++) {
      const w = 11 - Math.abs(delta);
      total += rawCurve[clamp(tone + delta, 0, 255)]! * w;
      weight += w;
    }
    return total / weight;
  });
  const gains = source.colour.map((value, channel) => 1 + clamp(target.colour[channel]! / Math.max(0.01, value) - 1, -0.075, 0.075) * 0.4);
  const rendered = new PNG({ width: original.width, height: original.height });
  const luma = new Float32Array(original.width * original.height);
  for (let pixel = 0; pixel < luma.length; pixel++) {
    const i = pixel * 4;
    luma[pixel] = luminance(original.data[i]!, original.data[i + 1]!, original.data[i + 2]!);
  }
  for (let y = 0; y < original.height; y++) {
    for (let x = 0; x < original.width; x++) {
      const pixel = y * original.width + x;
      const i = pixel * 4;
      const light = luma[pixel]!;
      let detail = 0;
      if (x > 0 && y > 0 && x < original.width - 1 && y < original.height - 1) {
        let neighbourhood = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) neighbourhood += luma[pixel + dy * original.width + dx]!;
        }
        detail = clamp((light - neighbourhood / 9) * 0.17, -3, 3);
      }
      const delta = curve[Math.round(light)]! + detail;
      for (let channel = 0; channel < 3; channel++) {
        rendered.data[i + channel] = Math.round(clamp(original.data[i + channel]! * gains[channel]! + delta, 0, 255));
      }
      rendered.data[i + 3] = original.data[i + 3]!;
    }
  }
  return rendered;
}

function download(url: string, file: string): void {
  if (existsSync(file)) return;
  const result = spawnSync("curl", ["--fail", "--location", "--silent", "--show-error", "--max-time", "35", "--output", file, url], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Photo download failed: ${file}`);
}

mkdirSync(cache, { recursive: true });
for (const photo of manifest.photos) {
  const originalPath = `${cache}/${photo.name}-original.png`;
  const referencePath = `${cache}/${photo.name}-ai.png`;
  download(photo.originalUrl, originalPath);
  download(photo.enhancementUrl, referencePath);
  const original = PNG.sync.read(readFileSync(originalPath));
  const reference = PNG.sync.read(readFileSync(referencePath));
  const enhanced = retouch(original, reference);
  const losslessPath = `${cache}/${photo.name}-enhanced.png`;
  writeFileSync(losslessPath, PNG.sync.write(enhanced));
  const encoded = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", losslessPath, "-frames:v", "1", "-q:v", "2", "-pix_fmt", "yuvj444p", `${output}/${photo.name}.jpg`], { stdio: "inherit" });
  if (encoded.status !== 0) throw new Error(`Photo encoding failed: ${photo.name}`);
  console.log(`${photo.name}: ${original.width} x ${original.height}, original geometry and details preserved`);
}
