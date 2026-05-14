#!/usr/bin/env python3
"""
Generate app icon assets for seeker-btcfi.

Design: White "S" on Solana purple (#9945FF) background.

Outputs (overwrites existing files in assets/):
  - icon.png            1024x1024  Solana purple bg + white S (iOS + fallback)
  - adaptive-icon.png   1024x1024  Transparent bg + white S (Android adaptive foreground)
  - splash-icon.png      400x 400  Transparent bg + white S (rendered centered on splash bgColor)
  - favicon.png           48x  48  Solid icon for web

Usage:
  python3 scripts/generate_icons.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

SOLANA_PURPLE = (153, 69, 255, 255)   # #9945FF
WHITE = (255, 255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)

# 시스템 폰트. Arial Bold는 macOS 기본 제공.
FONT_PATH = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

if not os.path.exists(FONT_PATH):
    sys.exit(f"Font not found: {FONT_PATH}. Adjust FONT_PATH in this script.")


def draw_letter(
    size: int,
    background: tuple[int, int, int, int],
    fg_letter_color: tuple[int, int, int, int],
    letter: str = "S",
    letter_ratio: float = 0.62,
) -> Image.Image:
    """Render a centered letter on a square canvas of given size."""
    img = Image.new("RGBA", (size, size), background)
    draw = ImageDraw.Draw(img)

    font_size = int(size * letter_ratio)
    font = ImageFont.truetype(FONT_PATH, font_size)

    # PIL의 새 textbbox API로 정확한 시각 중심 계산
    bbox = draw.textbbox((0, 0), letter, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (size - text_w) / 2 - bbox[0]
    y = (size - text_h) / 2 - bbox[1]

    draw.text((x, y), letter, font=font, fill=fg_letter_color)
    return img


def make_icon() -> None:
    """1024x1024 with full purple bg — used by iOS / store listings / fallback."""
    img = draw_letter(1024, SOLANA_PURPLE, WHITE)
    out = ASSETS / "icon.png"
    img.save(out, "PNG")
    print(f"  wrote {out.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


def make_adaptive_icon() -> None:
    """1024x1024 transparent — Android adaptive icon foreground.

    Letter must fit within central 66% (~676px) to survive masking by various
    launcher icon shapes. We render at 0.42 ratio (~430px) for comfortable padding.
    """
    img = draw_letter(1024, TRANSPARENT, WHITE, letter_ratio=0.42)
    out = ASSETS / "adaptive-icon.png"
    img.save(out, "PNG")
    print(f"  wrote {out.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


def make_splash_icon() -> None:
    """400x400 transparent — rendered centered on splash backgroundColor (#9945FF)."""
    img = draw_letter(400, TRANSPARENT, WHITE)
    out = ASSETS / "splash-icon.png"
    img.save(out, "PNG")
    print(f"  wrote {out.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


def make_favicon() -> None:
    """48x48 solid bg for browser tab (web target unused but kept consistent)."""
    img = draw_letter(48, SOLANA_PURPLE, WHITE, letter_ratio=0.7)
    out = ASSETS / "favicon.png"
    img.save(out, "PNG")
    print(f"  wrote {out.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


def main() -> int:
    ASSETS.mkdir(parents=True, exist_ok=True)
    print(f"Generating icons in {ASSETS.relative_to(ROOT)}/")
    make_icon()
    make_adaptive_icon()
    make_splash_icon()
    make_favicon()
    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
