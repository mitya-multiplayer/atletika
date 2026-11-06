"""Build the home-screen icons from the supplied artwork (docs/assets/supplied_2026-11-06/app-icon.webp).

- iPhone (apple-touch-icon, 180 px) and Android / browser tab (192 and 512 px): the artwork as
  is, edge to edge. iOS only rounds the corners.
- Android maskable (512 px): launchers may cut this into a circle that keeps only the middle 80%.
  The athlete spans almost the full width, so the artwork is shrunk to fit the safe zone and its
  edge pixels are continued outward to fill the square (black top, cream floor at the bottom).

Run: python -I scripts/make-icons.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "assets" / "supplied_2026-11-06" / "app-icon.webp"
OUT = ROOT / "public" / "icons"

ICONS = {
    "apple-touch-icon.png": 180,
    "icon-192.png": 192,
    "icon-512.png": 512,
}
MASKABLE = ("icon-maskable-512.png", 512)
# Share of the maskable icon the artwork keeps; the athlete then fits the 80% safe circle.
MASKABLE_SCALE = 0.78


def save(im: Image.Image, size: int, name: str) -> None:
    dest = OUT / name
    im.resize((size, size), Image.LANCZOS).save(dest, "PNG", optimize=True)
    print(f"{dest.relative_to(ROOT)}  {size}x{size}  {dest.stat().st_size // 1024} KB")


def safe_zone(art: Image.Image, scale: float) -> Image.Image:
    """The artwork shrunk to `scale` of the square, its edges continued to fill the rest."""
    side = art.size[0]
    inner = round(side * scale)
    small = np.asarray(art.resize((inner, inner), Image.LANCZOS))
    before = (side - inner) // 2
    after = side - inner - before
    padded = np.pad(small, ((before, after), (before, after), (0, 0)), mode="edge")
    # Continuing the top edge upward turns the red stripes into vertical bars; use the
    # artwork's black there instead. The sides and the cream floor continue naturally.
    dark = small[small.mean(axis=2) < 30]
    padded[:before] = np.median(dark, axis=0).astype(np.uint8)
    return Image.fromarray(padded)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    art = Image.open(SRC).convert("RGB")
    for name, size in ICONS.items():
        save(art, size, name)
    name, size = MASKABLE
    save(safe_zone(art, MASKABLE_SCALE), size, name)


if __name__ == "__main__":
    main()
