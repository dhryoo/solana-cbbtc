#!/usr/bin/env bash
# Solana cbBTC — 실행 스크립트
#
# 기본 (dev): dev client(debug) 빌드를 기기에 빌드·설치·실행하고 Metro 에 연결.
#   → 'installing' 메시지와 함께 앱이 설치됨. 설치 후부터는 JS 변경을 dev client 에서
#     reload(r) 로 즉시 확인 가능 (매번 ./run.sh 재실행 불필요).
#   참고: expo run:android 는 -c(Metro 캐시 클리어)를 지원하지 않음. 캐시 문제 시
#         별도로 `npx expo start --dev-client -c` 로 서버만 재시작하면 됨.
#
# 모드:
#   ./run.sh                              # 기본 — dev client 빌드+설치+실행 (run:android, debug)
#   ./run.sh --reinstall                  # dev 설치 전에 기존 앱 제거 (서명 불일치 시 — 예: release→debug 전환)
#   ./run.sh --release                    # release APK 빌드+설치 (prebuild → uninstall → run:android release)
#   ./run.sh --release --skip-prebuild    # release 에서 prebuild 생략
#   ./run.sh -h | --help
#
# 서명 불일치(INSTALL_FAILED_UPDATE_INCOMPATIBLE): 기기에 다른 키로 서명된 앱이 이미
#   설치돼 있을 때 발생. `./run.sh --reinstall` 로 한 번 제거 후 설치하면 해결 (데이터 초기화).
#
# release 모드 사전 조건:
#   - ~/.gradle/gradle.properties 에 SEEKER_BTCFI_RELEASE_* 4개 키 설정 완료
#   - keystore 파일이 keystores/seeker-btcfi-release.keystore 위치에 존재
#   - Seeker 또는 Android 디바이스가 USB로 연결되어 adb devices에 보임

set -euo pipefail

# 스크립트가 어디서 호출되든 프로젝트 루트에서 실행
cd "$(dirname "$0")"

readonly PACKAGE="com.seekerbtcfi.app"

RELEASE=0
SKIP_PREBUILD=0
REINSTALL=0
for arg in "$@"; do
    case "$arg" in
        --release) RELEASE=1 ;;
        --skip-prebuild) SKIP_PREBUILD=1 ;;
        --reinstall) REINSTALL=1 ;;
        -h|--help)
            sed -n '2,25p' "$0"
            exit 0
            ;;
        *)
            echo "Unknown option: $arg" >&2
            exit 1
            ;;
    esac
done

if [[ "$RELEASE" -eq 0 ]]; then
    # dev client(debug) — 기본은 설치/데이터 유지 (uninstall 안 함). 네이티브 변경은 자동 incremental 빌드.
    if [[ "$REINSTALL" -eq 1 ]]; then
        echo "==> adb uninstall $PACKAGE (서명 불일치 해결용, no-op if not installed)"
        adb uninstall "$PACKAGE" || true
    fi
    echo "==> dev: npx expo run:android --device  (dev client 빌드+설치+실행)"
    exec npx expo run:android --device
fi

# --- release APK 빌드 + 설치 ---
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
