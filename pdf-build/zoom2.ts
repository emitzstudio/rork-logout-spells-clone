import * as fs from "fs";
import * as mupdf from "mupdf";
const data = fs.readFileSync("Logout-Spells-Bir-Sept-2026.pdf");
const doc = mupdf.Document.openDocument(data, "application/pdf");
for (const [idx, name] of [[2, "p3"], [0, "p1"]] as [number, string][]) {
  const page = doc.loadPage(idx);
  const pix = page.toPixmap(mupdf.Matrix.scale(3, 3), mupdf.ColorSpace.DeviceRGB, false, true);
  fs.writeFileSync(`zoomfull-${name}.png`, pix.asPNG());
}
