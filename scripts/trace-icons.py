"""Trace supplied raster icons into SVG paths for src/lib/ui/Icon.svelte.

Prints path data on the 64x64 icon grid (artwork fitted into 8-56, like the
rest of the set). Paste the output into the ICONS table.

- chart:    three rounded bars, measured from docs/assets/supplied_2026-11-04/history-chart.png
- gear:     filled gear with a round hole, traced radially from the gear at the
            right of docs/assets/supplied_2026-11-04/home-planche-and-gear.webp
- dumbbell: filled dumbbell measured from the «Программа» tile of the home reference
            docs/assets/reference_screens/Атлетика_ День 2.png, rebuilt symmetric

Run: python -I scripts/trace-icons.py
"""
import math
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "assets" / "supplied_2026-11-04"
BOX = (8.0, 56.0)  # artwork area on the 64x64 grid


def fmt(v: float) -> str:
    return f"{v:.2f}".rstrip("0").rstrip(".")


def rounded_rect(x: float, y: float, w: float, h: float, r: float) -> str:
    return (
        f"M{fmt(x + r)} {fmt(y)}h{fmt(w - 2 * r)}a{fmt(r)} {fmt(r)} 0 0 1 {fmt(r)} {fmt(r)}"
        f"v{fmt(h - 2 * r)}a{fmt(r)} {fmt(r)} 0 0 1 {fmt(-r)} {fmt(r)}h{fmt(-(w - 2 * r))}"
        f"a{fmt(r)} {fmt(r)} 0 0 1 {fmt(-r)} {fmt(-r)}v{fmt(-(h - 2 * r))}a{fmt(r)} {fmt(r)} 0 0 1 {fmt(r)} {fmt(-r)}Z"
    )


def chart() -> str:
    alpha = np.asarray(Image.open(SRC / "history-chart.png").convert("RGBA"))[..., 3] > 127
    cols = np.nonzero(alpha.any(axis=0))[0]
    bars = np.split(cols, np.where(np.diff(cols) > 1)[0] + 1)
    boxes = []
    for bar in bars:
        rows = np.nonzero(alpha[:, bar[0] : bar[-1] + 1].any(axis=1))[0]
        boxes.append((bar[0], rows[0], bar[-1] + 1, rows[-1] + 1))
    left, top = min(b[0] for b in boxes), min(b[1] for b in boxes)
    right, bottom = max(b[2] for b in boxes), max(b[3] for b in boxes)
    scale = (BOX[1] - BOX[0]) / max(right - left, bottom - top)
    ox = 32 - (right - left) * scale / 2
    oy = 32 - (bottom - top) * scale / 2
    # Corner radius: how many rows the first bar needs to reach its full width.
    first = boxes[0]
    widths = alpha[first[1] : first[3], first[0] : first[2]].sum(axis=1)
    radius = (int(np.argmax(widths >= widths.max())) + 1) * scale
    return "".join(
        rounded_rect(ox + (x0 - left) * scale, oy + (y0 - top) * scale, (x1 - x0) * scale, (y1 - y0) * scale, radius)
        for x0, y0, x1, y1 in boxes
    )


def rdp(points: list[tuple[float, float]], eps: float) -> list[tuple[float, float]]:
    """Ramer-Douglas-Peucker polyline simplification."""
    if len(points) < 3:
        return points
    (x1, y1), (x2, y2) = points[0], points[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = math.hypot(dx, dy) or 1.0
    dists = [abs(dy * (x - x1) - dx * (y - y1)) / norm for x, y in points[1:-1]]
    i = int(np.argmax(dists)) + 1
    if dists[i - 1] > eps:
        return rdp(points[: i + 1], eps)[:-1] + rdp(points[i:], eps)
    return [points[0], points[-1]]


def gear() -> str:
    lum = np.asarray(Image.open(SRC / "home-planche-and-gear.webp").convert("L")).astype(float)
    region = lum[:, 1392:]
    dark = region < 128
    ys, xs = np.nonzero(dark)
    # The bounding box centre; the hole makes the pixel centroid unreliable.
    cx, cy = (xs.min() + xs.max() + 1) / 2, (ys.min() + ys.max() + 1) / 2
    size = max(xs.max() - xs.min() + 1, ys.max() - ys.min() + 1)
    scale = (BOX[1] - BOX[0]) / size

    def edge_along(theta: float, outer: bool) -> float:
        """Sub-pixel radius where the ray crosses the 50% edge (outer or hole edge)."""
        rs = np.arange(0, size, 0.25)
        x = np.clip((cx + rs * math.cos(theta)).astype(int), 0, region.shape[1] - 1)
        y = np.clip((cy + rs * math.sin(theta)).astype(int), 0, region.shape[0] - 1)
        inside = region[y, x] < 128
        idx = np.nonzero(inside)[0]
        return rs[idx[-1]] if outer else rs[idx[0]]

    angles = [math.radians(a / 2) for a in range(720)]
    outer = [(32 + edge_along(t, True) * scale * math.cos(t), 32 + edge_along(t, True) * scale * math.sin(t)) for t in angles]
    # Simplify the closed loop as two open halves: RDP needs distinct end points.
    half = len(outer) // 2
    outline = rdp(outer[: half + 1], 0.12)[:-1] + rdp(outer[half:] + [outer[0]], 0.12)[:-1]
    hole = float(np.median([edge_along(t, False) for t in angles])) * scale

    path = "M" + "L".join(f"{fmt(x)} {fmt(y)}" for x, y in outline) + "Z"
    # The hole as two arcs; the icon fills with fill-rule="evenodd".
    path += f"M{fmt(32 + hole)} 32a{fmt(hole)} {fmt(hole)} 0 1 0 {fmt(-2 * hole)} 0a{fmt(hole)} {fmt(hole)} 0 1 0 {fmt(2 * hole)} 0Z"
    return path


def dumbbell() -> str:
    """Pill-shaped inner plates joined by the bar (one outline), plus outer plates
    rounded on their outer side. Measured on the left and right, then averaged."""
    lum = np.asarray(Image.open(ROOT / "docs" / "assets" / "reference_screens" / "Атлетика_ День 2.png").convert("L"))
    dark = lum[1380:1510, 340:605] < 90  # the «Программа» tile, above its label
    ys, xs = np.nonzero(dark)
    icon = dark[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
    width, height = icon.shape[1], icon.shape[0]
    cols = icon.sum(axis=0)

    gaps = np.nonzero(cols == 0)[0]
    left_gap, right_gap = gaps[gaps < width / 2], gaps[gaps > width / 2]
    outer_w = (left_gap[0] + (width - 1 - right_gap[-1])) / 2
    gap_w = (len(left_gap) + len(right_gap)) / 2
    bar_h = float(np.median(cols[int(width * 0.4) : int(width * 0.6)]))
    inner_l = np.nonzero(cols[left_gap[-1] + 1 :] <= bar_h + 2)[0][0]
    inner_r = np.nonzero(cols[: right_gap[0]][::-1] <= bar_h + 2)[0][0]
    inner_w = (inner_l + inner_r) / 2
    outer_h = float(cols[: left_gap[0]].max() + cols[right_gap[-1] + 1 :].max()) / 2
    # Outer plates reach full height after about half their width: radius ≈ that run.
    outer_r = min(outer_w / 2, float(np.argmax(cols[: left_gap[0]] >= outer_h - 1)) + 1)

    scale = (BOX[1] - BOX[0]) / width
    ox, oy = 32 - width * scale / 2, 32 - height * scale / 2
    X = lambda x: fmt(ox + x * scale)
    Y = lambda y: fmt(oy + y * scale)
    R = lambda r: fmt(r * scale)

    a, b = outer_w + gap_w, outer_w + gap_w + inner_w  # left inner plate
    a2, b2 = width - b, width - a  # right inner plate
    r = inner_w / 2
    top, bottom = 0.0, float(height)
    c, d = (height - bar_h) / 2, (height + bar_h) / 2  # bar
    body = (
        f"M{X(a)} {Y(top + r)}A{R(r)} {R(r)} 0 0 1 {X(b)} {Y(top + r)}V{Y(c)}H{X(a2)}V{Y(top + r)}"
        f"A{R(r)} {R(r)} 0 0 1 {X(b2)} {Y(top + r)}V{Y(bottom - r)}A{R(r)} {R(r)} 0 0 1 {X(a2)} {Y(bottom - r)}"
        f"V{Y(d)}H{X(b)}V{Y(bottom - r)}A{R(r)} {R(r)} 0 0 1 {X(a)} {Y(bottom - r)}Z"
    )
    o0, o1 = (height - outer_h) / 2, (height + outer_h) / 2
    ro = outer_r
    left = (
        f"M{X(outer_w)} {Y(o0)}H{X(ro)}A{R(ro)} {R(ro)} 0 0 0 {X(0)} {Y(o0 + ro)}V{Y(o1 - ro)}"
        f"A{R(ro)} {R(ro)} 0 0 0 {X(ro)} {Y(o1)}H{X(outer_w)}Z"
    )
    right = (
        f"M{X(width - outer_w)} {Y(o0)}H{X(width - ro)}A{R(ro)} {R(ro)} 0 0 1 {X(width)} {Y(o0 + ro)}V{Y(o1 - ro)}"
        f"A{R(ro)} {R(ro)} 0 0 1 {X(width - ro)} {Y(o1)}H{X(width - outer_w)}Z"
    )
    return body + left + right


if __name__ == "__main__":
    print("chart:", chart())
    print("gear:", gear())
    print("dumbbell:", dumbbell())
