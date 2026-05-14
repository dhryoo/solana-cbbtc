#!/usr/bin/env python3
"""
icon.png(보라 풀 배경 + 코인 디자인)에서 보라색 배경만 제거하여
깨끗한 adaptive-icon.png을 재생성한다.

기존 strip_checkerboard.py는 회색 격자 baked-in 픽셀을 제거하면서
코인 ring의 anti-aliased 경계까지 침범해 외곽이 패치 형태로 손상됐다.
이 스크립트는 그 대신 배경색(#9945FF) 기반 거리 마스킹으로
깨끗한 transparent foreground를 만든다.

알고리즘:
- 각 픽셀의 RGB 거리(L2) from #9945FF 계산
- 거리 < THRESHOLD_HARD → 완전 투명 (배경)
- THRESHOLD_HARD < 거리 < THRESHOLD_SOFT → 선형 alpha (anti-alias 경계)
- 거리 ≥ THRESHOLD_SOFT → 원본 alpha 유지 (코인 본체)

이렇게 하면 코인의 흰 ring과 그라데이션 ₿가 완벽히 보존되면서
주변 보라 영역만 깔끔하게 제거된다.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "icon.png"
DST = ROOT / "assets" / "adaptive-icon.png"
BACKUP = ROOT / "assets" / "adaptive-icon.png.original"

BG_RGB = np.array([153, 69, 255], dtype=np.float32)  # #9945FF Solana purple

THRESHOLD_HARD = 35.0   # 이보다 가까우면 100% 배경 → alpha 0
THRESHOLD_SOFT = 95.0   # 이보다 멀면 완전 보존


def main() -> int:
    img = Image.open(SRC).convert("RGBA")
    arr = np.array(img, dtype=np.float32)
    rgb = arr[..., :3]
    a = arr[..., 3]

    dist = np.sqrt(np.sum((rgb - BG_RGB) ** 2, axis=-1))

    # 0 ~ THRESHOLD_HARD: 완전 투명
    # THRESHOLD_HARD ~ THRESHOLD_SOFT: 선형 알파 (0 → 1)
    # THRESHOLD_SOFT ~ : 원본 알파 유지
    soft_zone = (dist - THRESHOLD_HARD) / (THRESHOLD_SOFT - THRESHOLD_HARD)
    soft_zone = np.clip(soft_zone, 0.0, 1.0)
    new_alpha = np.where(
        dist >= THRESHOLD_SOFT,
        a,
        soft_zone * 255.0,
    )

    arr[..., 3] = np.clip(new_alpha, 0, 255)

    # 백업이 없으면 (또는 기존 백업 유지)
    if not BACKUP.exists() and DST.exists():
        import shutil
        shutil.copy2(DST, BACKUP.with_suffix(".png.prev"))
        print(f"Saved prev as {BACKUP.with_suffix('.png.prev')}")

    Image.fromarray(arr.astype(np.uint8), "RGBA").save(DST, "PNG", optimize=True)

    total = arr.shape[0] * arr.shape[1]
    transparent_count = int((arr[..., 3] == 0).sum())
    soft_count = int(((arr[..., 3] > 0) & (arr[..., 3] < 255)).sum())
    print(f"  source: {SRC.name} {img.size}")
    print(f"  output: {DST.name} {Image.open(DST).size}, {DST.stat().st_size:,} bytes")
    print(f"  fully transparent: {transparent_count:,} px ({100*transparent_count//total}%)")
    print(f"  partial alpha (anti-alias): {soft_count:,} px")
    return 0


if __name__ == "__main__":
    sys.exit(main())
