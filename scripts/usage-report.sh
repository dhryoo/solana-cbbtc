#!/usr/bin/env bash
# Layer 0 자가측정 — GitHub release asset 다운로드 수(설치 하한선 proxy) 조회.
# WHY: no-backend·no-analytics 정책 하에서 "쓰이는가" 의 가장 싼 신호.
#      공개 GitHub API 만 읽음 — 트래커 아님. 설계: design/A3-onchain-self-measurement.md
#
# 한계: download_count 는 CDN 다운로드(봇/CI/미러 포함)이며 고유 사용자·리텐션·dApp Store
#       설치를 포함하지 않는다. 거친 배포 하한으로만 해석할 것.
#
# 사용법: scripts/usage-report.sh [owner/repo]   (기본: dhryoo/solana-cbbtc)
set -euo pipefail

REPO="${1:-dhryoo/solana-cbbtc}"

echo "== ${REPO} — release asset download_count =="
gh api "repos/${REPO}/releases" --paginate \
    --jq '.[] | select((.assets | length) > 0)
          | "\(.tag_name)\t\(.assets[] | "\(.name): \(.download_count)")"'

echo
echo "(출력이 없으면 어떤 release 에도 APK asset 이 없는 상태"
echo " → scripts/release-apk.sh <tag> 로 첨부해야 신호가 생깁니다.)"
