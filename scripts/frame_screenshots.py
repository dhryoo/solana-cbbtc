#!/usr/bin/env python3
"""Portrait Seeker screenshot → landscape 1920×1080 PNG.

dApp Store 권장 스크린샷 크기는 landscape 1920×1080.
Seeker native 캡쳐는 portrait 1080×2412.
이 스크립트는 portrait 이미지를 중앙 배치하고 좌우를 브랜드 컬러로 패딩한다.

Usage:
    python3 scripts/frame_screenshots.py INPUT.png OUTPUT.png
    python3 scripts/frame_screenshots.py --batch RAW_GLOB                   # auto-name
    python3 scripts/frame_screenshots.py --bg "#000000" --portrait-height 1000 in.png out.png

배치 모드:
    --batch 뒤에 여러 파일 (예: raw-*.png) — 각 파일을 동일 폴더에
    `framed-<원본이름>` 으로 저장.

원본 이미지 크기는 자유 (portrait/landscape 모두 가능).
출력은 항상 1920×1080.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
    from PIL.Image import Resampling
except ImportError:
    sys.stderr.write("error: PIL not installed — pip3 install Pillow\n")
    sys.exit(2)

DESCRIPTION = "Portrait Seeker screenshot → landscape 1920×1080 PNG."

# dApp Store 권장 캔버스
CANVAS_W = 1920
CANVAS_H = 1080

# 기본 배경: Solana 보라
DEFAULT_BG = "#9945FF"

# portrait 캡쳐가 캔버스 내에서 차지할 세로 높이.
# 1080 - 약간의 상하 padding(40px씩) = 1000.
DEFAULT_PORTRAIT_HEIGHT = 1000


def parse_hex_color(s: str) -> tuple[int, int, int]:
    s = s.lstrip("#")
    if len(s) == 3:
        s = "".join(c * 2 for c in s)
    if len(s) != 6:
        raise ValueError(f"invalid hex color: {s!r}")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def frame_one(src_path: Path, dst_path: Path, bg_rgb: tuple[int, int, int],
              portrait_height: int) -> None:
    src = Image.open(src_path).convert("RGB")
    sw, sh = src.size

    # Portrait/landscape 자동 감지. portrait이면 높이에 맞춰 스케일.
    # landscape면 이미 16:9에 가까운 경우 그대로 fit.
    if sh >= sw:
        # portrait: 세로 portrait_height에 맞춰 LANCZOS resize
        new_h = portrait_height
        new_w = round(sw * new_h / sh)
    else:
        # landscape: 캔버스 안에 fit (긴 변 기준)
        scale = min(CANVAS_W / sw, CANVAS_H / sh)
        new_w = round(sw * scale)
        new_h = round(sh * scale)

    scaled = src.resize((new_w, new_h), Resampling.LANCZOS)

    canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), bg_rgb)
    x = (CANVAS_W - new_w) // 2
    y = (CANVAS_H - new_h) // 2
    canvas.paste(scaled, (x, y))

    canvas.save(dst_path, "PNG", optimize=True)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=DESCRIPTION)
    parser.add_argument("--bg", default=DEFAULT_BG, help=f"배경 hex 색상 (기본 {DEFAULT_BG})")
    parser.add_argument("--portrait-height", type=int, default=DEFAULT_PORTRAIT_HEIGHT,
                        help=f"portrait 입력이 차지할 세로 px (기본 {DEFAULT_PORTRAIT_HEIGHT})")
    parser.add_argument("--batch", action="store_true",
                        help="여러 파일 일괄 처리. 출력은 framed-<원본이름>")
    parser.add_argument("inputs", nargs="+",
                        help="단일 모드: input.png output.png  /  --batch: input1.png input2.png ...")
    args = parser.parse_args(argv)

    bg_rgb = parse_hex_color(args.bg)

    if args.batch:
        for raw in args.inputs:
            src = Path(raw)
            if not src.exists():
                print(f"  skip (not found): {src}", file=sys.stderr)
                continue
            dst = src.with_name(f"framed-{src.name}")
            frame_one(src, dst, bg_rgb, args.portrait_height)
            in_size = Image.open(src).size
            print(f"  {src} {in_size} → {dst} ({CANVAS_W}x{CANVAS_H})")
    else:
        if len(args.inputs) != 2:
            parser.error("단일 모드: 입력 한 개, 출력 한 개를 지정")
        src, dst = Path(args.inputs[0]), Path(args.inputs[1])
        if not src.exists():
            print(f"error: {src} not found", file=sys.stderr)
            return 1
        frame_one(src, dst, bg_rgb, args.portrait_height)
        print(f"  {src} {Image.open(src).size} → {dst} ({CANVAS_W}x{CANVAS_H})")

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
