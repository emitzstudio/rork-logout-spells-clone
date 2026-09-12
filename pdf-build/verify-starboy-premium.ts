/** Validate the premium edition and link-only XO v13 revision, including rendered pages. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import * as mupdf from "mupdf";
import { PNG } from "pngjs";
import premium from "./starboy-premium-v1.json";
import snapshot from "./starboy-dashboard-20260912-v5.json";
import { saveGrimoireCopy } from "./starboy-grimoire-template";

const draft = process.argv.includes("--draft");
assert(!(draft && process.argv.includes("--publish")));
const origin = "https://z57wkqd89o09lsi6kc7v1-web.rork.live";
const xoName = "Logout-Spells-Blinding-Nights-9-15-Oct-2026-Grimoire-v13.pdf";
const oldName = "Logout-Spells-Blinding-Nights-9-15-Oct-2026-Grimoire-v12.pdf";
const form = "https://www.logoutspells.com/forms/logout-with-weekend-in-thailand";
const hash = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const compact = (value: string): string => value.normalize("NFKC").replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u{1F3FB}-\u{1F3FF}]/gu, "").replace(/\*+/g, "").replace(/[—–]/g, "-").replace(/\s+/g, "").toLowerCase();
const warnings: string[] = [];
mupdf.setLog({ warning: (message: string) => warnings.push(message), error: (message: string) => warnings.push(message) });
const oldBytes = readFileSync(oldName);
assert.equal(hash(oldBytes), "07d2a2881e8d4baa9989bb5ab7a3bc94e3529dd2f717f765a73ec74385a5c858");
assert(oldBytes.equals(readFileSync(`../web/public/brochures/${oldName}`)));
const old = mupdf.Document.openDocument(oldBytes, "application/pdf");
const bytes = readFileSync(draft ? ".cache/starboy-premium-v1-draft.pdf" : premium.fileName);
const doc = mupdf.Document.openDocument(bytes, "application/pdf");
assert.equal(doc.countPages(), 9);
const texts: string[] = [];
for (let index = 0; index < doc.countPages(); index++) {
  const p = doc.loadPage(index);
  const st = p.toStructuredText("preserve-whitespace");
  const text = st.asText();
  texts.push(text);
  const normalized = compact(text);
  assert(!/\uFFFD|\u0000/.test(text));
  assert(!/exclusions|not included|optional|80,000|85,000|TBA/i.test(text));
  assert(normalized.includes(compact("STARBOY PACKAGE")), `Missing package identity on page ${index + 1}`);
  assert(normalized.includes(compact("ALL INCLUSIVE")));
  const data = JSON.parse(st.asJSON()) as { blocks: { lines?: { text: string; bbox: { x: number; y: number; w: number; h: number } }[] }[] };
  const lines = data.blocks.flatMap((block) => block.lines ?? []);
  for (const line of lines) {
    const { x, y, w, h } = line.bbox;
    assert(x >= 25 && x + w <= 571 && y >= 20 && y + h <= 825, `Unsafe text on page ${index + 1}: ${line.text}`);
  }
  const pix = p.toPixmap(mupdf.Matrix.scale(1.5, 1.5), mupdf.ColorSpace.DeviceRGB, false, true);
  writeFileSync(`.cache/starboy-premium-review-p${index + 1}.png`, pix.asPNG());
  const links = p.getLinks();
  if (index > 0 && index < 8) {
    const prev = old.loadPage(index);
    const oldText = prev.toStructuredText("preserve-whitespace");
    // Comparing normalized text makes only the two cost-label changes and footer replacement permissible.
    let oldCompact = compact(oldText.asText());
    const footerNames = ["TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN"];
    const footer = `${String(index + 1).padStart(2, "0")} · DAY ${index === 1 ? "ONE" : footerNames[index - 2]}`;
    oldCompact = oldCompact.replace(compact(footer), compact("STARBOY PACKAGE · ALL INCLUSIVE"));
    if (index === 3 || index === 6) oldCompact = oldCompact.replaceAll("optional", "included");
    assert.equal(normalized, oldCompact, `Unapproved itinerary change on day ${index}`);
    let cursor = 0;
    const body = snapshot.spell.page.itinerary[index - 1].body.replaceAll("optional", "included");
    for (const para of body.split(/\n\s*\n/).filter((part) => part.trim())) {
      const token = compact(para);
      const found = normalized.indexOf(token, cursor);
      assert(found >= cursor, `Missing/reordered day ${index} paragraph`);
      cursor = found + token.length;
    }
    const oldPix = prev.toPixmap(mupdf.Matrix.scale(1.5, 1.5), mupdf.ColorSpace.DeviceRGB, false, true);
    const a = PNG.sync.read(Buffer.from(oldPix.asPNG()));
    const b = PNG.sync.read(Buffer.from(pix.asPNG()));
    // Unchanged days retain all pixels above the rebranded footer; cooking/ATV retain photo + heading.
    const cutoff = (index === 3 || index === 6 ? 290 : 780) * 1.5;
    assert(a.data.subarray(0, a.width * Math.floor(cutoff) * 4).equals(b.data.subarray(0, b.width * Math.floor(cutoff) * 4)), `Unapproved visual change on day ${index}`);
    assert.equal(links.length, 0);
    oldText.destroy(); oldPix.destroy(); prev.destroy();
  } else if (index === 0) {
    for (const term of ["STARBOY PACKAGE", "THE BLINDING NIGHTS SPELL", "9 to 15 OCTOBER 2026", "7 DAYS / 6 NIGHTS", "Our most premium way to experience", "Everything you need, included."]) assert(normalized.includes(compact(term)));
    const title = lines.find((line) => compact(line.text) === "starboy");
    assert(title && title.bbox.h > 65, "Cover title must dominate");
    assert.equal(links.length, 0);
  } else {
    const expected = ["YOUR STARBOY SPELL AWAITS", "EARLY BIRD INR 1,40,000 PER PERSON", "REGULAR INR 1,50,000 PER PERSON", "BOOK YOUR SPOT FOR JUST INR 20,000", "Pay ₹20,000 now to secure your spot.", "Pay the remaining amount later, before departure.", "5% GST + 2% TCS will be applicable.", "INCLUSIVE OF ALL", ...premium.inclusions, "REQUEST YOUR SPOT", "Ready to experience The Blinding Nights Spell with everything included?", "APPLY NOW", "Request your spot"];
    let cursor = 0;
    for (const term of expected) {
      const found = normalized.indexOf(compact(term), cursor);
      assert(found >= cursor, `Missing/reordered final-page term: ${term}`);
      cursor = found + compact(term).length;
    }
    assert.equal((text.match(/GST/g) ?? []).length, 1);
    assert(!text.includes("These taxes"));
    const amount = lines.find((line) => compact(line.text) === "inr20,000");
    assert(amount && amount.bbox.h > 45);
    for (const price of ["INR 1,40,000", "INR 1,50,000"]) {
      const priceLine = lines.find((line) => compact(line.text) === compact(price));
      assert(priceLine && amount.bbox.h > priceLine.bbox.h * 1.7);
    }
    assert.deepEqual(links.map((l) => l.getURI()), [form]);
    const rect = links[0].getBounds();
    [64, 841.89 - 148, 595.28 - 64, 841.89 - 82].forEach((v, i) => assert(Math.abs(v - rect[i]) < 0.01));
    for (const label of ["APPLY NOW", "Request your spot"]) {
      const line = lines.find((line) => line.bbox.y > rect[1] && compact(line.text) === compact(label));
      assert(line && line.bbox.x >= rect[0] && line.bbox.x + line.bbox.w <= rect[2] && line.bbox.y + line.bbox.h <= rect[3]);
    }
  }
  console.log(`PASS: Starboy page ${index + 1}: content, margins, package identity and links`);
  links.forEach((l) => l.destroy()); st.destroy(); pix.destroy(); p.destroy();
}
assert(texts[3].includes("Background extended with AI"));
const xoBytes = readFileSync(draft ? ".cache/starboy-grimoire-v13-draft.pdf" : xoName);
const xo = mupdf.Document.openDocument(xoBytes, "application/pdf");
assert.equal(xo.countPages(), 9);
for (let index = 0; index < 9; index++) {
  const a = xo.loadPage(index); const b = old.loadPage(index);
  const at = a.toStructuredText("preserve-whitespace"); const bt = b.toStructuredText("preserve-whitespace");
  assert.equal(at.asText(), bt.asText(), `XO text changed on page ${index + 1}`);
  const ap = a.toPixmap(mupdf.Matrix.scale(1.5, 1.5), mupdf.ColorSpace.DeviceRGB, false, true);
  const bp = b.toPixmap(mupdf.Matrix.scale(1.5, 1.5), mupdf.ColorSpace.DeviceRGB, false, true);
  assert.equal(hash(ap.asPNG()), hash(bp.asPNG()), `XO pixels changed on page ${index + 1}`);
  const al = a.getLinks(); const bl = b.getLinks();
  assert.deepEqual(al.map((l) => l.getBounds()), bl.map((l) => l.getBounds()));
  assert.deepEqual(al.map((l) => l.getURI()), index === 8 ? [`${origin}/brochures/${premium.fileName}`, form] : bl.map((l) => l.getURI()));
  [...al, ...bl].forEach((l) => l.destroy()); at.destroy(); bt.destroy(); ap.destroy(); bp.destroy(); a.destroy(); b.destroy();
}
console.log("PASS: XO v13 is text/pixel-identical on all 9 pages; only Starboy PDF link changed");
assert.deepEqual(warnings, []);
old.destroy(); doc.destroy(); xo.destroy();
for (const [name, content] of [[premium.fileName, bytes], [xoName, xoBytes]] as const) {
  if (process.argv.includes("--publish")) saveGrimoireCopy(`../web/public/brochures/${name}`, content);
  if (process.argv.includes("--live")) {
    const response = await fetch(`${origin}/brochures/${name}`, { cache: "no-store", signal: AbortSignal.timeout(30000) });
    assert(response.ok && response.headers.get("content-type")?.startsWith("application/pdf"));
    assert(content.equals(Buffer.from(await response.arrayBuffer())));
    console.log(`PASS: live PDF byte-identical with exported hyperlinks: ${name}`);
  }
  console.log(`${name}: ${content.length} bytes; SHA256 ${hash(content)}`);
}
