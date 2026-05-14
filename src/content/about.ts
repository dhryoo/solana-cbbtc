// 앱 내 "About this app" 화면에 표시되는 long-form 설명.
// dApp Store 메타데이터(STORE/metadata/description.{ko,en}.md)의 long_description 본문과
// 의도적으로 동일한 콘텐츠 — 사용자가 스토어에서 본 내용을 앱에서도 동일하게 확인 가능.
// 변경 시 양쪽 모두 업데이트 필요.

export const ABOUT_KO = `# Solana cbBTC

Solana Seeker 사용자를 위한 BTCfi 모바일 앱입니다.

cbBTC는 Coinbase가 발행한 비트코인 1:1 페그 토큰으로, Solana 메인넷에서 시총 $300M+ 규모의 가장 안정적인 wrapped Bitcoin입니다. 본 앱은 cbBTC를 Solana 모바일 환경에서 안전하게 다룰 수 있는 가장 간결한 경로를 제공합니다.

## 🔑 핵심 기능

- **Mobile Wallet Adapter** — Seeker의 Seed Vault와 직접 연동, hardware 수준의 키 보안
- **실시간 잔액 표시** — cbBTC, SOL, SKR을 한 화면에서. 아래로 당겨 즉시 새로고침
- **Jupiter Swap 통합** — Solana 최대 aggregator의 최적 라우트로 SOL ↔ cbBTC 거래
- **슬리피지 제어** — 0.1% / 0.5% / 1% 중 선택, 시장 상황에 맞게 조정
- **Versioned transaction** — Jupiter v6의 최신 트랜잭션 포맷 완전 호환
- **Swap 완료 알림** — 백그라운드에서도 결과 확인, Solscan 링크로 즉시 확인

## 🛡️ 보안 우선

- 개인키는 Seeker **Seed Vault 하드웨어를 떠나지 않습니다**
- 모든 트랜잭션은 사용자가 직접 승인
- **백엔드 서버 없음** — Solana RPC와 Jupiter API에만 직접 호출
- 분석 도구·트래커 없음
- **앱 잠금** (지문/PIN) 옵션으로 추가 보호 가능

## 🎯 Seeker 사용자 우대

- **Seeker Genesis Token** 보유자에게 "Seeker Verified" 인증 배지 표시
- Seed Vault 사용 시 "🔒 Hardware secured" 표시
- Verified 사용자에게 더 낮은 기본 슬리피지(0.3%) 자동 적용
- Solana Mobile 생태계 정체성 부여

## ✨ 사용자 경험

- 한국어 / English 다국어 지원, 즉시 전환
- 라이트 / 다크 모드 자동 추적 또는 수동 선택
- 부드러운 splash + fade 전환으로 빠른 첫인상
- 최소한의 권한만 요청 (인터넷, 알림)

## 📱 지원 토큰

- **cbBTC** (Coinbase Wrapped BTC)
- **SOL** (Solana 네이티브 토큰)
- **SKR** (Solana Mobile 보상 토큰)

향후 USDC, 추가 BTC 페그 토큰으로 확장 예정.

## 🔮 로드맵

- **Phase 2**: cbBTC 기반 lending (Kamino 등)
- **Phase 3**: Lightning Network 결제 (실험적)
- **Phase 4**: 다양한 wrapped BTC 비교/통합 swap

## 📊 기술 스택

React Native · Expo SDK 54 · TypeScript strict · Solana Mobile Wallet Adapter · Jupiter Swap v6 · TanStack Query

## 🌐 오픈소스

본 앱은 **MIT 라이선스**로 공개됩니다. 모든 보안·트랜잭션 로직을 직접 검증할 수 있습니다.

---

## ⚠️ 안내

Solana cbBTC는 사용자가 직접 트랜잭션을 승인하는 self-custody 지갑 도구입니다. 트랜잭션 비용은 Solana 네트워크 표준 수수료가 적용되며, Jupiter swap에는 라우트별 가격 영향이 발생합니다. 트랜잭션 실행 전 모달에서 정확한 수령량과 슬리피지를 확인해 주세요.

mainnet 실거래에 사용되는 앱입니다. 사용자 자신의 자금에 대한 모든 책임은 사용자에게 있으며, 본 앱 개발자는 잘못된 입력·시장 변동·네트워크 장애 등으로 인한 손실에 책임지지 않습니다.`;

export const ABOUT_EN = `# Solana cbBTC

The mobile BTCfi app for Solana Seeker users.

cbBTC is Coinbase's 1:1 Bitcoin-pegged token — currently the largest wrapped Bitcoin on Solana mainnet with $300M+ market cap. This app gives you the most direct, hardware-secured path to hold and swap cbBTC from your Seeker.

## 🔑 Core features

- **Mobile Wallet Adapter** — direct integration with Seeker's Seed Vault for hardware-level key security
- **Live balances** — cbBTC, SOL, and SKR on one screen, pull-to-refresh
- **Jupiter Swap integration** — best routes from Solana's largest aggregator for SOL ↔ cbBTC
- **Slippage control** — pick 0.1% / 0.5% / 1% per trade
- **Versioned transaction** — full compatibility with Jupiter v6's latest tx format
- **Swap completion notifications** — get results even when the app is backgrounded, with Solscan link to verify

## 🛡️ Security first

- Private keys **never leave the Seeker Seed Vault** hardware
- Every transaction is approved directly by you
- **No backend servers** — calls only Solana RPC and Jupiter API
- No analytics, no trackers
- Optional **app lock** (fingerprint / PIN) for extra protection

## 🎯 Seeker-aware

- **"Seeker Verified" badge** for Genesis Token holders, cryptographically checked on-chain
- "🔒 Hardware secured" indicator when connected via Seed Vault
- Verified users get a tighter default slippage (0.3%) automatically
- Built specifically for the Solana Mobile ecosystem

## ✨ User experience

- Korean / English, instant switch
- Light / Dark mode with system tracking or manual choice
- Smooth splash + fade transition for fast launches
- Minimal permissions — only internet and (optional) notifications

## 📱 Supported tokens

- **cbBTC** (Coinbase Wrapped BTC)
- **SOL** (native Solana token)
- **SKR** (Solana Mobile rewards token)

Future expansion: USDC, additional BTC-pegged tokens.

## 🔮 Roadmap

- **Phase 2**: cbBTC-backed lending (e.g., Kamino)
- **Phase 3**: Lightning Network payment rails (experimental)
- **Phase 4**: Cross-asset wrapped BTC comparison and routing

## 📊 Tech stack

React Native · Expo SDK 54 · TypeScript strict · Solana Mobile Wallet Adapter · Jupiter Swap v6 · TanStack Query

## 🌐 Open source

Released under the **MIT license**. All security and transaction logic is open for review.

---

## ⚠️ Disclaimer

Solana cbBTC is a self-custody wallet tool — you sign every transaction yourself. Standard Solana network fees apply, and Jupiter swaps incur route-dependent price impact. Confirm the expected receive amount and slippage in the confirmation modal before signing.

This app executes real mainnet transactions. You bear sole responsibility for your funds. The developers are not liable for losses arising from incorrect inputs, market volatility, network outages, or any other cause.`;
