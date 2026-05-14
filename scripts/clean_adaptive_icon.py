#!/usr/bin/env python3
"""
adaptive-icon.png에서 ₿ 심볼만 남기고 ring을 완전히 제거.

전략 (이중 마스킹):
1. HSV hue/sat 마스크: B의 녹색-보라 그라데이션 보존, 흰색 영역 제거
2. 원형 공간 마스크: B의 반경(~260px) 밖은 모두 투명, ring (반경 ~370px) 제거

두 마스크의 AND 결과로 alpha 결정.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "assets" / "adaptive-icon.png"

# HSV 영역: 녹색(~140°) ~ 보라(~280°)
HUE_MIN = 120.0
HUE_MAX = 290.0
SAT_MIN = 0.15

# 공간: B 본체 반경 (캔버스 크기 비율)
# 측정 결과 (x=512 수직 슬라이스):
#   - B 본체 최대 반경: ~218px (y=294~407, y=615~728)
#   - Ring 영역: 반경 278~294px (분리된 보라 band)
# Ring을 완전히 제거하려면 r_out < 278 필요.
R_INNER_RATIO = 0.22   # B 본체 안전 영역 (≈ 225px)
R_OUTER_RATIO = 0.25   # 그 후 falloff 끝 (≈ 256px). Ring(278+)은 완전 컷.


def rgb_to_hsv(arr: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    r = arr[..., 0] / 255.0
    g = arr[..., 1] / 255.0
    b = arr[..., 2] / 255.0
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    delta = max_c - min_c

    h = np.zeros_like(max_c)
    safe = delta > 1e-6
    rmax = (max_c == r) & safe
    gmax = (max_c == g) & safe
    bmax = (max_c == b) & safe
    h[rmax] = ((g[rmax] - b[rmax]) / delta[rmax]) % 6
    h[gmax] = ((b[gmax] - r[gmax]) / delta[gmax]) + 2
    h[bmax] = ((r[bmax] - g[bmax]) / delta[bmax]) + 4
    h = h * 60.0

    s = np.where(max_c > 0, delta / np.where(max_c > 0, max_c, 1), 0.0)
    return h, s, max_c


def main() -> int:
    img = Image.open(TARGET).convert("RGBA")
    w, h_dim = img.size
    arr = np.array(img, dtype=np.float32)
    a = arr[..., 3]

    # 1) HSV 마스크
    h, s, _ = rgb_to_hsv(arr[..., :3])
    hue_ok = (h >= HUE_MIN) & (h <= HUE_MAX)
    sat_falloff = np.clip((s - SAT_MIN) / 0.15, 0.0, 1.0)
    hsv_mask = np.where(hue_ok, sat_falloff, 0.0)

    # 2) 공간 (원형) 마스크
    cx, cy = w / 2, h_dim / 2
    r_in = min(w, h_dim) * R_INNER_RATIO
    r_out = min(w, h_dim) * R_OUTER_RATIO
    yy, xx = np.mgrid[0:h_dim, 0:w]
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    spatial_mask = np.where(
        dist <= r_in,
        1.0,
        np.where(
            dist >= r_out,
            0.0,
            (r_out - dist) / (r_out - r_in),
        ),
    )

    # 두 마스크의 곱: B 영역 안 AND HSV 조건 충족
    multiplier = hsv_mask * spatial_mask

    arr[..., 3] = (a * multiplier).clip(0, 255)
    Image.fromarray(arr.astype(np.uint8), "RGBA").save(TARGET, "PNG", optimize=True)

    kept = int((arr[..., 3] > 0).sum())
    total = arr.shape[0] * arr.shape[1]
    print(f"  HSV mask: hue {HUE_MIN}-{HUE_MAX}°, sat >= {SAT_MIN}")
    print(f"  spatial: r_in={r_in:.0f}, r_out={r_out:.0f}")
    print(f"  visible pixels: {kept:,} / {total:,} ({100*kept//total}%)")
    print(f"  output: {TARGET.stat().st_size:,} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
