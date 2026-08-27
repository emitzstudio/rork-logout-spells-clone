import * as fs from "fs";
import * as mupdf from "mupdf";

const data = fs.readFileSync("Logout-Spells-Bir-Sept-2026.pdf");
const doc = mupdf.Document.openDocument(data, "application/pdf");
const n = doc.countPages();
for (let i = 0; i < n; i++) {
  const page = doc.loadPage(i);
  const pix = page.toPixmap(mupdf.Matrix.scale(1.35, 1.35), mupdf.ColorSpace.DeviceRGB, false, true);
  fs.writeFileSync(`render-p${i + 1}.png`, pix.asPNG());
}
console.log("rendered", n, "pages");
