#!/usr/bin/env python3
"""
토큰 로고를 외부 registry에서 fetch하고 128×128 PNG로 정규화 후 assets/tokens/ 저장.

Sources (네트워크 의존, 1회 실행 후 산출물 ship):
- SOL: solana-labs/token-list (PNG)
- cbBTC: CoinGecko (WebP)
- SKR (Seeker): CoinGecko (JPG)

Usage:
  python3 scripts/fetch_token_icons.py
"""

from __future__ import annotations

import io
import sys
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "tokens"

SOURCES = {
    "sol.png": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    "cbbtc.png": "https://coin-images.coingecko.com/coins/images/40143/large/cbbtc.webp?1726136727",
    "skr.png": "https://coin-images.coingecko.com/coins/images/70974/large/seeker-logo.jpg?1764922774",
}

TARGET_SIZE = (128, 128)


def fetch_and_normalize(url: str, dest: Path) -> tuple[int, tuple[int, int]]:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = resp.read()
    img = Image.open(io.BytesIO(data)).convert("RGBA")
    original_size = img.size
    img.thumbnail(TARGET_SIZE, Image.LANCZOS)
    # 정확히 128x128 정사각 canvas에 중앙 정렬 (원본 비율 유지)
    canvas = Image.new("RGBA", TARGET_SIZE, (0, 0, 0, 0))
    x = (TARGET_SIZE[0] - img.size[0]) // 2
    y = (TARGET_SIZE[1] - img.size[1]) // 2
    canvas.paste(img, (x, y))
    canvas.save(dest, "PNG", optimize=True)
    return dest.stat().st_size, original_size


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    for filename, url in SOURCES.items():
        dest = OUT / filename
        try:
            size, original = fetch_and_normalize(url, dest)
            print(f"  {filename}: {original} → 128x128, {size:,} bytes")
        except Exception as e:
            print(f"  {filename}: FAILED — {e}", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
