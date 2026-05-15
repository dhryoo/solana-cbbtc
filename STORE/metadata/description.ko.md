# dApp Store 메타데이터 — 한국어 (ko-KR)

Solana Mobile dApp Store Publisher Portal 입력용. 본 파일은 인간 참고용 메타데이터 원본 — 실제 제출 시 portal의 필드에 그대로 복사·붙여넣기 합니다.

---

## App name

```
Solana cbBTC
```

## Short description (≤ 80자)

> 글자 수 확인 필요. 한국어는 영어보다 표현이 압축적이라 보통 60~70자에서 끝남.

```
Solana Seeker에서 cbBTC를 한 번에 swap하는 BTCfi 모바일 앱.
```

(47자, 여유 충분)

대안 후보:

- "Solana 위의 Bitcoin, cbBTC. Seeker로 안전하게 swap." (40자)
- "Seeker 지갑으로 cbBTC를 즉시 거래하는 BTCfi 앱." (38자)

---

## Long description (≤ 4000자)

```
Solana cbBTC는 Solana Seeker 사용자를 위한 BTCfi 모바일 앱입니다.

cbBTC는 Coinbase가 발행한 비트코인 1:1 페그 토큰으로, Solana 메인넷에서 시총 $340M+ 규모의 가장 안정적인 wrapped Bitcoin입니다. 본 앱은 cbBTC를 Solana 모바일 환경에서 안전하게 다룰 수 있는 가장 간결한 경로를 제공합니다.

🔑 핵심 기능

• Mobile Wallet Adapter — Seeker의 Seed Vault와 직접 연동, hardware 수준의 키 보안
• 실시간 잔액 표시 — cbBTC, SOL, SKR을 한 화면에서. 아래로 당겨 즉시 새로고침
• Jupiter Swap 통합 — Solana 최대 aggregator의 최적 라우트로 SOL ↔ cbBTC 거래
• 슬리피지 제어 — 0.1% / 0.5% / 1% 중 선택, 시장 상황에 맞게 조정
• Versioned transaction + 동적 priority fee — Jupiter v6의 최신 포맷, 혼잡 시 자동 우선순위 상향 (cap 0.001 SOL)
• Swap 결과 공유 — 시스템 공유 시트로 Solscan 링크 즉시 전송
• Swap 완료 알림 — 백그라운드에서도 결과 확인 (선택)

🛡️ 보안 우선

• 개인키는 Seeker Seed Vault 하드웨어를 떠나지 않습니다
• 앱 잠금 (선택) — 생체 인증 또는 디바이스 PIN으로 앱 진입·복귀 시 잠금
• 모든 트랜잭션은 사용자가 직접 승인
• 백엔드 서버 없음 — Solana RPC와 Jupiter API에만 직접 호출
• 분석 도구·트래커·광고 ID 없음

📶 안정성

• 오프라인 자동 감지 — 인터넷 없을 때 상단 배너 + 액션 차단으로 명확히 안내
• 가스비 사전 검증 — 가스 부족 시 swap 버튼이 차단되어 실패 트랜잭션 방지
• 더블탭 가드 — 의도치 않은 중복 트랜잭션 차단
• 인터넷·Jupiter rate-limit 등 모든 에러를 한국어 메시지로 매핑

🎯 Seeker 사용자 우대

• Seeker Genesis Token 보유자에게 "Seeker Verified" 인증 배지 표시
• Seed Vault 사용 시 "Hardware secured" 표시로 보안 상태 즉시 확인
• Solana Mobile 생태계 정체성 부여

✨ 사용자 경험

• 한국어 / English 다국어 지원, 즉시 전환
• 라이트 / 다크 모드 자동 추적 또는 수동 선택
• 큰 글자 모드 호환 — 시스템 폰트 확대에도 레이아웃 유지
• 스크린 리더 지원 (a11y label / role / state)
• Native splash + 부드러운 fade 전환으로 빠른 첫인상
• 최소한의 권한만 요청 (인터넷, 알림·생체 인증은 선택)

📱 지원 토큰

• cbBTC (Coinbase Wrapped BTC) — 메인 거래 자산
• SOL (Solana 네이티브)
• SKR (Solana Mobile) — 잔액 표시
• 향후 USDC, 추가 BTC 페그 토큰 확장 예정

🔮 로드맵 (계획)

• Phase 2: cbBTC 기반 lending (Kamino 등)
• Phase 3: Lightning Network 결제 (실험적)
• Phase 4: 다양한 wrapped BTC 비교/통합 swap

📊 기술 스택

React Native · Expo SDK 54 · TypeScript strict · Solana Mobile Wallet Adapter · Jupiter Swap v6 · TanStack Query

🌐 오픈소스

본 앱은 MIT 라이선스로 공개됩니다. 모든 보안·트랜잭션 로직을 직접 검증할 수 있습니다.
GitHub: https://github.com/dhryoo/solana-cbbtc

⚠️ 안내

Solana cbBTC는 사용자가 직접 트랜잭션을 승인하는 self-custody 도구입니다. 트랜잭션 비용은 Solana 네트워크 표준 수수료가 적용되며, Jupiter swap에는 라우트별 가격 영향이 발생합니다. 트랜잭션 실행 전 모달에서 정확한 수령량과 슬리피지를 확인해 주세요.

mainnet 실거래에 사용되는 앱입니다. 사용자 자신의 자금에 대한 모든 책임은 사용자에게 있으며, 본 앱 개발자는 잘못된 입력·시장 변동·네트워크 장애 등으로 인한 손실에 책임지지 않습니다.
```

> 약 2,100자 (한도 4,000 대비 절반). UTF-8 byte로 검증 시에도 안전.

---

## Category

```
DeFi
```

(또는 Finance — Publisher Portal의 옵션에 따라 선택. DeFi가 있으면 우선.)

---

## Keywords (포털 입력)

```
bitcoin, cbbtc, defi, swap, solana, wrapped-bitcoin, jupiter, btcfi, seeker, wallet
```

---

## Tagline (선택, 50자 이내)

```
Bitcoin on Solana — Seeker로 직접 swap.
```
