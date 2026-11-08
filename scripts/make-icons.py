"""Build the home-screen icons from the supplied artwork (docs/assets/supplied_2026-11-08/app-icon-runner.png).

- iPhone (apple-touch-icon, 180 px) and Android / browser tab (192 and 512 px): the artwork as
  is, edge to edge. iOS only rounds the corners.
- Android maskable (512 px): launchers may cut this into a circle that keeps only the middle 80%.
  The runner's head reaches almost to the top-right corner, so the artwork is shrunk until it fits
  that circle, and the margin around it continues the red band (its two edges are straight
  lines). The back leg, which runs out of the artwork at the bottom left, ends on a vertical cut
  at the artwork's left edge, with the band going on past it.

Run: python -I scripts/make-icons.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "assets" / "supplied_2026-11-08" / "app-icon-runner.png"
OUT = ROOT / "public" / "icons"

ICONS = {
    "apple-touch-icon.png": 180,
    "icon-192.png": 192,
    "icon-512.png": 512,
}
MASKABLE = ("icon-maskable-512.png", 512)
# Share of the maskable icon the artwork keeps. The farthest point of the runner (the top of his
# head) is 0.505 of the side from the centre; at 0.75 it sits at 0.38, inside the 0.40 circle.
MASKABLE_SCALE = 0.75
# The margin is drawn this many times larger than the icon, then scaled down to smooth its edges.
SUPERSAMPLE = 4

# Lines measured on the 891 px artwork, as y = slope * x + offset (y down, x right). Each fits its
# edge to within a pixel.
BAND_TOP = (-0.5885, 523.0)  # left edge at y 523 to the top-right corner
BAND_BOTTOM = (-1.092, 298 + 1.092 * 890)  # right edge at y 298 to the bottom edge at x 347
LEG_TOP = 792.0  # top of the back leg (its cream highlight) at the left edge
LEG_FRONT = (-0.9, 890 + 0.9 * 11)  # the leg's front edge, to the bottom edge at x 11
ART_SIDE = 891


def save(im: Image.Image, size: int, name: str) -> None:
    dest = OUT / name
    im.resize((size, size), Image.LANCZOS).save(dest, "PNG", optimize=True)
    print(f"{dest.relative_to(ROOT)}  {size}x{size}  {dest.stat().st_size // 1024} KB")


def line(spec: tuple[float, float], x: np.ndarray) -> np.ndarray:
    slope, offset = spec
    return slope * x + offset


def colour(art: np.ndarray, mask: np.ndarray) -> np.ndarray:
    return np.median(art[mask], axis=0).astype(np.uint8)


def maskable(art: Image.Image, side: int, scale: float) -> Image.Image:
    """The artwork shrunk to `scale` of a `side` square, its band and leg continued around it."""
    a = np.asarray(art)
    assert a.shape[0] == a.shape[1] == ART_SIDE, "the measured lines belong to the 891 px artwork"
    black = colour(a, a.mean(axis=2) < 30)
    red = colour(a, (a[:, :, 0] > 150) & (a[:, :, 1] < 100))

    inner = round(side * scale)
    before = (side - inner) // 2
    # Every pixel of the square, in the artwork's own coordinates (outside it below 0 or above 891).
    ys, xs = np.mgrid[0:side, 0:side].astype(float)
    x = (xs + 0.5 - before) * ART_SIDE / inner
    y = (ys + 0.5 - before) * ART_SIDE / inner

    out = np.empty((side, side, 3), np.uint8)
    out[:] = black
    out[(y >= line(BAND_TOP, x)) & (y <= line(BAND_BOTTOM, x))] = red
    # Below the artwork the leg's front edge runs on to the cut (x = 0); left of the cut, only band.
    leg = (x >= 0) & (y >= LEG_TOP) & (x <= (y - LEG_FRONT[1]) / LEG_FRONT[0])
    out[leg] = black

    out[before:before + inner, before:before + inner] = np.asarray(art.resize((inner, inner), Image.LANCZOS))
    return Image.fromarray(out)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    art = Image.open(SRC).convert("RGB")
    for name, size in ICONS.items():
        save(art, size, name)
    name, size = MASKABLE
    save(maskable(art, size * SUPERSAMPLE, MASKABLE_SCALE), size, name)


if __name__ == "__main__":
    main()
