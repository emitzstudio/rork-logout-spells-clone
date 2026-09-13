"""Create new, aspect-preserving Full Moon derivatives; preserve all existing assets."""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).parent
public = root.parent / "web" / "public"
assets = {
    "thailand-full-moon-cover-v1.jpg": "full-moon-cover-v1.png",
    "thailand-krabi-islands-v1.jpg": "full-moon-krabi-v1.png",
    "thailand-samui-morning-v1.jpg": "full-moon-samui-v1.png",
}
for name, source in assets.items():
    original = Image.open(root / "raw" / source).convert("RGB")
    original.thumbnail((1600, 1800), Image.Resampling.LANCZOS)
    destination = public / name
    if destination.exists():
        raise RuntimeError(f"Refusing to replace published artwork: {destination}")
    original.save(destination, quality=90, optimize=True)

cover = Image.open(public / "thailand-full-moon-cover-v1.jpg").convert("RGB")
ImageOps.fit(cover, (1191, 1684), Image.Resampling.LANCZOS).save(root / "img2" / "full-moon-cover.jpg", quality=92, optimize=True)
for name in [*assets, "starboy-phuket-beach-20260911.jpg", "starboy-old-town-20260911.jpg"]:
    original = Image.open(public / name).convert("RGB")
    band = ImageOps.fit(original, (1600, 753), Image.Resampling.LANCZOS, centering=(0.5, 0.45))
    band.save(root / "img2" / f"full-moon-{Path(name).stem}-band.jpg", quality=91, optimize=True)
print("Prepared three new web images and six Grimoire derivatives.")
