"""Build app illustrations from the asset pack in docs/assets/visual_assets.

The originals stay untouched; this writes trimmed WebP copies into
src/assets/illustrations. Trims remove leftovers of the source screens
(heading letters, status bar, phone frame) found along some crop edges.

Run: python -I scripts/make-illustrations.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "assets" / "visual_assets" / "illustrations"
OUT = ROOT / "src" / "assets" / "illustrations"

# name -> (source file, (left, top, right, bottom) pixels to trim)
ILLUSTRATIONS = {
    "planche": ("01_home_planche_athlete.png", (0, 0, 0, 0)),
    "runner": ("02_runner_right.png", (0, 0, 0, 0)),
    "pushup-bars": ("03_push_up_bars.png", (0, 14, 20, 0)),
    "gears": ("04_settings_gears.png", (0, 22, 34, 0)),
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (filename, (left, top, right, bottom)) in ILLUSTRATIONS.items():
        im = Image.open(SRC / filename).convert("RGB")
        w, h = im.size
        im = im.crop((left, top, w - right, h - bottom))
        dest = OUT / f"{name}.webp"
        im.save(dest, "WEBP", quality=88, method=6)
        print(f"{dest.relative_to(ROOT)}  {im.size[0]}x{im.size[1]}  {dest.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
