import * as fs from "fs";
import * as mupdf from "mupdf";

const [file, prefix, scaleStr] = process.argv.slice(2);
if (!file || !prefix) {
  console.error("usage: bun run render-any.ts <pdf> <prefix> [scale]");
  process.exit(1);
}
const scale = scaleStr ? parseFloat(scaleStr) : 1.35;
const data = fs.readFileSync(file);
const doc = mupdf.Document.openDocument(data, "application/pdf");
const n = doc.countPages();
for (let i = 0; i < n; i++) {
  const page = doc.loadPage(i);
  const pix = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
  fs.writeFileSync(`${prefix}-p${i + 1}.png`, pix.asPNG());
}
console.log("rendered", n, "pages ->", `${prefix}-p*.png`);
