"""Prepare only the new Goa website illustrations and Grimoire crops from the reviewed raw renders."""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).parent
public = root.parent / "web" / "public"
names = [
    "goa-chapora-fort-sunset-v1",
    "goa-vagator-beach-v1",
    "goa-harvalem-waterfall-v1",
    "goa-mhadei-rafting-v1",
    "goa-fontainhas-v1",
    "goa-cabo-de-rama-v1",
    "goa-palolem-sunrise-v1",
]
for name in names:
    source = Image.open(root / "raw" / f"{name}.png").convert("RGB")
    destination = public / f"{name}.jpg"
    if destination.exists():
        raise RuntimeError(f"Refusing to overwrite {destination}")
    source.thumbnail((1600, 1800), Image.Resampling.LANCZOS)
    source.save(destination, quality=89, optimize=True)
    print(f"{destination.name}: {source.size[0]}x{source.size[1]}, {destination.stat().st_size} bytes")
    if name == "goa-chapora-fort-sunset-v1":
        cover = root / "img2" / "goa-cover-v1.jpg"
        if cover.exists():
            raise RuntimeError(f"Refusing to overwrite {cover}")
        ImageOps.fit(source, (1191, 1684), Image.Resampling.LANCZOS).save(cover, quality=88, optimize=True)
        continue
    band = root / "img2" / f"{name.replace('-v1', '')}-band-v1.jpg"
    if band.exists():
        raise RuntimeError(f"Refusing to overwrite {band}")
    ImageOps.fit(source, (1600, 632), Image.Resampling.LANCZOS, centering=(0.5, 0.45)).save(band, quality=86, optimize=True)
print("Prepared seven new Goa website illustrations, six Grimoire bands and one cover; nothing else was touched.")
