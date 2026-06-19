# Release notes — v0.4.1 (versionCode 19)

dApp Store 제출 시 "release notes / What's new" 필드에 복사.

v0.4.0(Lightning 받기·cbBTC 결제·QR) 이후 **안정성·완성도 패치** — 새 기능 없이 기존 흐름의
견고함·오류 처리·속도를 다듬음. Swap·Earn 등 일반 기능에도 적용. Lightning 은 여전히
실험실(Labs) 토글 뒤(기본 OFF).

## 한국어 (ko)

```
v0.4.1 — 안정성·완성도 개선

• ⚡ Lightning 송금 오류 수정 — 실제로는 결제가 성공했는데 "LP 타임아웃" 오류가 뜨던 문제 해결 (실험실)
• 서명 중 멈춤 탈출 — 결제·예치·스왑·받기 서명 도중 지갑이 멈추면 '취소'로 빠져나올 수 있게 (Seed Vault 거부 버튼 없음 대응)
• 받기 전 SOL 부족 시 생성 차단 — "결제됐는데 못 받는" 상황 예방 (실험실)
• 친절한 오류 안내 — 내부 메시지 대신 알기 쉬운 안내로
• 더 빠르고 안정적으로 — 거래 내역 재조회 최소화, RPC 혼잡(429/5xx) 시 자동 전환
• 비수탁 유지 — 자금·키는 Seed Vault, 백엔드·트래커 없음
```

## English (en)

```
v0.4.1 — stability & polish

• ⚡ Lightning send fix — resolved an "LP timeout" error that appeared even when the payment actually succeeded (Labs)
• Escape a stuck signature — added "Cancel" to Swap / Earn / Lightning send & receive signing, so you're never trapped if the wallet hangs (Seed Vault has no reject button)
• Receive now blocks when SOL is too low — prevents the "paid but can't claim" case (Labs)
• Friendlier error messages — clear guidance instead of raw internal text
• Faster & steadier — fewer transaction-history re-fetches, automatic RPC failover under load (429/5xx)
• Self-custody as always — keys stay in Seed Vault, no backend or trackers
```

## dApp Store 심사 노트 (제출 시 reviewer notes / "Notes for review" 에 영문 입력)

```
Reviewer notes (v0.4.1 — patch over v0.4.0):
- No new permissions. This is a stability / bug-fix release; nothing was added to
  the manifest.
- The Lightning feature remains experimental and OFF by default (Settings → Labs).
  This version's Lightning-specific fix removes a false "LP timeout" error that
  could appear on send even when the swap actually settled on-chain; the rest of
  the changes harden general signing, error handling, and RPC reliability across
  the (non-experimental) Swap and Earn flows.
- Fully non-custodial: the app never holds funds or keys; all signing happens in
  the Seed Vault. No backend servers, no analytics, no trackers.
```
