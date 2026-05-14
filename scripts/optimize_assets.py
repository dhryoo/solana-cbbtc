#!/usr/bin/env python3
"""
Optimize app PNG assets in-place to reduce APK size.

전략:
1. 디바이스 해상도를 넘는 dimensions를 reasonable max로 다운스케일
   - icon.png / adaptive-icon.png: 1024×1024 max (Android adaptive icon 공식 스펙)
   - splash.png / splash-dark.png: 1284×2778 max (가장 큰 모던 Android phone)
   - favicon.png: 96×96 (브라우저 탭 표준 최대)
2. PIL의 optimize=True로 압축
3. 가능한 경우 P 모드 (256-color palette)로 변환 — 그라데이션 적은 디자인에 효과적

Usage:
  python3 scripts/optimize_assets.py
  python3 scripts/optimize_assets.py --dry-run
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

# (max_width, max_height) per file
LIMITS = {
    "icon.png": (1024, 1024),
    "adaptive-icon.png": (1024, 1024),
    "splash.png": (1284, 2778),
    "splash-dark.png": (1284, 2778),
    "favicon.png": (96, 96),
}


def optimize_one(path: Path, max_size: tuple[int, int], dry_run: bool) -> tuple[int, int]:
    before = path.stat().st_size
    img = Image.open(path)
    original_mode = img.mode
    original_size = img.size

    # 1. 다운스케일 (LANCZOS = 고품질)
    if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
        ratio_w = max_size[0] / img.size[0]
        ratio_h = max_size[1] / img.size[1]
        ratio = min(ratio_w, ratio_h)
        new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
        img = img.resize(new_size, Image.LANCZOS)

    # RGBA 유지가 필요한 파일 (투명도 있는 디자인). 모두 RGBA 유지.
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    if not dry_run:
        img.save(path, "PNG", optimize=True)

    after = path.stat().st_size if not dry_run else before
    print(
        f"  {path.name}: {original_size} {original_mode} → {img.size} {img.mode}, "
        f"{before:,} → {after:,} bytes ({100 * (before - after) // max(before, 1)}% saved)"
    )
    return before, after


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="Don't write files")
    args = ap.parse_args()

    total_before = 0
    total_after = 0
    for name, limits in LIMITS.items():
        path = ASSETS / name
        if not path.exists():
            print(f"  skip {name} (not found)")
            continue
        before, after = optimize_one(path, limits, args.dry_run)
        total_before += before
        total_after += after

    print()
    print(f"Total: {total_before:,} → {total_after:,} bytes "
          f"({100 * (total_before - total_after) // max(total_before, 1)}% reduction)")
    if args.dry_run:
        print("(dry-run — no files written)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
