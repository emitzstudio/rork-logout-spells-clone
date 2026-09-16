"""Prepare only new Europe artwork and correctly proportioned Grimoire crops."""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).parent
public = root.parent / "web" / "public"
cities = ["brussels", "bruges", "strasbourg", "colmar", "paris", "berlin", "prague", "amsterdam"]
for city in cities:
    name = f"europe-{city}-winter-v1"
    source = Image.open(root / "raw" / f"{name}.png").convert("RGB")
    destination = public / f"{name}.jpg"
    if destination.exists():
        raise RuntimeError(f"Refusing to overwrite {destination}")
    source.thumbnail((1600, 1800), Image.Resampling.LANCZOS)
    source.save(destination, quality=89, optimize=True)
    ImageOps.fit(source, (1600, 632), Image.Resampling.LANCZOS, centering=(0.5, 0.40)).save(root / "img2" / f"europe-{city}-band-v1.jpg", quality=89, optimize=True)
    if city == "brussels":
        ImageOps.fit(source, (1191, 1684), Image.Resampling.LANCZOS).save(root / "img2" / "europe-cover-v1.jpg", quality=91, optimize=True)
print("Prepared eight new website illustrations and nine Europe Grimoire crops.")
