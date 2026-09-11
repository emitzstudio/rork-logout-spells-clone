"""Versioned cinematic derivatives. Never overwrites earlier photography or PDFs."""
from pathlib import Path
from shutil import copyfile
from PIL import Image, ImageOps, ImageEnhance

ROOT = Path(__file__).resolve().parent
WEB = ROOT.parent / "web/public"
original = ROOT / "raw/starboy-weeknd-red-user-v4.jpeg"
extended = Image.open(ROOT / "raw/starboy-weeknd-ai-extended-v4.png").convert("RGB")
# Web uses the whole outpaint, without stretching. Portrait keeps the exact upload.
extended.save(WEB / "starboy-weeknd-stage-v4.webp", quality=94, method=6)
copyfile(original, WEB / "starboy-weeknd-portrait-v4.jpeg")
copyfile(ROOT / "fonts/BarlowCondensed-Bold.ttf", WEB / "barlow-condensed-bold-v1.ttf")
copyfile(ROOT / "fonts/BarlowCondensed-OFL.txt", WEB / "barlow-condensed-license.txt")
# Full-height, non-distorted source images; the PDF renderer handles crop geometry.
extended.save(ROOT / "img2/starboy-weeknd-landscape-v4.jpg", quality=97, subsampling=0)
portrait = Image.open(original).convert("RGB")
portrait.save(ROOT / "img2/starboy-weeknd-portrait-v4.jpg", quality=97, subsampling=0)
for name in ["bangkok-night", "skyline", "phuket-beach", "phi-phi", "old-town"]:
    image = Image.open(ROOT / f"raw/starboy-{name}.jpg").convert("RGB")
    image = ImageEnhance.Color(image).enhance(0.75)
    image = ImageEnhance.Contrast(image).enhance(1.12)
    image.thumbnail((1800, 1800), Image.Resampling.LANCZOS)
    image.save(ROOT / f"img2/starboy-{name}-cinematic-v4.jpg", quality=94)
# A raster alpha gradient avoids hairline seams between translucent PDF rectangles.
gradient = Image.new("RGBA", (1, 1024))
gradient.putdata([(9, 9, 9, round(255 * i / 1023)) for i in range(1024)])
gradient.save(ROOT / "img2/starboy-fade-v4.png")
print("Prepared version-4 photography and shared concert font; original upload retained byte-for-byte.")
