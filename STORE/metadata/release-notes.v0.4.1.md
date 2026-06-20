# Release notes — v0.4.1 (versionCode 19)

dApp Store 제출 시 "release notes / What's new" 필드에 복사.

⚠️ 스토어 배포본이 **v0.3.0(versionCode 17)** 이라, 이번 업데이트는 사용자에게 **0.4.0 + 0.4.1 이
한 번에** 적용됩니다. 그래서 What's new 는 0.3.0 이후 전체(Phase 3 Lightning 확장 + 안정성 수정)를
담고, 심사 노트는 **새 권한 CAMERA(0.4.0 도입)** 를 반드시 선언합니다. Lightning 은 실험실(Labs)
토글 뒤(기본 OFF).

## 한국어 (ko)

```
v0.4.1 — ⚡ Lightning 받기·cbBTC 결제·QR 스캔 (Labs) + 안정성 개선

• ⚡ Lightning 받기 추가 — USDC·SOL 로 받기 인보이스 생성(QR·복사·공유), 결제되면 Solana 로 정산 (실험실)
• cbBTC 로도 LN 결제 — cbBTC를 USDC로 자동 교환 후 결제 (서명은 모두 Solana 쪽, 실험실)
• QR 스캔 — 인보이스를 붙여넣지 않고 카메라로 스캔해 자동 입력 (스캔 중에만 사용, 저장·전송 없음)
• 거래 내역에 ⚡ LN 받기 분류 추가
• ⚡ Lightning 송금 오류 수정 — 실제로는 결제가 성공했는데 "LP 타임아웃" 오류가 뜨던 문제 해결 (실험실)
• 서명 중 멈춤 탈출 — 결제·예치·스왑·받기 서명 도중 지갑이 멈추면 '취소'로 빠져나올 수 있게 (Seed Vault 거부 버튼 없음 대응)
• 받기 전 SOL 부족 시 생성 차단 — "결제됐는데 못 받는" 상황 예방 (실험실)
• 친절한 오류 안내 — 내부 메시지 대신 알기 쉬운 안내로
• 더 빠르고 안정적으로 — 거래 내역 재조회 최소화, RPC 혼잡(429/5xx) 시 자동 전환
• Lightning 은 여전히 실험 기능(설정 → 실험실, 기본 꺼짐) — 소액 사용 권장
• 비수탁 유지 — 자금·키는 Seed Vault, 백엔드·트래커 없음
```

## English (en)

```
v0.4.1 — ⚡ Lightning receive · pay with cbBTC · QR scan (Labs) + stability

• ⚡ Receive over Lightning — generate a receive invoice into USDC·SOL (QR, copy, share); funds settle to Solana once paid (Labs)
• Pay LN with cbBTC — auto-swaps cbBTC to USDC first, then pays (every signature stays on Solana, Labs)
• QR scanning — scan an invoice with the camera instead of pasting (used only while scanning; nothing stored or sent)
• Transaction history now classifies ⚡ LN receive
• ⚡ Lightning send fix — resolved an "LP timeout" error that appeared even when the payment actually succeeded (Labs)
• Escape a stuck signature — added "Cancel" to Swap / Earn / Lightning send & receive signing, so you're never trapped if the wallet hangs (Seed Vault has no reject button)
• Receive now blocks when SOL is too low — prevents the "paid but can't claim" case (Labs)
• Friendlier error messages — clear guidance instead of raw internal text
• Faster & steadier — fewer transaction-history re-fetches, automatic RPC failover under load (429/5xx)
• Lightning is still experimental (Settings → Labs, off by default) — small amounts recommended
• Self-custody as always — keys stay in Seed Vault, no backend or trackers
```

## dApp Store 심사 노트 (제출 시 reviewer notes / "Notes for review" 에 영문 입력)

```
REVIEWER NOTES — Solana cbBTC (com.seekerbtcfi.app), v0.4.1 (versionCode 19)

WHAT CHANGED SINCE THE LIVE BUILD (v0.3.0, versionCode 17)
- Exactly ONE new permission was added: android.permission.CAMERA (introduced in v0.4.0 via the expo-camera plugin).
- No other permission changed. No new network endpoints/hosts were added. No analytics, tracker, ad SDK, or backend server was added — the app remains fully non-custodial and on-device (self-custody, no-backend posture unchanged).

NEW PERMISSION: android.permission.CAMERA
- Purpose: scan a Lightning invoice / Lightning address QR code in the experimental "Labs" send flow (src/components/QRScanModal.tsx, using expo-camera CameraView with barcodeTypes restricted to "qr").
- The camera is active ONLY while the scan sheet is open (the CameraView is mounted solely when the modal is visible) and is torn down as soon as a code is read or the sheet is closed.
- No photos or video are captured, stored, cached, or transmitted. The decoded text is parsed locally and never leaves the device. User-facing permission rationale (app.json): "Used only to scan Lightning invoice QR codes. No photos or video are taken, stored, or sent anywhere."

MICROPHONE / RECORD_AUDIO — NOT REQUESTED
- expo-camera can transitively pull in android.permission.RECORD_AUDIO. It is suppressed two independent ways: (1) plugin config recordAudioAndroid:false, and (2) an explicit android.blockedPermissions entry for android.permission.RECORD_AUDIO in app.json.
- Verified on the shipped v0.4.1 APK: `aapt dump permissions` shows RECORD_AUDIO is ABSENT. The app does not access the microphone.

OTHER RUNTIME-SENSITIVE PERMISSIONS
- CAMERA is the only newly added runtime permission. The remaining runtime/guarded permissions are USE_BIOMETRIC / USE_FINGERPRINT (App Lock unlock via biometrics; native auth is invoked only after an explicit user action) and POST_NOTIFICATIONS (local-only transaction/status notifications via expo-notifications).
- Verified by manifest scan: the app requests NO location, contacts, SMS, phone/call-log, external storage, media, accounts, calendar, Bluetooth, or nearby-devices permissions.

FULL PERMISSION LIST IN THE SHIPPED APK (for raw-manifest cross-check)
App-declared / functional:
- android.permission.INTERNET, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE — Solana RPC, Jupiter, and experimental Lightning LP calls + connectivity gating.
- android.permission.CAMERA — QR scan (see above; NEW in v0.4.0).
- android.permission.USE_BIOMETRIC, USE_FINGERPRINT — App Lock biometric unlock.
- android.permission.VIBRATE, WAKE_LOCK, RECEIVE_BOOT_COMPLETED, POST_NOTIFICATIONS, com.google.android.c2dm.permission.RECEIVE — local notification delivery/scheduling (expo-notifications).
Standard transitive permissions (unchanged since v0.3.0; injected by expo-notifications/ShortcutBadger and Google Play Services — listed here for completeness so they are not read as undisclosed):
- com.seekerbtcfi.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION (app-private receiver guard), android.permission.READ_APP_BADGE, com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE, and OEM launcher badge-count permissions (Samsung com.sec.android.provider.badge READ/WRITE, HTC, Sony/SonyEricsson, Huawei READ/WRITE/CHANGE_BADGE, Oppo, anddoes, majeur, me.everything.badger). These support notification badge counts only and request no user data.

NEW NATIVE MODULES SINCE v0.3.0
- expo-camera (~17.0.10) — QR scanning (only module that affects the permission manifest; adds CAMERA, with RECORD_AUDIO blocked as above).
- react-native-qrcode-svg (^6.3.21) — renders a receive Lightning invoice as an on-screen QR (src/components/LightningReceivePanel.tsx); local rendering only, no permissions.
- react-native-svg (15.12.1) — native SVG renderer required by react-native-qrcode-svg.
- bs58 (^6.0.0) — pure-JS base58 encode/decode for Lightning/Solana payloads; no native code, no permissions.
(Note: react-native-markdown-display appears in the package.json diff only due to line reordering — it already shipped in v0.3.0 and is not new.)

NETWORK
- No new hosts vs v0.3.0. The new QR scan + on-screen receive-QR features are entirely on-device and contact zero network endpoints. All previously declared hosts (Solana RPC + failover, Jupiter, Atomiq Lightning LP nodes, the raw.githubusercontent.com LP registry, and the api.github.com release update-check) are unchanged.

CUSTODY & EXPERIMENTAL STATUS
- Non-custodial: all signing happens in the user's wallet via the Mobile Wallet Adapter / Seed Vault. The app never holds, generates, or transmits private keys or seed phrases, and operates with no backend and no analytics.
- The Lightning ("Labs") features that use the camera are clearly marked experimental in-app.
```
