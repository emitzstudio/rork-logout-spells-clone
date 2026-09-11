"""Prepare immutable, locally served destination photography for the Starboy brochure and site."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

root = Path(__file__).resolve().parent
names = ["bangkok-night", "skyline", "phi-phi", "phuket-beach", "old-town", "concert"]
for name in names:
    source = root / "raw" / f"starboy-{name}.jpg"
    target = root.parent / "web/public" / f"starboy-{name}-20260911.jpg"
    if target.exists():
        print(f"Retained {target.name}")
        continue
    image = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
    image.thumbnail((1600, 1800), Image.Resampling.LANCZOS)
    image.save(target, "JPEG", quality=87, optimize=True)
    print(f"Prepared {target.name}: {image.size}")

# The existing Grimoire renderer expects ready-cropped images, never distorted originals.
for name in names:
    source = ImageOps.exif_transpose(Image.open(root / "raw" / f"starboy-{name}.jpg")).convert("RGB")
    target = root / "img2" / f"starboy-{name}-band.jpg"
    cropped = ImageOps.fit(source, (1600, 632), Image.Resampling.LANCZOS, centering=(0.5, 0.65 if name == "concert" else 0.5))
    if not target.exists():
        cropped.save(target, "JPEG", quality=90, optimize=True)
for name, role in [("bangkok-night", "cover"), ("phi-phi", "final")]:
    source = ImageOps.exif_transpose(Image.open(root / "raw" / f"starboy-{name}.jpg")).convert("RGB")
    target = root / "img2" / f"starboy-{role}.jpg"
    if not target.exists():
        ImageOps.fit(source, (1191, 1684), Image.Resampling.LANCZOS).save(target, "JPEG", quality=90, optimize=True)

# Licensed archive performance photo; position the face above the cover text.
weeknd = ImageOps.exif_transpose(Image.open(root / "raw/starboy-weeknd-feq-2018.jpg")).convert("RGB")
web_photo = weeknd.copy()
web_photo.thumbnail((1800, 1800), Image.Resampling.LANCZOS)
web_photo.save(root.parent / "web/public/starboy-weeknd-live-20260911-v2.jpg", "JPEG", quality=90, optimize=True)
ImageOps.fit(weeknd, (1600, 632), Image.Resampling.LANCZOS, centering=(0.5, 0.32)).save(root / "img2/starboy-weeknd-band-v2.jpg", "JPEG", quality=92, optimize=True)

for role, size, photo_height in [("cover", (1191, 1684), 1120), ("mobile", (1000, 2000), 1170)]:
    canvas = Image.new("RGB", size, (10, 8, 6))
    portrait = weeknd.crop((900, 120, 2360, 1620))
    portrait = ImageOps.fit(portrait, (size[0], photo_height), Image.Resampling.LANCZOS, centering=(0.5, 0.15))
    canvas.paste(portrait, (0, 0))
    fade = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(fade)
    start = photo_height - 340
    for y in range(start, photo_height):
        draw.line((0, y, size[0], y), fill=(10, 8, 6, round(255 * (y - start) / (photo_height - start - 1))))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), fade).convert("RGB")
    target = root / "img2/starboy-weeknd-cover-v2.jpg" if role == "cover" else root.parent / "web/public/starboy-weeknd-mobile-20260911-v2.jpg"
    canvas.save(target, "JPEG", quality=92, optimize=True)
    print(f"Prepared Weeknd {role}: {size}")
