"""Optimize the supplied All Girls Bir photos in upload order without cropping."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
NAMES = ("riverside", "circle", "monastery", "steps", "pottery", "workshop")

for number, name in enumerate(NAMES, start=1):
    extension = "png" if number == 6 else "jpg"
    source = ROOT / "pdf-build" / ".cache" / f"all-girls-bir-{number}-20260912.{extension}"
    target = ROOT / "web" / "public" / f"all-girls-bir-{name}-20260912-v1.webp"
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
        image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        # Never overwrite a published asset; use a new filename for later editions.
        with target.open("xb") as output:
            image.save(output, format="WEBP", quality=88, method=6)
        assert target.stat().st_size < 1_500_000
        print(f"{number}: {target.name}, {image.width}x{image.height}, {target.stat().st_size} bytes")
