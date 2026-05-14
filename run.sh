#!/usr/bin/env bash
# Solana cbBTC — release APK 통합 실행 스크립트
#
# 단계:
#   1) prebuild       : app.json/플러그인 변경을 android/ 네이티브 프로젝트로 sync
#   2) uninstall      : 기존 설치본 제거 (서명/데이터 초기화). 설치 안 돼있어도 OK.
#   3) run:android    : gradle release 빌드 + APK 설치 + 앱 실행
#
# 사용법:
#   ./run.sh                # 기본 — release variant
#   ./run.sh --skip-prebuild # prebuild 생략 (네이티브 변경 없을 때 빠르게)
#
# 사전 조건:
#   - ~/.gradle/gradle.properties 에 SEEKER_BTCFI_RELEASE_* 4개 키 설정 완료
#   - keystore 파일이 keystores/seeker-btcfi-release.keystore 위치에 존재
#   - Seeker 또는 Android 디바이스가 USB로 연결되어 adb devices에 보임

set -euo pipefail

# 스크립트가 어디서 호출되든 프로젝트 루트에서 실행
cd "$(dirname "$0")"

readonly PACKAGE="com.seekerbtcfi.app"

SKIP_PREBUILD=0
for arg in "$@"; do
    case "$arg" in
        --skip-prebuild) SKIP_PREBUILD=1 ;;
        -h|--help)
            sed -n '2,18p' "$0"
            exit 0
            ;;
        *)
            echo "Unknown option: $arg" >&2
            exit 1
            ;;
    esac
done

if [[ "$SKIP_PREBUILD" -eq 0 ]]; then
    echo "==> [1/3] expo prebuild (--platform android)"
    npx expo prebuild --platform android
else
    echo "==> [1/3] skipped (--skip-prebuild)"
fi

echo "==> [2/3] adb uninstall $PACKAGE (no-op if not installed)"
adb uninstall "$PACKAGE" || true

echo "==> [3/3] expo run:android --variant release --device"
npx expo run:android --variant release --device
