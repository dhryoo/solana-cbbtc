#!/usr/bin/env python3
"""
adaptive-icon.png에 원형 마스크를 적용해 코인 영역 밖의 모든 잔여 노이즈
(faint haze, sparkle, anti-alias 잔재)를 완전히 제거한다.

전제: 코인은 정확히 캔버스 중앙에 위치하며 외곽 ring을 포함한 전체 반경이
캔버스 반폭의 약 85% 이하이다.

알고리즘:
- 중심에서의 거리 d 계산
- d <= INNER_RADIUS: 원본 alpha 그대로 (코인 본체)
- INNER_RADIUS < d < OUTER_RADIUS: 선형 falloff (anti-alias)
- d >= OUTER_RADIUS: alpha = 0 (모든 잔여 노이즈 제거)
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "assets" / "adaptive-icon.png"


def main() -> int:
    img = Image.open(TARGET).convert("RGBA")
    w, h = img.size
    cx, cy = w / 2, h / 2

    # 코인은 캔버스의 80% 안에 들어감 가정. ring 외곽까지 포함.
    inner_r = min(w, h) * 0.43   # 코인 본체 끝까지
    outer_r = min(w, h) * 0.48   # falloff 종료 지점

    arr = np.array(img, dtype=np.float32)
    a = arr[..., 3]

    # 거리 grid
    yy, xx = np.mgrid[0:h, 0:w]
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)

    # alpha multiplier: 1.0 inside inner_r, linear 1→0 between inner/outer, 0 outside
    multiplier = np.where(
        dist <= inner_r,
        1.0,
        np.where(
            dist >= outer_r,
            0.0,
            (outer_r - dist) / (outer_r - inner_r),
        ),
    )

    arr[..., 3] = (a * multiplier).clip(0, 255)

    Image.fromarray(arr.astype(np.uint8), "RGBA").save(TARGET, "PNG", optimize=True)
    print(f"  applied circular mask (r_in={inner_r:.0f}, r_out={outer_r:.0f})")
    print(f"  output: {TARGET.stat().st_size:,} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
