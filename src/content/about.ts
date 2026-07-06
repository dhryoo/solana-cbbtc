// 앱 내 "About this app" 화면에 표시되는 long-form 설명.
// dApp Store 메타데이터(STORE/metadata/description.{ko,en}.md)의 long_description 본문과
// 의도적으로 동일한 콘텐츠 — 사용자가 스토어에서 본 내용을 앱에서도 동일하게 확인 가능.
// 변경 시 양쪽 모두 업데이트 필요.

export const ABOUT_KO = `# Solana cbBTC

Solana Seeker 사용자를 위한 BTCfi 모바일 앱입니다.

cbBTC는 Coinbase가 발행한 비트코인 1:1 페그 토큰으로, Solana 메인넷에서 시총 $340M+ 규모의 가장 안정적인 wrapped Bitcoin입니다. 본 앱은 cbBTC를 Solana 모바일 환경에서 안전하게 다룰 수 있는 가장 간결한 경로를 제공합니다.

## 🔑 핵심 기능

- **Mobile Wallet Adapter** — Seeker의 Seed Vault와 직접 연동, hardware 수준의 키 보안
- **실시간 잔액 표시** — cbBTC, SOL, SKR을 한 화면에서. 아래로 당겨 즉시 새로고침
- **Jupiter Swap 통합** — Solana 최대 aggregator의 최적 라우트로 SOL ↔ cbBTC 거래
- **슬리피지 제어** — 0.1% / 0.5% / 1% 중 선택, 시장 상황에 맞게 조정
- **Versioned transaction** — Jupiter v6의 최신 트랜잭션 포맷 완전 호환
- **Swap 완료 알림** — 백그라운드에서도 결과 확인, Solscan 링크로 즉시 확인

## 💰 cbBTC 렌딩 (Earn) — Phase 2

- **공급 / 인출** — cbBTC를 Kamino의 audited 스마트컨트랙트에 공급하고 언제든 전액·일부 회수
- **담보 대출** — cbBTC를 담보로 USDC 차입, 상환하면 담보 회수 (첫 차입 시 위험 동의)
- **위험 표시** — health(건전성)·청산가를 항상 표시, 안전/주의/위험 색상으로 강조
- **비수탁(self-custody)** — 앱은 자금·키를 보관하지 않음. 모든 거래는 Seed Vault로 직접 서명
- **진행 상황 시각화** — 준비 → 검증 → 서명 → 전송 → 완료 단계 표시 + Solana Explorer 확인
- **안내 화면** — 작동 방식·투명성·위험을 인포그래픽으로 쉽게 설명

## ⚡ Bitcoin Lightning (실험적) — 전용 탭

하단 **Bitcoin Lightning 탭**의 실험 기능입니다 (소액 권장):

- **LN 인보이스 결제** — Bitcoin 의 결제망(Lightning Network) 인보이스를 USDC·SOL 로 바로 지불
- **Atomic swap (HTLC)** — Atomiq 의 감사받은 escrow 컨트랙트 사용. 서명은 전부 Solana 쪽에서만 (Seed Vault)
- **실패해도 안전** — LN 지급이 안 되면 자금은 환불. LP 는 지급 증명 없이 자금을 가져갈 수 없음
- **앱 수수료 0** — LP 수수료(~0.5%)만 견적에 표시
- lightning address (user@domain) 지원 — 금액(sats)만 입력하면 됨

실험 기능 특성상 소액 사용을 권장합니다.

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
- **USDC** (렌딩 차입 자산)
- **SKR** (Solana Mobile 보상 토큰)

향후 추가 BTC 페그 토큰으로 확장 예정.

## 🔮 로드맵

- ✅ **Phase 1**: cbBTC ↔ SOL swap (Jupiter) — **완료**
- ✅ **Phase 2**: cbBTC 기반 lending (Kamino) — 공급·인출·차입·상환 **완료**
- **Phase 2.5**: 멀티 프로토콜 비교 (marginfi/Solend 추가) — Kamino 와 금리 비교
- ⚡ **Phase 3**: Bitcoin Lightning 결제 — **전용 탭으로 출시** (실험적). USDC·SOL·cbBTC 로 LN 인보이스 결제·수신, Atomiq atomic swap(HTLC), 서명은 Solana 쪽만
- **Phase 4**: 다양한 wrapped BTC 비교/통합 swap (cbBTC · tBTC · BTC.b 등)

## 📊 기술 스택

React Native · Expo SDK 54 · TypeScript strict · Solana Mobile Wallet Adapter · Jupiter Swap v6 · Kamino Lend · TanStack Query

## 🌐 오픈소스

본 앱은 **MIT 라이선스**로 공개됩니다. 모든 보안·트랜잭션 로직을 직접 검증할 수 있습니다.

---

## 🔧 문제 해결

### 앱이 "인증 중..." 에서 멈춰 있어요
0.1.0 초기 버전에 알려진 잠금 해제 버그입니다. **0.1.1 이상 버전에서는 수정**되었습니다. 현재 stuck 상태라면:

1. Android 설정 → 앱 → **Solana cbBTC** → 저장공간 → **데이터 지우기**
2. 앱을 다시 열어 지갑 재연결
3. (선택) 설정에서 앱 잠금 다시 켜기 — 새 버전은 해당 race를 우회합니다

### 지갑이 연결되지 않아요
- MWA 호환 지갑이 설치되어 있는지 확인 (Phantom, Solflare, Backpack, Seeker Seed Vault)
- 인터넷 연결 확인 — 상단에 오프라인 배너가 떠 있지 않은지
- 지갑 앱을 한 번 열어 잠금 해제한 후 재시도

### 잔액이 표시되지 않거나 견적이 안 와요
- 상단에 "인터넷 연결 없음" 배너가 있다면 네트워크 확인
- 자산 화면에서 **아래로 당겨 새로고침**
- Jupiter API rate limit (429) 일 수 있음 — 잠시 후 재시도하면 자동 백오프

### Swap이 실패해요
- **"가스비용 SOL이 부족합니다"** → SOL 잔액 0.002 SOL 이상 확인
- **"슬리피지 초과"** → 슬리피지를 0.5% → 1% 로 올리고 재시도
- **"블록해시 만료"** → 즉시 재시도 (자동으로 새 견적이 발급됨)
- **"사용자 취소"** → 지갑에서 한 번 더 승인

### 그 외 문제
- 설정 → 정보 → **문의 / 제보** 로 이메일 보내거나
- GitHub Issues 에 등록: https://github.com/dhryoo/solana-cbbtc/issues

---

## ⚠️ 안내

Solana cbBTC는 사용자가 직접 트랜잭션을 승인하는 self-custody 지갑 도구입니다. 트랜잭션 비용은 Solana 네트워크 표준 수수료가 적용되며, Jupiter swap에는 라우트별 가격 영향이 발생합니다. 트랜잭션 실행 전 모달에서 정확한 수령량과 슬리피지를 확인해 주세요.

mainnet 실거래에 사용되는 앱입니다. 사용자 자신의 자금에 대한 모든 책임은 사용자에게 있으며, 본 앱 개발자는 잘못된 입력·시장 변동·네트워크 장애 등으로 인한 손실에 책임지지 않습니다.`;

export const ABOUT_EN = `# Solana cbBTC

The mobile BTCfi app for Solana Seeker users.

cbBTC is Coinbase's 1:1 Bitcoin-pegged token — currently the largest wrapped Bitcoin on Solana mainnet with $340M+ market cap. This app gives you the most direct, hardware-secured path to hold and swap cbBTC from your Seeker.

## 🔑 Core features

- **Mobile Wallet Adapter** — direct integration with Seeker's Seed Vault for hardware-level key security
- **Live balances** — cbBTC, SOL, and SKR on one screen, pull-to-refresh
- **Jupiter Swap integration** — best routes from Solana's largest aggregator for SOL ↔ cbBTC
- **Slippage control** — pick 0.1% / 0.5% / 1% per trade
- **Versioned transaction** — full compatibility with Jupiter v6's latest tx format
- **Swap completion notifications** — get results even when the app is backgrounded, with Solscan link to verify

## 💰 cbBTC lending (Earn) — Phase 2

- **Supply / withdraw** — supply cbBTC to Kamino's audited smart contracts and take it back anytime (all or part)
- **Borrow against collateral** — borrow USDC against cbBTC, repay to free your collateral (risk consent on first borrow)
- **Risk display** — health and liquidation price always shown, color-coded safe / caution / danger
- **Self-custody** — the app never holds your funds or keys; every transaction is signed with your Seed Vault
- **Progress visualization** — prepare → simulate → sign → send → done steps + Solana Explorer verification
- **Guide screen** — how it works, transparency, and risk explained with infographics

## ⚡ Bitcoin Lightning (experimental) — its own tab

An experimental feature in the **Bitcoin Lightning tab** (small amounts recommended):

- **Pay LN invoices** — settle Lightning Network invoices (Bitcoin's payment rail) directly with USDC · SOL
- **Atomic swaps (HTLC)** — via Atomiq's audited escrow contracts. Every signature stays on the Solana side (Seed Vault)
- **Safe on failure** — if the LN payment doesn't complete, your funds are refunded. The LP can't claim funds without payment proof
- **Zero app fee** — only the LP fee (~0.5%), shown in the quote
- Lightning address (user@domain) support — just enter the amount in sats

As an experiment, small amounts are recommended.

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
- **USDC** (lending borrow asset)
- **SKR** (Solana Mobile rewards token)

Future expansion: additional BTC-pegged tokens.

## 🔮 Roadmap

- ✅ **Phase 1**: cbBTC ↔ SOL swap (Jupiter) — **done**
- ✅ **Phase 2**: cbBTC-backed lending (Kamino) — supply · withdraw · borrow · repay **done**
- **Phase 2.5**: Multi-protocol comparison (add marginfi / Solend alongside Kamino for rate comparison)
- ⚡ **Phase 3**: Bitcoin Lightning payments — **shipped as a dedicated tab** (experimental). Pay and receive LN invoices with USDC · SOL · cbBTC via Atomiq atomic swaps (HTLC), signing only on Solana
- **Phase 4**: Cross-asset wrapped BTC comparison and routing (cbBTC · tBTC · BTC.b ...)

## 📊 Tech stack

React Native · Expo SDK 54 · TypeScript strict · Solana Mobile Wallet Adapter · Jupiter Swap v6 · Kamino Lend · TanStack Query

## 🌐 Open source

Released under the **MIT license**. All security and transaction logic is open for review.

---

## 🔧 Troubleshooting

### The app gets stuck on "Authenticating…"
A known App Lock unlock bug in v0.1.0. **Fixed in v0.1.1+**. If you're currently stuck:

1. Android Settings → Apps → **Solana cbBTC** → Storage → **Clear data**
2. Reopen the app and reconnect your wallet
3. (Optional) Re-enable App Lock in Settings — the new version sidesteps the race

### My wallet won't connect
- Make sure an MWA-compatible wallet is installed (Phantom, Solflare, Backpack, Seeker Seed Vault)
- Check your internet connection — no offline banner at the top
- Open your wallet app once to unlock it, then retry

### Balances or quotes won't load
- If the "No internet connection" banner is showing, check your network
- Pull down to refresh on the Assets screen
- May be a Jupiter API rate limit (429) — retry after a moment, the app backs off automatically

### My swap fails
- **"Insufficient SOL for fees"** → keep at least 0.002 SOL for gas
- **"Slippage exceeded"** → bump slippage from 0.5% to 1% and retry
- **"Blockhash expired"** → retry immediately (a fresh quote is fetched automatically)
- **"User cancelled"** → approve once more in the wallet

### Anything else
- Settings → About → **Feedback** to email us, or
- File a GitHub issue: https://github.com/dhryoo/solana-cbbtc/issues

---

## ⚠️ Disclaimer

Solana cbBTC is a self-custody wallet tool — you sign every transaction yourself. Standard Solana network fees apply, and Jupiter swaps incur route-dependent price impact. Confirm the expected receive amount and slippage in the confirmation modal before signing.

This app executes real mainnet transactions. You bear sole responsibility for your funds. The developers are not liable for losses arising from incorrect inputs, market volatility, network outages, or any other cause.`;
