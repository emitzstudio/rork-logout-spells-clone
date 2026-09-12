"""Optimize the six supplied Darjeeling photos in upload order, without cropping."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
NAMES = ("cameras", "forest-circle", "evening-circle", "conversations", "clouds", "steps")
RATIOS = (3 / 2, 2 / 3, 3 / 2, 3 / 4, 3 / 2, 2 / 3)

for number, (name, ratio) in enumerate(zip(NAMES, RATIOS), start=1):
    source = ROOT / "pdf-build" / ".cache" / f"darjeeling-{number}-20260912.jpg"
    target = ROOT / "web" / "public" / f"darjeeling-{name}-20260912-v1.webp"
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
        assert abs(image.width / image.height - ratio) < 0.002
        image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        with target.open("xb") as output:
            image.save(output, format="WEBP", quality=88, method=6)
        assert target.stat().st_size < 1_500_000
        print(f"{number}: {target.name}, {image.width}x{image.height}, {target.stat().st_size} bytes")
