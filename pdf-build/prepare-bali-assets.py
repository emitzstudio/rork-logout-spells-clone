"""Prepare only the new Bali Padel website illustrations from the reviewed raw renders."""
from pathlib import Path
from PIL import Image

root = Path(__file__).parent
public = root.parent / "web" / "public"
names = [
    "bali-padel-court-v1",
    "bali-kuta-beach-sunset-v1",
    "bali-clifftop-temple-dusk-v1",
    "bali-tegalalang-rice-terraces-v1",
    "bali-sunrise-surf-yoga-v1",
]
for name in names:
    source = Image.open(root / "raw" / f"{name}.png").convert("RGB")
    destination = public / f"{name}.jpg"
    if destination.exists():
        raise RuntimeError(f"Refusing to overwrite {destination}")
    source.thumbnail((1600, 1800), Image.Resampling.LANCZOS)
    source.save(destination, quality=89, optimize=True)
    print(f"{destination.name}: {source.size[0]}x{source.size[1]}, {destination.stat().st_size} bytes")
print("Prepared five new Bali website illustrations; nothing else was touched.")
