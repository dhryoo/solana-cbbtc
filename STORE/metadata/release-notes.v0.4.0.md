# Release notes — v0.4.0 (versionCode 18)

dApp Store 제출 시 "release notes / What's new" 필드에 복사.

v0.3.0(Lightning 결제 베타) 이후 Phase 3 가 실질 확장 — **받기 + cbBTC 발신 + QR 스캔**.
모두 실험실(Labs) 토글 뒤(기본 OFF), 소액 권장 유지.

## 한국어 (ko)

```
v0.4.0 — ⚡ Lightning 받기 · cbBTC 결제 · QR 스캔 (Labs)

• Lightning 받기 추가 — USDC·SOL 로 받기 인보이스 생성(QR·복사·공유), 결제되면 Solana 로 정산
• cbBTC 로도 LN 결제 — cbBTC를 USDC로 자동 교환 후 결제 (서명은 모두 Solana 쪽)
• QR 스캔 — 인보이스를 붙여넣지 않고 카메라로 스캔해 자동 입력 (스캔 중에만 사용, 저장·전송 없음)
• 받기 전 SOL 부족 사전 안내 + 결제 안내 다듬기
• 거래 내역에 ⚡ LN 받기 분류 추가
• 여전히 실험 기능(설정 → 실험실, 기본 꺼짐) — 소액 사용 권장
• 비수탁 유지 — 자금·키는 Seed Vault, 백엔드·트래커 없음
```

## English (en)

```
v0.4.0 — ⚡ Lightning receive · pay with cbBTC · QR scan (Labs)

• Receive over Lightning — generate a receive invoice into USDC·SOL (QR, copy, share); funds settle to Solana once paid
• Pay LN with cbBTC — auto-swaps cbBTC to USDC first, then pays (every signature stays on Solana)
• QR scanning — scan an invoice with the camera instead of pasting (used only while scanning; nothing stored or sent)
• Pre-flight low-SOL warning for receiving + payment-message polish
• Transaction history now classifies ⚡ LN receive
• Still experimental (Settings → Labs, off by default) — small amounts recommended
• Self-custody as always — keys stay in Seed Vault, no backend or trackers
```

## dApp Store 심사 노트 (제출 시 reviewer notes / "Notes for review" 에 영문 입력)

```
Reviewer notes:
- The Lightning feature is experimental and OFF by default. To test it, go to
  Settings → Labs and enable "Lightning payment (experimental)", then a ⚡ chip
  appears at the top of the Swap tab.
- NEW PERMISSION (camera): used ONLY to scan Lightning invoice QR codes from the
  Lightning screen (Send → Scan). No photos or video are captured, stored, or
  transmitted. The camera is active only while the scan sheet is open.
- Fully non-custodial: the app never holds funds or keys; all signing happens in
  the Seed Vault. No backend servers, no analytics, no trackers.
```
