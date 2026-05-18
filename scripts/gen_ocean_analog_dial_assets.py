"""
Generate ocean-themed dial backdrop + square PNG hands for Divoom pointer slots.

Uses firmware pointer types (same square bbox for all three rows):
  DIVOOM_CLOCK_DISP_SUPPORT_HOUR_POINT_IMAGE = 131
  DIVOOM_CLOCK_DISP_SUPPORT_MIN_POINT_IMAGE = 132
  DIVOOM_CLOCK_DISP_SUPPORT_SECOND_POINT_IMAGE = 233

Rotation is around the center of the layer box (x,y,w,h). Each hand bitmap must
match w×h with w==h (square), pivot at image center, hand toward 12 o'clock.
Do not use full-screen 800×1280 hand sprites or mismatched skinny rectangles —
see docs/tool-examples.md §5b and a good export example ClockId 60012 (e.g. clock60012.cfg).
"""

from __future__ import annotations

import math
import tarfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


WIDTH = 800
HEIGHT = 1280
# Visual dial center (sun); ring ticks align here — NOT geometric canvas center.
CX = 400
CY = int(HEIGHT * 0.36)
HAND_BOX = 560  # w=h; covers ring radius ~280


def _draw_ocean_background() -> Image.Image:
    img = Image.new("RGB", (WIDTH, HEIGHT), "#0B2A53")
    px = img.load()

    for y in range(HEIGHT):
        if y < HEIGHT * 0.55:
            t = y / (HEIGHT * 0.55)
            r = int(8 + (85 - 8) * t)
            g = int(45 + (156 - 45) * t)
            b = int(95 + (203 - 95) * t)
        else:
            t = (y - HEIGHT * 0.55) / (HEIGHT * 0.45)
            r = int(15 + (5 - 15) * t)
            g = int(84 + (45 - 84) * t)
            b = int(120 + (80 - 120) * t)
        for x in range(WIDTH):
            px[x, y] = (r, g, b)

    sun = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    sun_draw = ImageDraw.Draw(sun)
    sun_center = (CX, CY)
    for radius, alpha in [(150, 60), (110, 100), (78, 180)]:
        sun_draw.ellipse(
            (
                sun_center[0] - radius,
                sun_center[1] - radius,
                sun_center[0] + radius,
                sun_center[1] + radius,
            ),
            fill=(255, 210, 125, alpha),
        )
    img = Image.alpha_composite(img.convert("RGBA"), sun).convert("RGB")

    reflection = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    refl_draw = ImageDraw.Draw(reflection)
    horizon_y = CY + 95
    for i in range(22):
        y = horizon_y + i * 22
        half_w = max(18, 170 - i * 6)
        alpha = max(16, 120 - i * 4)
        refl_draw.ellipse(
            (CX - half_w, y - 6, CX + half_w, y + 6),
            fill=(255, 228, 160, alpha),
        )
    reflection = reflection.filter(ImageFilter.GaussianBlur(1.5))
    img = Image.alpha_composite(img.convert("RGBA"), reflection).convert("RGB")
    draw = ImageDraw.Draw(img)

    for i in range(12):
        y = int(HEIGHT * 0.58 + i * 52)
        color = (140 - i * 6, 210 - i * 8, 230 - i * 7)
        draw.arc((60, y - 20, WIDTH - 60, y + 28), start=0, end=180, fill=color, width=2)
        draw.arc((110, y + 8, WIDTH - 110, y + 42), start=180, end=360, fill=color, width=2)

    # Hour ticks around dial center (CX, CY).
    ring = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    ring_draw = ImageDraw.Draw(ring)
    outer_r = 280
    inner_r = 245
    for h in range(12):
        ang = math.radians(h * 30 - 90)
        x1 = CX + int(inner_r * math.cos(ang))
        y1 = CY + int(inner_r * math.sin(ang))
        x2 = CX + int(outer_r * math.cos(ang))
        y2 = CY + int(outer_r * math.sin(ang))
        ring_draw.line((x1, y1, x2, y2), fill=(230, 246, 255, 200), width=4)

    faint = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    fd = ImageDraw.Draw(faint)
    fd.ellipse(
        (CX - outer_r - 8, CY - outer_r - 8, CX + outer_r + 8, CY + outer_r + 8),
        outline=(255, 255, 255, 55),
        width=3,
    )
    ring = Image.alpha_composite(ring, faint)
    img = Image.alpha_composite(img.convert("RGBA"), ring).convert("RGB")
    draw = ImageDraw.Draw(img)

    bird_color = (22, 40, 58)
    draw.arc((620, 100, 700, 150), 210, 360, fill=bird_color, width=5)
    draw.arc((690, 95, 780, 150), 180, 330, fill=bird_color, width=5)
    draw.arc((655, 122, 730, 168), 200, 350, fill=(35, 62, 82), width=3)

    return img


def _hand_square(
    size: int,
    length: int,
    width: int,
    tail: int,
    rgba: tuple[int, int, int, int],
) -> Image.Image:
    """Square PNG; pivot at center; hand points up (12 o'clock)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx = cy = size // 2
    y_tip = cy - length
    y_tail = cy + tail

    draw.line((cx, y_tail, cx, y_tip), fill=rgba, width=width)
    head_w = max(10, width + 8)
    draw.polygon(
        [
            (cx, y_tip - 16),
            (cx - head_w, y_tip + 12),
            (cx + head_w, y_tip + 12),
        ],
        fill=rgba,
    )
    cap_r = max(8, width + 2)
    draw.ellipse((cx - cap_r, cy - cap_r, cx + cap_r, cy + cap_r), fill=rgba)
    return img


def build(out_dir: Path) -> dict[str, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    bg_path = out_dir / "clock_bg.jpg"
    hour_path = out_dir / "hour_hand.png"
    min_path = out_dir / "minute_hand.png"
    sec_path = out_dir / "second_hand.png"
    bundle_path = out_dir / "clock_bg.tar.gz"

    _draw_ocean_background().save(bg_path, "JPEG", quality=90, optimize=True)

    s = HAND_BOX
    _hand_square(s, length=118, width=18, tail=38, rgba=(245, 250, 255, 245)).save(
        hour_path, "PNG"
    )
    _hand_square(s, length=168, width=12, tail=42, rgba=(236, 246, 255, 245)).save(
        min_path, "PNG"
    )
    _hand_square(s, length=188, width=5, tail=55, rgba=(255, 99, 99, 250)).save(sec_path, "PNG")

    with tarfile.open(bundle_path, "w:gz", format=tarfile.USTAR_FORMAT) as tf:
        tf.add(bg_path, arcname="clock_bg.jpg")
        tf.add(hour_path, arcname="hour_hand.png")
        tf.add(min_path, arcname="minute_hand.png")
        tf.add(sec_path, arcname="second_hand.png")

    return {
        "clock_bg": bg_path,
        "hour_hand": hour_path,
        "minute_hand": min_path,
        "second_hand": sec_path,
        "bundle": bundle_path,
        "hand_xywh": (CX - s // 2, CY - s // 2, s, s),
    }


if __name__ == "__main__":
    od = Path(__file__).resolve().parents[1] / "resources" / "generated" / "ocean_analog_dial"
    meta = build(od)
    for k, v in meta.items():
        print(f"{k}: {v}")
