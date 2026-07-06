# Release notes — v0.5.1 (versionCode 24)

dApp Store 제출 시 "release notes / What's new" 필드에 로케일별로 복사.

스토어 배포본이 **v0.4.4(versionCode 22)** 이므로 이번 업데이트는 **0.4.4 → 0.5.1** 입니다.
minor 범프 사유: **베트남어(vi) 추가**(신기능) + **자금 경로(swap·lending·LN 확정) 정확성/안정성 대개편**(적대적 코드 리뷰 30건 대응, `design/review-2026-07.md`).
새 권한·새 네이티브 모듈·새 네트워크 호스트 **없음**. Android 자동 백업은 **비활성화**(allowBackup=false, 프라이버시 강화).
(v0.5.0/vc23 은 포털 publish 단계에서 **publisher 지갑 SOL 부족**(Release NFT 민팅 rent)으로 실패 → 동일 코드를 vc24/0.5.1 로 재시도. 코드·기능 차이 없음. **재제출 전 publisher 지갑 SOL 충전 필수**.)

## 한국어 (ko)

```
v0.5.1 — 베트남어 추가 + 안정성·정확도 대개편

• 🇻🇳 Tiếng Việt — 베트남어를 추가했어요 (설정 → 언어)
• 정확한 성공/실패 — swap·렌딩이 온체인 확정을 기다린 뒤에 '완료'를 표시합니다. 전송 후 실패한 거래를 성공으로 잘못 알리지 않아요
• 더 정확한 렌딩 — 청산가와 예치 cbBTC를 온체인 수량으로 직접 계산(시세 변동 무관), 시세 로딩 중에도 출금이 막히지 않습니다
• 더 강한 앱 잠금 — 잠금 화면이 거래 내역·확인창을 포함한 모든 화면을 덮습니다
• 더 친절한 Lightning — 결제 실패·확정 지연 시 안내 개선, 짧은 네트워크 끊김에도 인보이스 유지
• 안정성 — 네트워크 요청 타임아웃(무한 대기 제거), sats 천단위 표기, 다수의 소소한 수정

언제나 비수탁 — 키는 Seed Vault, 백엔드·트래커 없음, 앱 수수료 없음.
```

## English (en)

```
v0.5.1 — Vietnamese language + a big stability & accuracy pass

• 🇻🇳 Tiếng Việt — the app is now available in Vietnamese (Settings → Language)
• Accurate success/failure — swaps and lending now wait for on-chain confirmation before showing "done," so a transaction that fails after broadcast is no longer reported as success
• More accurate lending — liquidation price and your supplied cbBTC are computed directly from on-chain amounts (price-independent); withdraw is no longer blocked while market data loads
• Stronger app lock — the lock screen now covers every screen, including transaction history and confirmations
• Clearer Lightning — better guidance when a payment fails or is slow to confirm, and the invoice survives brief network blips
• Reliability — network requests now time out instead of hanging, sats amounts show thousands separators, plus many smaller fixes

Self-custody as always — keys stay in Seed Vault, no backend or trackers, no app fee.
```

## Tiếng Việt (vi)

```
v0.5.1 — Thêm tiếng Việt + nâng cấp lớn về độ ổn định & chính xác

• 🇻🇳 Tiếng Việt — ứng dụng nay đã có tiếng Việt (Cài đặt → Ngôn ngữ)
• Thành công/thất bại chính xác — swap và cho vay nay chờ xác nhận on-chain trước khi hiển thị "Xong", nên giao dịch thất bại sau khi gửi sẽ không còn bị báo là thành công
• Cho vay chính xác hơn — giá thanh lý và lượng cbBTC đã cung cấp được tính trực tiếp từ số lượng on-chain (không phụ thuộc giá); việc Rút không còn bị chặn khi dữ liệu thị trường đang tải
• Khóa ứng dụng mạnh hơn — màn hình khóa nay che phủ mọi màn hình, kể cả lịch sử giao dịch và các cửa sổ xác nhận
• Lightning rõ ràng hơn — hướng dẫn tốt hơn khi thanh toán thất bại hoặc xác nhận chậm, và hóa đơn vẫn được giữ khi mạng chập chờn trong giây lát
• Độ ổn định — các yêu cầu mạng nay có thời gian chờ (không treo vô hạn), số sats hiển thị có dấu phân cách, cùng nhiều sửa lỗi nhỏ

Luôn tự quản lý (self-custody) — khóa nằm trong Seed Vault, không backend hay trình theo dõi, không phí ứng dụng.
```

## dApp Store 심사 노트 (제출 시 reviewer notes / "Notes for review" 에 영문 입력)

```
REVIEWER NOTES — Solana cbBTC (com.seekerbtcfi.app), v0.5.1 (versionCode 24)

WHAT CHANGED SINCE THE LIVE BUILD (v0.4.4, versionCode 22)
- NO new permissions. No permission was added, removed, or modified. Android auto-backup is now DISABLED (android:allowBackup="false") so app data (MWA auth token, in-flight Lightning swap state) is never uploaded to the user's cloud backup — a privacy hardening, not a new capability.
- NO new native modules, no new third-party SDKs.
- NO new network endpoints/hosts. The previously declared hosts are unchanged (Solana RPC + failover, Jupiter lite-api.jup.ag, Atomiq Lightning LP nodes, raw.githubusercontent.com LP registry, api.github.com for the release update-check).
- No analytics, tracker, ad SDK, or backend server. The app remains fully non-custodial and on-device.

NEW LANGUAGE
- Vietnamese (vi) added as a third UI language alongside English and Korean. Localization strings only — selectable under Settings -> Language, or auto-detected from the device locale.

STABILITY & CORRECTNESS (internal robustness; no user-facing capability change)
- Transactions (swap, supply/withdraw/borrow/repay) now poll on-chain confirmation before reporting success, so a transaction that fails after broadcast (e.g. slippage, expired blockhash) is no longer shown as successful.
- Lending display accuracy: liquidation price and supplied cbBTC are derived from on-chain amounts (independent of the live price feed); withdraw is no longer blocked when the market query is temporarily unavailable.
- App lock now renders as a native Modal so it reliably covers content screens (history, confirmations) instead of drawing beneath them.
- External network requests now have timeouts (could previously hang indefinitely on Android), and the Lightning receive flow survives transient network errors.

CUSTODY & EXPERIMENTAL STATUS (unchanged)
- Non-custodial: all signing happens in the user's wallet via the Mobile Wallet Adapter / Seed Vault. The app never holds, generates, or transmits private keys or seed phrases; no backend, no analytics.
- The Bitcoin Lightning feature remains experimental, small-amounts-only (hard-capped at 100,000 sats per payment), and non-custodial — a third-party LP, not the app, performs the Bitcoin Lightning payment.
```
