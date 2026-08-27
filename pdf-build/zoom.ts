import * as fs from "fs";
import * as mupdf from "mupdf";
const data = fs.readFileSync("Logout-Spells-Bir-Sept-2026.pdf");
const doc = mupdf.Document.openDocument(data, "application/pdf");
const page = doc.loadPage(2);
const pix = page.toPixmap(mupdf.Matrix.scale(3, 3), mupdf.ColorSpace.DeviceRGB, false, true);
fs.writeFileSync("zoom-p3.png", pix.asPNG());
