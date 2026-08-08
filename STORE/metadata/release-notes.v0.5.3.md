# Release notes — v0.5.3 (versionCode 26)

dApp Store 제출 시 "release notes / What's new" 필드에 아래 영문 블록을 복사.
이번 릴리스도 **영어만** 작성한다 (스토어 리스팅 로케일 렌더링 여부가 아직 미검증 — 검증 후 로케일별 What's new 도입).

스토어 배포본이 **v0.5.2(versionCode 25)** 이므로 이번 업데이트는 **0.5.2 → 0.5.3** 입니다.
patch 범프 사유: **버그 수정 · 안정성 · UX 개선** (새 기능·새 화면 없음). 다만 이번엔 **자금 경로(lending/swap/lightning) 로직이 변경**되었으므로 reviewer notes 에 명시한다.
새 권한·새 네이티브 모듈·새 네트워크 호스트 **없음**.

## English (en)

```
v0.5.3 — Safer lending, smoother swaps and a clearer Lightning flow

• Lending now works with an open loan — you can withdraw or add cbBTC collateral even while a USDC loan is open (this previously failed). Withdrawals are capped to keep your loan safely collateralized, and "repay all" is blocked up front if your USDC balance can't cover it.
• Clearer borrow/repay amounts — the Borrow and Repay screens now explain up front why the amount shown can read slightly below what you type (USDC is worth about $1, not exactly $1, and interest accrues over time), so it doesn't surprise you at repay.
• Swaps check before you sign — a swap that would fail on-chain (for example, the price moved past your slippage) is now caught before signing, so you don't waste gas on it.
• Clearer Lightning flow — the payment quote and the Pay button now open in a bottom sheet so you can't miss them, and the screen scrolls to your payment result when it's done. More Lightning addresses are accepted, and Lightning payments now use the app's RPC failover for fewer stalls.
• Reliability & polish — the "no internet" banner clears itself when you reconnect, small accent text now meets accessibility contrast, and tab labels are consistent across languages.

Self-custody as always — keys stay in Seed Vault, no backend or trackers, no app fee.
```

## dApp Store 심사 노트 (제출 시 reviewer notes / "Notes for review" 에 영문 입력)

```
REVIEWER NOTES — Solana cbBTC (com.seekerbtcfi.app), v0.5.3 (versionCode 26)

WHAT CHANGED SINCE THE LIVE BUILD (v0.5.2, versionCode 25)
- NO new permissions. None added, removed, or modified.
- NO new native modules, no new third-party SDKs.
- NO new network endpoints/hosts. Previously declared hosts are unchanged (Solana RPC + failover, Jupiter lite-api.jup.ag, Atomiq Lightning LP nodes, raw.githubusercontent.com LP registry, api.github.com for the release update-check).
- No analytics, tracker, ad SDK, or backend server. The app remains fully non-custodial and on-device.

MONEY-PATH LOGIC DID CHANGE THIS RELEASE (stated for transparency; all still non-custodial, wallet-signed)
- Kamino lending (Earn): fixed transaction construction so supply/withdraw succeed when a USDC loan is open (they previously reverted at pre-sign simulation with 6009 ReserveStale, then 2502 RequireKeysEqViolated — the reserve refresh order now matches Kamino's own SDK). Withdraw is capped client-side to keep the loan collateralized (avoids Kamino 6011 WithdrawTooLarge); "repay all" is guarded against an insufficient USDC balance. Lending transactions now attach a ComputeBudget priority fee so they land under network congestion. The cToken exchange rate now subtracts unsettled reserve fees, matching Kamino's getTotalSupply formula.
- Swap: a client-side simulateTransaction gate now runs before signing. A swap that would revert on-chain is blocked before the wallet prompt (funds were always protected by Jupiter's slippage threshold; this only avoids wasting gas).
- Lightning: swaps now use the app's existing RPC failover Connection instead of a single pinned endpoint (same hosts, no new endpoint). The quote/pay UI moved into a bottom-sheet and the result auto-scrolls into view — presentation only.

CUSTODY & EXPERIMENTAL STATUS (unchanged)
- Non-custodial: all signing happens in the user's wallet via the Mobile Wallet Adapter / Seed Vault. The app never holds, generates, or transmits private keys or seed phrases; no backend, no analytics.
- The Bitcoin Lightning feature remains experimental, small-amounts-only (hard-capped at 100,000 sats per payment), and non-custodial — a third-party LP, not the app, performs the Bitcoin Lightning payment.
```

## 빌드 전 필수 확인 (v0.5.0 → v0.5.1 에서 실제로 물렸던 것)

- **publisher 지갑 SOL 잔액 ≥ 0.05 SOL.** Release NFT 민팅 rent 가 부족하면 publish 가 실패하고 **versionCode 가 소모**된다 (v0.4.3, v0.5.0 두 번 발생).
- **stale 번들 주의.** gradle 이 `createBundleReleaseJsAndAssets` 캐시를 재사용하면 manifest 는 새 버전인데 JS 번들은 옛 버전 문자열을 그대로 들고 있다 (설정 화면 버전이 app.json 을 직접 읽기 때문에 눈에 보인다).
  → 빌드 전 `rm -rf android/app/build` + Metro/Haste 캐시 정리 후 빌드할 것.
- APK 검증 시 Hermes 번들은 비ASCII 를 **UTF-16LE** 로 저장한다. UTF-8 grep 으로 중국어/한국어를 찾으면 0건이 나오는 게 정상이므로 UTF-16LE 로 검색할 것.

## 이번 릴리스에 포함된 커밋 (v0.5.2..v0.5.3)

- fix(update): keep the update banner clear of the status bar
- fix(network): self-heal offline banner when connectivity returns
- fix(lending): add priority fee to Kamino tx builders (N1)
- fix(lending): refresh every obligation reserve on supply/withdraw + refresh operation reserve last (R09)
- fix(lending): subtract unsettled fees from cToken exchange rate (R31)
- fix(lending): cap withdraw/repay to what an open loan allows — avoid 6011 / insufficient-funds
- feat(earn): explain the USD-value/interest difference up front in the borrow + repay forms
- refactor(lending): consolidate the four mutation hooks + drop dead allowOracleStale bypass (R28, R32)
- fix(swap): simulate before signing to block doomed swaps (N2)
- fix(lightning): classify 'ln'-prefixed lightning addresses correctly (N4)
- fix(lightning): route Atomiq swaps through the app's RPC failover (R16)
- fix(lightning): show the quote + pay button in a bottom-sheet, not below the fold
- fix(lightning): auto-scroll to the payment result (onLayout-based)
- test(lightning): cover cbBTC pay orchestration, hooks, and refund recovery (R23, R25, R26)
- fix(ux): accessible accent-text color, uniform tab labels, a11y polish (R41/R43/N5/N6)
- docs(review): record resolution of the 2026-07 follow-up batch
