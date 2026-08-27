import * as fs from "fs";
import * as mupdf from "mupdf";
const data = fs.readFileSync("udaipur.pdf");
const doc = mupdf.Document.openDocument(data, "application/pdf");
const n = doc.countPages();
console.log("pages:", n);
for (let i = 0; i < n; i++) {
  const page = doc.loadPage(i);
  console.log(`===== PAGE ${i + 1} =====`);
  console.log(page.toStructuredText().asText());
  const imgs = page.getImages();
  console.log("--images on page:", imgs.length);
}
