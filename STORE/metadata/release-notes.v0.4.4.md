# Release notes — v0.4.4 (versionCode 22)

dApp Store 제출 시 "release notes / What's new" 필드에 복사.

스토어 배포본이 **v0.4.2(versionCode 20)** 이므로 이번 업데이트는 **0.4.2 → 0.4.4 단독**입니다.
(v0.4.3/vc21 은 포털 publish 단계에서 **publisher 지갑 SOL 부족(Release NFT 민팅 rent)**으로 실패 → 동일 코드를 vc22/0.4.4 로 재시도. 코드·기능 차이 없음.)
새 권한·새 네이티브 모듈·새 네트워크 호스트 **없음**. 핵심 변경 = 기존 실험 기능 **Lightning 이 Labs 토글에서 전용 탭으로 승격**(실질은 비수탁·무수수료 그대로).

## 한국어 (ko)

```
v0.4.4 — Bitcoin Lightning 전용 탭 + 더 친절한 안내

• Bitcoin Lightning 전용 탭 — 실험 기능을 Labs 토글에서 독립 탭으로 분리했어요. ‘Bitcoin Lightning’임을 명확히 표시하고, 결제당 소액 상한(최대 100,000 sats)을 적용했습니다 (실험적 — 소액만 권장)
• 지불 증명(preimage) — 라이트닝 결제가 완료되면 인보이스가 실제 지불됐다는 암호학적 증거를 보여주고 복사할 수 있어요
• 견적 만료 보호 — 라이트닝 견적이 오래되면 알 수 없는 오류 대신 ‘다시 견적 받기’로 안내합니다
• 더 친절한 안내 — 첫 화면 cbBTC 설명 + 셀프커스터디 강조, 가스(SOL)·계정 보증금·Health 문구 개선, 서명 전 ‘되돌릴 수 없음’ 안내, 반복 문구 정리
• 비수탁 유지 — 키·자금은 Seed Vault, 백엔드·트래커 없음, 앱 수수료 없음
```

## English (en)

```
v0.4.4 — Bitcoin Lightning gets its own tab + clearer guidance

• Bitcoin Lightning, now its own tab — moved the experimental feature out of the Labs toggle into a dedicated tab, made it clear it's Bitcoin's Lightning, and added a small per-payment cap (up to 100,000 sats). Experimental — small amounts only.
• Proof of payment (preimage) — after a successful Lightning payment, see and copy the cryptographic proof that the invoice was actually paid
• Quote-expiry guard — if a Lightning quote goes stale, you're prompted to re-quote instead of hitting a raw error
• Clearer guidance — a cbBTC explainer + self-custody lead on the home screen, friendlier gas (SOL) / account-rent / Health wording, an "it can't be undone" note before signing, and trimmed repetitive copy
• Self-custody as always — keys stay in Seed Vault, no backend or trackers, no app fee
```

## dApp Store 심사 노트 (제출 시 reviewer notes / "Notes for review" 에 영문 입력)

```
REVIEWER NOTES — Solana cbBTC (com.seekerbtcfi.app), v0.4.4 (versionCode 22)

WHAT CHANGED SINCE THE LIVE BUILD (v0.4.2, versionCode 20)
- NO permission changes. No permission was added, removed, or modified vs v0.4.2.
- NO new native modules. No new third-party SDKs.
- NO new network endpoints/hosts. The previously declared hosts are unchanged (Solana RPC + failover, Jupiter lite-api.jup.ag, Atomiq Lightning LP nodes, the raw.githubusercontent.com LP registry, and api.github.com for the release update-check).
- No analytics, tracker, ad SDK, or backend server. The app remains fully non-custodial and on-device.

KEY CHANGE — LIGHTNING IS NOW A DEDICATED TAB (previously an opt-in "Labs" toggle)
- The Lightning feature that already shipped since v0.3.x (behind a Settings -> Labs toggle that injected it into the Swap tab) is now a dedicated bottom tab, titled "Bitcoin Lightning."
- It is UNCHANGED IN SUBSTANCE and remains NON-CUSTODIAL: the app never holds, transmits, or controls user funds or keys. The user signs only on the Solana side (Seed Vault / Mobile Wallet Adapter); an independent third-party Liquidity Provider (Atomiq) performs the off-chain Lightning payment; an on-chain HTLC (audited escrow) automatically refunds the user if the payment does not complete.
- The app charges NO fee (only the LP's ~0.5% fee applies, shown in the quote before signing).
- It is clearly labeled experimental (a "BETA" badge plus an on-screen "experimental, small amounts only" notice) and now enforces an explicit per-payment cap of 100,000 sats on both send and receive.
- The internal "Labs" toggle/provider was removed; no user data is affected.

OTHER USER-FACING CHANGES
- Proof of payment: after a successful Lightning payment, the app shows the preimage (the cryptographic proof the invoice was paid) on the result card, copyable. Local display only; nothing is transmitted off-device.
- Quote-expiry guard: a stale Lightning quote is blocked before any signature, and the user is prompted to re-quote (prevents committing an escrow against an outdated quote).
- Copy/UX: a clearer cbBTC explainer and self-custody framing on the home screen, friendlier wording for network fees / Solana account "rent" / lending Health, an irreversibility note before signing, and trimmed repetitive reassurance text.
- Internal only (no user-facing effect): centralized error sentinels, polyfill unit tests, and additional Lightning provider tests.

CUSTODY & EXPERIMENTAL STATUS
- Non-custodial: all signing happens in the user's wallet via the Mobile Wallet Adapter / Seed Vault. The app never holds, generates, or transmits private keys or seed phrases, and operates with no backend and no analytics.
- The Lightning feature remains experimental, small-amounts-only (hard-capped at 100,000 sats per payment), and non-custodial. A third-party LP — not the app — performs the Bitcoin Lightning payment.
```
