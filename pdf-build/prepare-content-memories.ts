/** Prepares the eight original photographs for the Content Spell's memories page. */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PNG } from "pngjs";

const exec = promisify(execFile);
const cache = ".cache/content-memories";
const manifest: { photos: { attachment: number; image: string; originalUrl: string }[] } = JSON.parse(
  readFileSync("img/content-memories/sources.json", "utf8"),
);
mkdirSync(cache, { recursive: true });

async function preparePhoto(photo: (typeof manifest.photos)[number]): Promise<void> {
  const source = `${cache}/${basename(photo.image, ".jpg")}.png`;
  if (!existsSync(source)) {
    await exec("curl", ["--fail", "--location", "--silent", "--show-error", "--max-time", "40", "--output", source, photo.originalUrl]);
  }
  const original = PNG.sync.read(readFileSync(source));
  await exec("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", source,
    "-frames:v", "1", "-q:v", "2", "-pix_fmt", "yuvj444p", "-threads", "1", photo.image,
  ]);
  console.log(`Photo ${photo.attachment}: ${original.width} x ${original.height}, original composition retained`);
}

for (let offset = 0; offset < manifest.photos.length; offset += 4) {
  await Promise.all(manifest.photos.slice(offset, offset + 4).map(preparePhoto));
}
