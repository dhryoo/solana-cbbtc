#!/usr/bin/env bash
# Layer 0 자가측정 — release APK 를 GitHub release 에 asset 으로 첨부한다.
# WHY: GitHub Releases API 의 per-asset download_count 가 "설치 하한선" proxy 로 활성화됨.
#      백엔드·트래커 없이(공개 API) 배포 추이를 본다. 설계: design/A3-onchain-self-measurement.md
#
# 사용법:
#   1) ./run.sh --release          # release APK 빌드 (android/.../app-release.apk 생성)
#   2) gh release create <tag> ... # 승인 후 GitHub release 생성 (기존 흐름)
#   3) scripts/release-apk.sh <tag>  # ← 이 스크립트로 APK 를 그 release 에 첨부
#
# 부수효과: 서명된 APK 가 GitHub 에서 공개 다운로드 가능해진다(사이드로드 경로).
#           오픈소스(MIT) self-custody 앱이라 재현빌드 검증에도 유리. 원치 않으면 첨부 생략.
set -euo pipefail
cd "$(dirname "$0")/.."

TAG="${1:?사용법: scripts/release-apk.sh <tag>  (예: v0.4.3)}"
APK="android/app/build/outputs/apk/release/app-release.apk"

if [[ ! -f "$APK" ]]; then
    echo "APK 없음: $APK" >&2
    echo "먼저 ./run.sh --release 로 빌드하세요." >&2
    exit 1
fi

# 다운로드 파일명에 버전이 보이도록 versioned 이름으로 업로드
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
ASSET="$TMP/solana-cbbtc-${TAG}.apk"
cp "$APK" "$ASSET"

echo "==> gh release upload ${TAG}  (asset: solana-cbbtc-${TAG}.apk)"
gh release upload "$TAG" "$ASSET" --clobber
echo "완료. 다운로드 수는 scripts/usage-report.sh 로 확인."
