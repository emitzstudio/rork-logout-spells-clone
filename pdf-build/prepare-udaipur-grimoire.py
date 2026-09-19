"""Prepare the Udaipur Grimoire's page photographs from the live spell's saved images.

Every source is a photograph already saved on the published Udaipur spell (hero, itinerary,
gallery and stay images). Nothing is regenerated: the cover and closing pages are the saved
landscape photographs placed on a portrait charcoal canvas and faded into the page colour,
the day bands are proportional crops, and the stay photograph is copied as supplied.

Run from pdf-build:  python3 prepare-udaipur-grimoire.py
Outputs go to img/udaipur/ and are recorded in img/udaipur/sources.json. Existing outputs are
never overwritten; delete the folder to rebuild it.
"""
from __future__ import annotations

import io
import json
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "img" / "udaipur"
BASE = "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/dc753201-d070-4404-9b10-038d9746ad89"
DEEP = (10, 8, 6)
PAGE = (1191, 1684)  # A4 at 144 dpi, the size of the existing Bir cover and night artwork

SOURCES = {
    "hero": f"{BASE}/hd/hero-udaipur-cover.jpg",
    "dinner": f"{BASE}/hd/lakeside-dinner.jpg",
    "stay-group": f"{BASE}/page/img-1789041107007-vvl4b-68c57e97-3d0a.jpg",
    "jagdish": f"{BASE}/hd/day-1-jagdish.jpg",
    "market": f"{BASE}/hd/old-city-market.jpg",
    "saheliyon": f"{BASE}/hd/day-2-saheliyon.jpg",
    "lake-palace": f"{BASE}/hd/boat-island.jpg",
    "chittorgarh": f"{BASE}/hd/day-3-chittorgarh.jpg",
}


def fetch(url: str) -> Image.Image:
    with urllib.request.urlopen(url, timeout=30) as response:
        data = response.read()
    image = ImageOps.exif_transpose(Image.open(io.BytesIO(data)))
    return image.convert("RGB")


def fit_width(image: Image.Image, width: int) -> Image.Image:
    height = round(image.height * width / image.width)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def vertical_fade(canvas: Image.Image, top: int, bottom: int, colour: tuple[int, int, int], start: float, end: float) -> None:
    """Blend rows top..bottom towards colour, from `start` opacity at the top row to `end` at the bottom row."""
    top = max(0, top)
    bottom = min(canvas.height, bottom)
    rows = bottom - top
    if rows <= 0:
        return
    overlay = Image.new("RGB", canvas.size, colour)
    mask = Image.new("L", canvas.size, 0)
    column = Image.new("L", (1, rows))
    column.putdata([round(255 * (start + (end - start) * y / max(1, rows - 1))) for y in range(rows)])
    mask.paste(column.resize((canvas.width, rows), Image.Resampling.NEAREST), (0, top))
    if bottom < canvas.height and end >= 0.999:
        mask.paste(255, (0, bottom, canvas.width, canvas.height))
    canvas.paste(overlay, (0, 0), mask)


def portrait_page(image: Image.Image, *, offset: int, fade_from: int, dusk: float = 0.0) -> Image.Image:
    """Place a landscape photograph on the portrait page canvas; the page colour takes over below it."""
    photo = fit_width(image, PAGE[0])
    canvas = Image.new("RGB", PAGE, DEEP)
    canvas.paste(photo, (0, offset))
    if offset > 0:
        vertical_fade(canvas, offset, offset + 220, DEEP, 1.0, 0.0)
    if dusk > 0:
        vertical_fade(canvas, offset, offset + int(photo.height * 0.45), DEEP, dusk, 0.0)
    vertical_fade(canvas, fade_from, offset + photo.height, DEEP, 0.0, 1.0)
    return canvas


def band(image: Image.Image, ratio: float, anchor: float) -> Image.Image:
    """Crop to the day-band ratio; anchor 0 keeps the top of the frame, 1 the bottom."""
    width = image.width
    height = round(width / ratio)
    if height > image.height:
        height = image.height
        width = round(height * ratio)
    left = (image.width - width) // 2
    top = round((image.height - height) * anchor)
    return image.crop((left, top, left + width, top + height))


def save(name: str, image: Image.Image, quality: int = 90) -> str:
    target = OUT / name
    if target.exists():
        raise RuntimeError(f"Refusing to overwrite prepared artwork: {target}")
    image.save(target, "JPEG", quality=quality, optimize=True, progressive=True)
    print(f"Prepared {name}: {image.width}x{image.height}")
    return f"img/udaipur/{name}"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    images = {key: fetch(url) for key, url in SOURCES.items()}
    for key, image in images.items():
        print(f"Fetched {key}: {image.width}x{image.height}")

    manifest = {
        "method": "Saved photographs of the published Udaipur spell only. Landscape pages are placed on the brochure's portrait charcoal canvas and faded into the page colour; day bands are proportional crops; the stay photograph is unmodified. No scene, face or detail is regenerated.",
        "photos": [],
    }

    def record(page: str, role: str, key: str, path: str, note: str) -> None:
        manifest["photos"].append({"page": page, "role": role, "image": path, "sourceUrl": SOURCES[key], "note": note})

    # Cover: the palace keeps the upper half; the sky is dusked so the gold logo reads, the lake fades under the title.
    cover = portrait_page(images["hero"], offset=0, fade_from=520, dusk=0.55)
    record("1", "cover", "hero", save("cover.jpg", cover), "Full-width placement at the top of the page; lake faded into the page colour beneath the title.")

    # Closing page: the lit City Palace sits below the headline, the candle-lit table fades under the booking panel.
    night = portrait_page(images["dinner"], offset=150, fade_from=700)
    record("7", "closing background", "dinner", save("night.jpg", night), "Placed 150 px below the top edge so the headline sits in the night sky; table faded into the page colour.")

    record("2", "stay", "stay-group", save("stay.jpg", images["stay-group"], 92), "The saved stay photograph, copied unmodified; the renderer letterboxes it proportionally.")

    record("3", "day band, left", "jagdish", save("day1-jagdish.jpg", images["jagdish"], 88), "Unmodified; paired proportionally with the bazaar photograph.")
    record("3", "day band, right", "market", save("day1-bazaar.jpg", images["market"], 88), "Unmodified; paired proportionally with the Jagdish Temple photograph.")
    record("4", "day band, left", "saheliyon", save("day2-saheliyon.jpg", images["saheliyon"], 88), "Unmodified; paired proportionally with the lake photograph.")
    record("4", "day band, right", "lake-palace", save("day2-lake.jpg", images["lake-palace"], 88), "Unmodified; paired proportionally with the Saheliyon Ki Bari photograph.")

    chittorgarh = band(images["chittorgarh"], 1190 / 470, 0.3)
    record("5", "day band", "chittorgarh", save("day3-chittorgarh.jpg", chittorgarh, 88), "Proportional crop to the single-band ratio, keeping the Vijay Stambh and the sunset sky.")

    (OUT / "sources.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print("Recorded img/udaipur/sources.json")


if __name__ == "__main__":
    main()
