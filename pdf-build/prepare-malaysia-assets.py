"""Prepare the Malaysia website illustrations and Grimoire crops from the reviewed raw renders.

Sources: AI-generated atmospheric illustrations (see malaysia-image-sources.json); not photographs
of the venues, the concert or the event. Refuses to overwrite anything already published.
"""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).parent
public = root.parent / "web" / "public"
cover_name = "mys-petronas-cover"
day_names = [
    "mys-jalan-alor",
    "mys-bukit-jalil-concert",
    "mys-petronas-klcc",
    "mys-cameron-highlands",
    "mys-george-town",
    "mys-monkey-beach",
    "mys-penang-dawn",
]
gallery_only = ["mys-batu-caves"]
for name in [cover_name, *day_names, *gallery_only]:
    source = Image.open(root / "raw" / f"{name}-v1.png").convert("RGB")
    destination = public / f"{name}-v1.jpg"
    if destination.exists():
        raise RuntimeError(f"Refusing to overwrite {destination}")
    source.thumbnail((1600, 1800), Image.Resampling.LANCZOS)
    source.save(destination, quality=89, optimize=True)
    print(f"{destination.name}: {source.size[0]}x{source.size[1]}, {destination.stat().st_size} bytes")
    if name == cover_name:
        # A4 portrait crop at the render's native width; no upscaling.
        cover = root / "img2" / "mys-cover-v1.jpg"
        if cover.exists():
            raise RuntimeError(f"Refusing to overwrite {cover}")
        ImageOps.fit(source, (1024, 1448), Image.Resampling.LANCZOS, centering=(0.5, 0.5)).save(cover, quality=88, optimize=True)
        continue
    if name in gallery_only:
        continue
    # The 235pt day band at the render's native width (1536 x 607 keeps the W/235 ratio within tolerance).
    band = root / "img2" / f"{name}-band-v1.jpg"
    if band.exists():
        raise RuntimeError(f"Refusing to overwrite {band}")
    ImageOps.fit(source, (1536, 607), Image.Resampling.LANCZOS, centering=(0.5, 0.45)).save(band, quality=86, optimize=True)
print("Prepared nine Malaysia website illustrations, seven Grimoire bands and one cover; nothing else was touched.")
