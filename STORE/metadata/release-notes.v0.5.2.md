# Release notes — v0.5.2 (versionCode 25)

dApp Store 제출 시 "release notes / What's new" 필드에 아래 영문 블록을 복사.
이번 릴리스는 사용자 요청에 따라 **영어만** 작성한다 (스토어 리스팅 로케일 렌더링 여부가 아직 검증되지 않았으므로, 로케일별 What's new 는 검증 후 도입).

스토어 배포본이 **v0.5.1(versionCode 24)** 이므로 이번 업데이트는 **0.5.1 → 0.5.2** 입니다.
patch 범프 사유: **중국어 간체(zh-Hans) 추가** + **Lightning 소액 결제 시 라우팅 실패 안내 개선**. 자금 경로 로직 변경 없음.
새 권한·새 네이티브 모듈·새 네트워크 호스트 **없음**.

## English (en)

```
v0.5.2 — Simplified Chinese + a clearer Lightning message

• 🇨🇳 简体中文 — the app is now available in Simplified Chinese (Settings → Language)
• Clearer Lightning errors — if no liquidity provider can route your payment (this happens with very small amounts, because every Lightning swap has a practical minimum), the app now explains why and what to do instead of showing a raw error
• Localization quality pass — the About page and every screen are checked for missing or mismatched translations at build time

Self-custody as always — keys stay in Seed Vault, no backend or trackers, no app fee.
```

## dApp Store 심사 노트 (제출 시 reviewer notes / "Notes for review" 에 영문 입력)

```
REVIEWER NOTES — Solana cbBTC (com.seekerbtcfi.app), v0.5.2 (versionCode 25)

WHAT CHANGED SINCE THE LIVE BUILD (v0.5.1, versionCode 24)
- NO new permissions. No permission was added, removed, or modified.
- NO new native modules, no new third-party SDKs.
- NO new network endpoints/hosts. Previously declared hosts are unchanged (Solana RPC + failover, Jupiter lite-api.jup.ag, Atomiq Lightning LP nodes, raw.githubusercontent.com LP registry, api.github.com for the release update-check).
- No analytics, tracker, ad SDK, or backend server. The app remains fully non-custodial and on-device.

NEW LANGUAGE
- Simplified Chinese (zh-Hans) added as a fourth UI language alongside English, Korean and Vietnamese. Localization strings only — selectable under Settings -> Language, or auto-detected from the device locale. Devices set to Traditional Chinese also receive the Simplified UI (no separate zh-Hant resource is shipped); users can switch to English in Settings.

USER-FACING FIX
- Lightning: when no liquidity provider (intermediary) can route a payment — which is what happens for very small amounts, since each Lightning swap carries a fixed on-chain settlement cost — the app now shows a plain-language explanation and suggests a larger amount, instead of surfacing the raw SDK error string. No change to the payment path itself.

CUSTODY & EXPERIMENTAL STATUS (unchanged)
- Non-custodial: all signing happens in the user's wallet via the Mobile Wallet Adapter / Seed Vault. The app never holds, generates, or transmits private keys or seed phrases; no backend, no analytics.
- The Bitcoin Lightning feature remains experimental, small-amounts-only (hard-capped at 100,000 sats per payment), and non-custodial — a third-party LP, not the app, performs the Bitcoin Lightning payment.
```

## 빌드 전 필수 확인 (v0.5.0 → v0.5.1 에서 실제로 물렸던 것)

- **publisher 지갑 SOL 잔액 ≥ 0.05 SOL.** Release NFT 민팅 rent 가 부족하면 publish 가 실패하고 **versionCode 가 소모**된다 (v0.4.3, v0.5.0 두 번 발생).
- **stale 번들 주의.** gradle 이 `createBundleReleaseJsAndAssets` 캐시를 재사용하면 manifest 는 새 버전인데 JS 번들은 옛 버전 문자열을 그대로 들고 있다 (설정 화면 버전이 app.json 을 직접 읽기 때문에 눈에 보인다).
  → 빌드 전 `rm -rf android/app/build` + Metro/Haste 캐시 정리 후 빌드할 것.
- APK 검증 시 Hermes 번들은 비ASCII 를 **UTF-16LE** 로 저장한다. UTF-8 grep 으로 중국어/한국어를 찾으면 0건이 나오는 게 정상이므로 UTF-16LE 로 검색할 것.
