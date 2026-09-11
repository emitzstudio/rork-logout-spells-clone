"""Prepare immutable website images from the supplied portrait and brochure assets."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT.parent / "web" / "public"
SOURCES = {
    "content-bir-hero-20260911.jpg": "img/cover.jpg",
    "content-anshika-host-20260911.jpg": "raw/anshika-host-20260911.png",
    "content-qudrat-20260911.jpg": "img/content-real/qudrat.jpg",
    "content-circle-20260911.jpg": "img/content-real/day1-circle.jpg",
    "content-chokling-20260911.jpg": "img/content-real/day1-chokling.jpg",
    "content-pottery-20260911.jpg": "img/content-real/day2-pottery-people.jpg",
    "content-farewell-20260911.jpg": "img/content-real/day3-farewell.jpg",
    "content-walk-20260911.jpg": "img/content-real/day3-walk.jpg",
}

for name, source in SOURCES.items():
    target = PUBLIC / name
    if target.exists():
        raise RuntimeError(f"Refusing to overwrite immutable asset: {name}")
    with Image.open(ROOT / source) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
        if "host" in name:
            # Keep the supplied face and outfit in the site's portrait card ratio.
            image = ImageOps.fit(image, (800, 1000), centering=(0.5, 0.5))
        else:
            image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        image.save(target, "JPEG", quality=90, optimize=True, progressive=True)
        print(f"Prepared {name}: {image.width}x{image.height}")
