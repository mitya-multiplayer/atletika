"""Build the home-screen icons from the supplied artwork (docs/assets/supplied_2026-11-05/app-icon.webp).

One image for every icon: iPhone (apple-touch-icon, 180 px) and Android and the browser tab
(192 and 512 px, plus the 512 px maskable icon). Its black margin keeps the athlete inside the
safe zone when a launcher cuts the icon into a circle or squircle, and blends into the black
background inside the rounded corners iOS adds.

Run: python -I scripts/make-icons.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "assets" / "supplied_2026-11-05" / "app-icon.webp"
OUT = ROOT / "public" / "icons"

ICONS = {
    "apple-touch-icon.png": 180,
    "icon-192.png": 192,
    "icon-512.png": 512,
    "icon-maskable-512.png": 512,
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    art = Image.open(SRC).convert("RGB")
    for name, size in ICONS.items():
        dest = OUT / name
        art.resize((size, size), Image.LANCZOS).save(dest, "PNG", optimize=True)
        print(f"{dest.relative_to(ROOT)}  {size}x{size}  {dest.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
