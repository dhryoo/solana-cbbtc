# Release notes — v0.4.2 (versionCode 20)

dApp Store 제출 시 "release notes / What's new" 필드에 복사.

스토어 배포본이 **v0.4.1(versionCode 19)** 이므로 이번 업데이트는 **0.4.1 → 0.4.2 단독**입니다.
새 권한·새 네이티브 모듈·새 네트워크 호스트 **없음** (스왑은 기존 Jupiter 경로 그대로).

## 한국어 (ko)

```
v0.4.2 — cbBTC 스왑 상대 토큰 선택 + 가스/상환 안내 개선

• cbBTC 스왑 상대 토큰 선택 — 이제 SOL뿐 아니라 SKR·USDC 로도 cbBTC 를 사고팔 수 있어요 (SKR↔cbBTC, USDC↔cbBTC)
• 가스(SOL) 부족 사전 알림 — 예치·인출·차입·상환 및 라이트닝 송금 전에, 수수료로 쓸 SOL 이 부족할 수 있으면 미리 알려드립니다
• 상환 오류 안내 개선 — USDC 가 모자라 전액 상환이 안 될 때, 원인을 정확히(‘SOL’이 아니라 ‘USDC 부족’) 안내합니다
• 거래 진행 표시 개선 — 진행 상황을 화면 중앙 팝업으로 또렷하게 보여줍니다 (길이가 긴 화면에서도 가려지지 않게)
• 비수탁 유지 — 자금·키는 Seed Vault, 백엔드·트래커 없음
```

## English (en)

```
v0.4.2 — Pick the cbBTC swap counter token + clearer gas/repay guidance

• Pick the cbBTC swap counter token — buy/sell cbBTC with SKR and USDC, not just SOL (SKR↔cbBTC, USDC↔cbBTC)
• Low-SOL (gas) heads-up — get a warning before lending actions and Lightning sends if your SOL for network fees looks low
• Clearer repay errors — when USDC is short for a full repay, the app now says so (instead of pointing at SOL)
• Improved progress display — transaction progress now appears in a clear, centered dialog (no longer hidden on long screens)
• Self-custody as always — keys stay in Seed Vault, no backend or trackers
```

## dApp Store 심사 노트 (제출 시 reviewer notes / "Notes for review" 에 영문 입력)

```
REVIEWER NOTES — Solana cbBTC (com.seekerbtcfi.app), v0.4.2 (versionCode 20)

WHAT CHANGED SINCE THE LIVE BUILD (v0.4.1, versionCode 19)
- NO permission changes. No permission was added, removed, or modified vs v0.4.1.
- NO new native modules. No new third-party SDKs.
- NO new network endpoints/hosts. The previously declared hosts are unchanged (Solana RPC + failover, Jupiter lite-api.jup.ag, Atomiq Lightning LP nodes, the raw.githubusercontent.com LP registry, and api.github.com for the release update-check).
- No analytics, tracker, ad SDK, or backend server. The app remains fully non-custodial and on-device.

USER-FACING CHANGES
- Swap counter token: the cbBTC swap screen now lets the user pick the other side of the pair among SOL / SKR / USDC, enabling SKR<->cbBTC and USDC<->cbBTC in addition to the existing SOL<->cbBTC. This routes through the same Jupiter aggregator API already used in v0.4.x; only the input/output mint changes. No new host.
- Low-SOL gas warnings: a non-blocking heads-up is shown before lending actions (supply/withdraw/borrow/repay) and Lightning send when the wallet's SOL balance may be too low to cover network fees (and, for a first-time lending position, account rent). Read-only balance check; does not change signing.
- Repay messaging fix: when a full ("MAX") USDC repay fails because the interest-accrued debt exceeds the wallet's USDC, the app now reports a USDC shortfall (previously this could be mislabeled as a SOL shortage). Pre-sign simulation still gates every transaction before any signature.
- Progress UI: transaction progress is now shown in a centered modal dialog instead of an inline section, so it stays visible on long forms / above the keyboard.
- Internal: developer-only console logs for expected pre-sign simulation failures were downgraded from error to warn (gated behind __DEV__; no effect on release builds).

CUSTODY & EXPERIMENTAL STATUS
- Non-custodial: all signing happens in the user's wallet via the Mobile Wallet Adapter / Seed Vault. The app never holds, generates, or transmits private keys or seed phrases, and operates with no backend and no analytics.
- The Lightning ("Labs") features remain experimental and behind the in-app Labs toggle (off by default).
```
