"""PDF-only crops for the Grimoire edition. Never write website photography."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

root = Path(__file__).resolve().parent
source = ImageOps.exif_transpose(Image.open(root / "img2/starboy-weeknd-landscape-v4.jpg")).convert("RGB")
cover_path = root / "img2/starboy-grimoire-cover-v6.jpg"
band_path = root / "img2/starboy-grimoire-concert-band-v6.jpg"

if not cover_path.exists():
    # Position the performer's face above the Grimoire title, using the existing photo.
    portrait = ImageOps.fit(source, (1191, 1000), Image.Resampling.LANCZOS, centering=(0.95, 0.05))
    canvas = Image.new("RGB", (1191, 1684), (10, 8, 6))
    canvas.paste(portrait, (0, 0))
    fade = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(fade)
    for y in range(480, 1000):
        draw.line((0, y, 1191, y), fill=(10, 8, 6, round(255 * (y - 480) / 519)))
    with cover_path.open("xb") as output:
        Image.alpha_composite(canvas.convert("RGBA"), fade).convert("RGB").save(output, "JPEG", quality=92, optimize=True)

if not band_path.exists():
    # Keep the face and microphone in the original template's 2.53:1 header strip.
    with band_path.open("xb") as output:
        ImageOps.fit(source, (1600, 632), Image.Resampling.LANCZOS, centering=(0.5, 0.18)).save(output, "JPEG", quality=92, optimize=True)

# Continuous alpha gradients avoid the seams produced by overlapping PDF rectangles.
for direction in ["up", "down"]:
    path = root / f"img2/starboy-grimoire-fade-{direction}-v6.png"
    if path.exists():
        continue
    gradient = Image.new("RGBA", (8, 2048))
    draw = ImageDraw.Draw(gradient)
    for y in range(2048):
        alpha = round(255 * y / 2047)
        draw.line((0, y, 8, y), fill=(10, 8, 6, alpha if direction == "down" else 255 - alpha))
    with path.open("xb") as output:
        gradient.save(output, "PNG", optimize=True)

print("PDF-only Grimoire cover, concert strip and gradients ready; website assets untouched")
