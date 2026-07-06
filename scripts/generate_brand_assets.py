#!/usr/bin/env python3
"""Generate OG image, apple-touch-icon, and favicon PNGs for ShiftWorksHR."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "public"

BG = (244, 241, 232)
GREEN_DARK = (26, 77, 58)
GREEN_MID = (47, 125, 90)
GREEN_LIGHT = (232, 247, 241)
GREEN_BAR_LIGHT = (111, 163, 132)
GREEN_BAR_MID = (47, 125, 90)
GREEN_BAR_DARK = (26, 77, 58)


def _serif(size: int) -> ImageFont.FreeTypeFont:
    for path in (
        "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
        "/Library/Fonts/Georgia.ttf",
    ):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def _sans(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    if not bold:
        candidates = candidates[1:]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def _draw_logo_mark(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    def bar(bx: int, by: int, bw: int, bh: int, color: tuple[int, int, int]) -> None:
        draw.rounded_rectangle(
            (x + bx * scale, y + by * scale, x + (bx + bw) * scale, y + (by + bh) * scale),
            radius=int(2 * scale),
            fill=color,
        )

    bar(0, 13, 6, 10, GREEN_BAR_LIGHT)
    bar(9, 9, 6, 14, GREEN_BAR_MID)
    bar(18, 4, 6, 19, GREEN_BAR_DARK)


def render_og_image() -> Image.Image:
    width, height = 1200, 630
    image = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(image)

    draw.rectangle((0, 0, width, height), fill=BG)
    draw.ellipse((-120, -80, 520, 420), fill=GREEN_LIGHT)
    draw.ellipse((880, 320, 1320, 720), fill=(237, 248, 242))

    title_font = _serif(72)
    sub_font = _sans(34)
    url_font = _sans(26)

    mark_x, mark_y = 88, 108
    tile = 96
    draw.rounded_rectangle(
        (mark_x, mark_y, mark_x + tile, mark_y + tile),
        radius=22,
        fill=(232, 245, 238),
        outline=(197, 223, 208),
        width=2,
    )
    _draw_logo_mark(draw, mark_x + 18, mark_y + 18, scale=2.2)

    text_x = mark_x + tile + 36
    draw.text((text_x, mark_y + 8), "ShiftWorks", fill=GREEN_DARK, font=title_font)
    draw.text((text_x + 400, mark_y + 28), "HR", fill=GREEN_MID, font=_sans(48, bold=True))

    draw.text((text_x, mark_y + 96), "Compensation analysis for HR teams", fill=GREEN_MID, font=sub_font)
    draw.text((text_x, mark_y + 148), "shiftworkshr.com", fill=GREEN_DARK, font=url_font)

    card_x, card_y = 88, 300
    card_w, card_h = 520, 250
    draw.rounded_rectangle(
        (card_x, card_y, card_x + card_w, card_y + card_h),
        radius=24,
        fill=(255, 253, 249),
        outline=(210, 221, 214),
        width=2,
    )
    draw.text((card_x + 28, card_y + 24), "Sample findings", fill=GREEN_DARK, font=_sans(22, bold=True))

    bars = [72, 96, 118, 154, 186]
    base_y = card_y + card_h - 36
    for index, bar_h in enumerate(bars):
        bx = card_x + 36 + index * 54
        color = GREEN_BAR_MID if index >= 2 else GREEN_BAR_LIGHT
        draw.rounded_rectangle((bx, base_y - bar_h, bx + 34, base_y), radius=6, fill=color)

    draw.line((card_x + 300, card_y + 70, card_x + card_w - 28, card_y + 70), fill=GREEN_MID, width=2)
    draw.text((card_x + 300, card_y + 88), "Below minimum", fill=GREEN_DARK, font=_sans(20, bold=True))
    draw.text((card_x + 300, card_y + 118), "Compression flags", fill=GREEN_MID, font=_sans(18))
    draw.text((card_x + 300, card_y + 148), "Leadership PDF export", fill=GREEN_MID, font=_sans(18))

    chart_x = 700
    draw.rounded_rectangle(
        (chart_x, card_y, chart_x + 412, card_y + card_h),
        radius=24,
        fill=(255, 253, 249),
        outline=(210, 221, 214),
        width=2,
    )
    draw.text((chart_x + 28, card_y + 24), "Merit season QA", fill=GREEN_DARK, font=_sans(22, bold=True))
    for index, bar_h in enumerate([48, 78, 110, 148, 178]):
        bx = chart_x + 40 + index * 62
        draw.rounded_rectangle((bx, base_y - bar_h, bx + 40, base_y), radius=6, fill=GREEN_BAR_DARK if index > 3 else GREEN_BAR_MID)

    draw.text((chart_x + 28, card_y + card_h - 52), "HRIS export  >  review queue  >  PDF", fill=GREEN_MID, font=_sans(17))

    return image


def render_apple_touch_icon() -> Image.Image:
    size = 180
    image = Image.new("RGB", (size, size), (232, 245, 238))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((8, 8, size - 8, size - 8), radius=36, fill=(232, 245, 238), outline=(197, 223, 208), width=3)
    _draw_logo_mark(draw, 48, 48, scale=3.4)
    return image


def render_favicon_32() -> Image.Image:
    image = Image.new("RGB", (32, 32), (232, 245, 238))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((1, 1, 31, 31), radius=8, fill=(232, 245, 238), outline=(197, 223, 208), width=1)
    _draw_logo_mark(draw, 7, 7, scale=0.95)
    return image


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    assets = {
        "social-share.png": render_og_image(),
        "og-image.png": render_og_image(),
        "apple-touch-icon.png": render_apple_touch_icon(),
        "favicon-32.png": render_favicon_32(),
        "logo.png": render_apple_touch_icon().resize((512, 512), Image.Resampling.LANCZOS),
    }
    for name, img in assets.items():
        path = OUT / name
        img.save(path, format="PNG", optimize=True)
        print(f"Wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
