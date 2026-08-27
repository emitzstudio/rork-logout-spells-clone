/**
 * Reads the founder's QR screenshot, decodes the payload, and regenerates a
 * crisp print-quality QR (charcoal on white) as qr-clean.png.
 * Falls back with exit code 2 if the screenshot can't be decoded.
 */
import { readFileSync } from "fs";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import QRCode from "qrcode";

const png = PNG.sync.read(readFileSync("qr.png"));
const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);

if (code && code.data && code.data.length > 0) {
  console.log("QR decoded. Payload starts with:", code.data.slice(0, 40));
  await QRCode.toFile("qr-clean.png", code.data, {
    width: 720,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#141412", light: "#FFFFFF" },
  });
  console.log("Regenerated crisp QR at qr-clean.png");
} else {
  console.log("DECODE FAILED - will fall back to cropping the screenshot");
  process.exit(2);
}
