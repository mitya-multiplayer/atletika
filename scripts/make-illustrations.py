"""Build app illustrations from the originals in docs/assets.

The originals stay untouched; this writes trimmed WebP copies into
src/assets/illustrations. Trims remove leftovers found along some crop edges
(heading letters, status bar, phone frame, or a neighbouring icon).

Run: python -I scripts/make-illustrations.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "assets"
OUT = ROOT / "src" / "assets" / "illustrations"

# name -> (source file under docs/assets, (left, top, right, bottom) pixels to trim)
ILLUSTRATIONS = {
    # 1392x1400 poster, already in the app's black and cream (replaced the wide 2026-11-08 one).
    "planche": ("supplied_2026-11-08/home-planche-square.png", (0, 0, 0, 0)),
    # 1196x896, supplied 2026-11-09 (replaced the asset pack's 02_runner_right.png).
    "runner": ("supplied_2026-11-09/days-runner-right.png", (0, 0, 0, 0)),
    "pushup-bars": ("visual_assets/illustrations/03_push_up_bars.png", (0, 14, 20, 0)),
    "gears": ("visual_assets/illustrations/04_settings_gears.png", (0, 22, 34, 0)),
    # 1344x756 (16:9) clipboard and pen for the history screens, supplied 2026-11-09.
    "clipboard": ("supplied_2026-11-09/history-clipboard.png", (0, 0, 0, 0)),
    # Background for headers without an illustration (Program, History, …).
    "header-bg": ("supplied_2026-11-05/header-background.png", (0, 0, 0, 0)),
}

# Its black (#0D0D0B) is lighter than the app background (#070706) and would show as a grey
# rectangle. This curve lowers dark values by up to 6 and leaves bright ones intact.
MATCH_APP_BACKGROUND = {"header-bg"}


def darken_blacks(im: Image.Image) -> Image.Image:
    return im.point(lambda v: round(max(0, v - 6 * (1 - v / 255))))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (filename, (left, top, right, bottom)) in ILLUSTRATIONS.items():
        im = Image.open(SRC / filename).convert("RGB")
        w, h = im.size
        im = im.crop((left, top, w - right, h - bottom))
        if name in MATCH_APP_BACKGROUND:
            im = darken_blacks(im)
        dest = OUT / f"{name}.webp"
        im.save(dest, "WEBP", quality=88, method=6)
        print(f"{dest.relative_to(ROOT)}  {im.size[0]}x{im.size[1]}  {dest.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
