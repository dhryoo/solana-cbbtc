# Release notes — v0.3.0 (versionCode 17)

dApp Store 제출 시 "release notes / What's new" 필드에 복사.

v0.2.4(친절 안내·새로고침·업데이트 배너) 이후 첫 minor 버전 — **Phase 3: Lightning 결제(베타)**
가 핵심. 실험실(Labs) 토글 뒤에 있어 기본 꺼짐, 기존 기능에는 영향 없음.

## 한국어 (ko)

```
v0.3.0 — ⚡ Lightning 결제 (Phase 3 베타)

• 새 실험 기능 — 설정 → 실험실에서 켜면 Swap 탭에 ⚡ Lightning 결제 추가 (기본 꺼짐)
• Lightning Network 인보이스를 USDC·SOL 로 바로 결제 (lightning address 도 지원)
• Atomiq atomic swap(HTLC) — 감사받은 escrow, 서명은 전부 Solana 쪽에서만 (Seed Vault)
• 실패해도 안전 — LN 지급이 안 되면 자금 환불, LP 는 지급 증명 없이 자금을 가져갈 수 없음
• 앱 수수료 0 (LP 수수료 ~0.5% 만 견적에 표시) · 작동 방식 안내 화면 + 인포그래픽
• 거래 내역에 ⚡ Lightning 결제·환불 분류 추가
• 비수탁 유지 — 자금·키는 Seed Vault, 백엔드·트래커 없음
```

## English (en)

```
v0.3.0 — ⚡ Lightning payments (Phase 3 beta)

• New experimental feature — enable it in Settings → Labs to add ⚡ Lightning payments to the Swap tab (off by default)
• Pay Lightning Network invoices directly with USDC · SOL (lightning addresses supported too)
• Atomiq atomic swaps (HTLC) — audited escrow, every signature stays on the Solana side (Seed Vault)
• Safe on failure — funds are refunded if the LN payment doesn't complete; the LP can't claim without payment proof
• Zero app fee (only the ~0.5% LP fee, shown in the quote) · in-app guide with an infographic
• Transaction history now classifies ⚡ Lightning payments and refunds
• Self-custody as always — keys stay in Seed Vault, no backend or trackers
```
