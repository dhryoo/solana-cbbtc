#!/usr/bin/env python3
"""
Strip baked-in transparency-checkerboard pixels from an AI-generated PNG.

문제: 일부 이미지 AI가 투명 영역을 실제 회색 격자 픽셀(alpha=255)로 렌더링해서 보냄.
adaptive-icon.png에서는 이게 그대로 표시되어 Android의 backgroundColor 합성이 작동 안 함.

해결: 채도가 낮고(grayscale에 가까움) 명도가 중간 정도인(흰색/검정 제외) 픽셀을
alpha=0으로 전환. 코인의 보라/녹색 그라데이션과 흰색 ring은 채도/명도 조건에서 제외돼 보존.

Usage:
  python3 scripts/strip_checkerboard.py assets/adaptive-icon.png
  python3 scripts/strip_checkerboard.py assets/adaptive-icon.png --output assets/adaptive-icon.fixed.png

기본 동작: 입력 파일을 .original 백업 후 원본 위치에 결과 저장.
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image

# 격자 회색의 RGB 분포: 채도(max-min)는 작고, 명도는 100~180 정도 (사용자 케이스 기준).
# 보수적으로 잡아 코인 본체(채도 높음)와 흰색 ring(명도 ~255)·검은 디테일(명도 <50)은 보존.
SAT_THRESHOLD = 20          # max-min < 20 이면 사실상 회색
BRIGHTNESS_LOW = 50         # 이보다 어두우면 검정 디테일 보존
BRIGHTNESS_HIGH = 210       # 이보다 밝으면 흰색 영역 보존


def strip_checkerboard(input_path: Path, output_path: Path) -> tuple[int, int]:
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img)
    r = arr[..., 0].astype(int)
    g = arr[..., 1].astype(int)
    b = arr[..., 2].astype(int)
    a = arr[..., 3]

    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    sat = max_c - min_c

    mask = (
        (sat < SAT_THRESHOLD)
        & (max_c > BRIGHTNESS_LOW)
        & (max_c < BRIGHTNESS_HIGH)
    )

    # mask가 True인 픽셀의 alpha를 0으로
    new_alpha = np.where(mask, 0, a).astype(np.uint8)
    arr[..., 3] = new_alpha

    total = arr.shape[0] * arr.shape[1]
    transparented = int(mask.sum())

    Image.fromarray(arr, mode="RGBA").save(output_path, "PNG")
    return transparented, total


def main() -> int:
    ap = argparse.ArgumentParser(description="Strip checkerboard pseudo-transparency from PNG")
    ap.add_argument("input", type=Path, help="Input PNG path")
    ap.add_argument(
        "-o", "--output",
        type=Path,
        default=None,
        help="Output PNG path (default: overwrite input after backup to .original)",
    )
    args = ap.parse_args()

    if not args.input.exists():
        print(f"Error: input not found: {args.input}", file=sys.stderr)
        return 1

    if args.output is None:
        backup = args.input.with_suffix(args.input.suffix + ".original")
        if not backup.exists():
            shutil.copy2(args.input, backup)
            print(f"Backed up original to {backup}")
        else:
            print(f"Backup already exists at {backup} (skipping copy)")
        output = args.input
    else:
        output = args.output
        output.parent.mkdir(parents=True, exist_ok=True)

    transparented, total = strip_checkerboard(args.input, output)
    pct = 100.0 * transparented / total
    print(f"Wrote {output}")
    print(f"  pixels marked transparent: {transparented:,} / {total:,} ({pct:.1f}%)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
