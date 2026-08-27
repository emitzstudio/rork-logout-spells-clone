import * as fs from "fs";
import * as mupdf from "mupdf";
const data = fs.readFileSync("udaipur.pdf");
const doc = mupdf.Document.openDocument(data, "application/pdf");
for (let i = 0; i < doc.countPages(); i++) {
  const page = doc.loadPage(i);
  const pix = page.toPixmap(mupdf.Matrix.scale(1.6, 1.6), mupdf.ColorSpace.DeviceRGB, false, true);
  fs.writeFileSync(`ud-p${i + 1}.png`, pix.asPNG());
}
console.log("done", doc.countPages());
