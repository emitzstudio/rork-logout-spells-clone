import * as fs from "fs";
import * as mupdf from "mupdf";
const data = fs.readFileSync("udaipur.pdf");
const doc = mupdf.Document.openDocument(data, "application/pdf");
for (let i = 0; i < doc.countPages(); i++) {
  const page = doc.loadPage(i);
  const text = page.toStructuredText().asText();
  console.log(`===== PAGE ${i + 1} (${text.length} chars, ${page.getImages().length} images) =====`);
  console.log(text.slice(0, 2400));
}
