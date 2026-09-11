"""Prepare immutable, locally served destination photography for the Starboy brochure and site."""
from pathlib import Path
from PIL import Image, ImageOps

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
