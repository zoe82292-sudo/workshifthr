#!/usr/bin/env python3
"""Generate LinkedIn profile banners with safe zones for the profile photo."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 1584, 396
BG = (244, 241, 232)
GREEN_DARK = (26, 77, 58)
GREEN_MID = (47, 125, 90)
GREEN_LIGHT = (216, 239, 227)
GREEN_BAR = (63, 168, 116)
ORANGE = (230, 160, 60)

# Profile photo covers roughly this rectangle on LinkedIn (desktop).
PROFILE_SAFE = (0, 140, 340, HEIGHT)


def _fonts() -> tuple[ImageFont.FreeTypeFont, ImageFont.FreeTypeFont, ImageFont.FreeTypeFont]:
    candidates = [
        "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
        "/Library/Fonts/Georgia.ttf",
    ]
    serif_path = next((path for path in candidates if Path(path).exists()), None)
    sans_candidates = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    sans_path = next((path for path in sans_candidates if Path(path).exists()), None)
    if not serif_path or not sans_path:
        raise RuntimeError("Could not find system fonts for banner generation.")

    return (
        ImageFont.truetype(serif_path, 62),
        ImageFont.truetype(sans_path, 30),
        ImageFont.truetype(sans_path, 22),
    )


def _draw_background(draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle((0, 0, WIDTH, HEIGHT), fill=BG)
    # Decorative sweep — bottom-left only, no text zone.
    draw.pieslice((-180, 180, 420, 520), 200, 320, fill=GREEN_DARK)
    draw.pieslice((-120, 220, 360, 480), 210, 310, fill=GREEN_MID)
    # Subtle grid on right
    for x in range(900, WIDTH, 36):
        draw.line((x, 40, x, HEIGHT - 40), fill=(220, 230, 220), width=1)
    for y in range(40, HEIGHT - 40, 36):
        draw.line((900, y, WIDTH - 40, y), fill=(220, 230, 220), width=1)


def _draw_chart(draw: ImageDraw.ImageDraw, origin_x: int) -> None:
    heights = [52, 68, 84, 118, 148]
    base_y = HEIGHT - 70
    bar_w = 34
    gap = 14
    for index, height in enumerate(heights):
        x0 = origin_x + index * (bar_w + gap)
        color = GREEN_BAR if index >= 2 else (180, 200, 185)
        draw.rounded_rectangle((x0, base_y - height, x0 + bar_w, base_y), radius=6, fill=color)
        if index < 2:
            draw.ellipse((x0 + 8, base_y - height - 28, x0 + 26, base_y - height - 10), fill=ORANGE)
            draw.text((x0 + 13, base_y - height - 25), "!", fill="white", font=ImageFont.load_default())
    draw.line((origin_x - 10, base_y - 52, origin_x + 250, base_y - 52), fill=GREEN_MID, width=2)
    draw.text((origin_x, base_y - 78), "BELOW MINIMUM", fill=GREEN_DARK, font=ImageFont.load_default())


def _draw_text_block(
    draw: ImageDraw.ImageDraw,
    *,
    title_font: ImageFont.FreeTypeFont,
    tag_font: ImageFont.FreeTypeFont,
    url_font: ImageFont.FreeTypeFont,
    tagline: str,
) -> None:
    # Safe zone: right of profile photo, vertically centered in upper banner.
    x = 400
    y = 88
    draw.text((x, y), "ShiftWorksHR", fill=GREEN_DARK, font=title_font)
    draw.line((x, y + 72, x + 340, y + 72), fill=GREEN_MID, width=3)
    draw.text((x, y + 88), tagline, fill=GREEN_MID, font=tag_font)
    draw.text((x, y + 128), "shiftworkshr.com", fill=GREEN_DARK, font=url_font)


def _mark_safe_zone(draw: ImageDraw.ImageDraw, *, preview: bool) -> None:
    if not preview:
        return
    draw.rectangle(PROFILE_SAFE, outline=(255, 0, 0, 128), width=2)


def render_banner(tagline: str, *, preview_safe_zone: bool = False) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    title_font, tag_font, url_font = _fonts()
    _draw_background(draw)
    _draw_text_block(
        draw,
        title_font=title_font,
        tag_font=tag_font,
        url_font=url_font,
        tagline=tagline,
    )
    _draw_chart(draw, 1040)
    _mark_safe_zone(draw, preview=preview_safe_zone)
    return image


def main() -> None:
    out_dir = Path(__file__).resolve().parent
    banners = {
        "linkedin-banner-safe.png": "Compensation analysis for HR teams",
        "linkedin-banner-merit-safe.png": "Find pay issues before review season",
    }
    for filename, tagline in banners.items():
        image = render_banner(tagline)
        path = out_dir / filename
        image.save(path, format="PNG", optimize=True)
        print(f"Wrote {path}")


if __name__ == "__main__":
    main()
