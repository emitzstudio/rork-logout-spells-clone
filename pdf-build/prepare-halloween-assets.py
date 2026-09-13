"""Prepare only new versioned Halloween artwork and PDF crops."""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).parent
public = root.parent / "web" / "public"
names = ["bangkok-cover", "floating-market", "thai-farm", "chiang-mai", "northern-waterfall"]
for name in names:
    source = Image.open(root / "raw" / f"halloween-{name}-v1.png").convert("RGB")
    source.thumbnail((1600, 1800), Image.Resampling.LANCZOS)
    destination = public / f"halloween-{name}-v1.jpg"
    if destination.exists():
        raise RuntimeError(f"Refusing to overwrite {destination}")
    source.save(destination, quality=91, optimize=True)
    ImageOps.fit(source, (1600, 632), Image.Resampling.LANCZOS, centering=(0.5, 0.42)).save(root / "img2" / f"halloween-{name}-band-v1.jpg", quality=91, optimize=True)
    if name == "bangkok-cover":
        ImageOps.fit(source, (1191, 1684), Image.Resampling.LANCZOS).save(root / "img2" / "halloween-cover-v1.jpg", quality=92, optimize=True)
print("Prepared five new website artworks and six correctly cropped Grimoire images.")
