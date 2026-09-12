"""Optimize the six supplied Udaipur photographs without cropping or recolouring."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
NAMES = ("street", "steps", "workshop", "garden", "boat", "night")

for number, name in enumerate(NAMES, start=1):
    source = ROOT / "pdf-build" / ".cache" / f"udaipur-{number}-20260912.png"
    target = ROOT / "web" / "public" / f"udaipur-{name}-20260912-v1.webp"
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
        image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        # Published filenames are immutable; a new edition must use a new version.
        with target.open("xb") as output:
            image.save(output, format="WEBP", quality=88, method=6)
        assert target.stat().st_size < 1_500_000
        print(f"{number}: {target.name}, {image.width}x{image.height}, {target.stat().st_size} bytes")
