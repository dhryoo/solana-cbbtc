# Solana Mobile dApp Store Submission Checklist

본 문서는 Publisher Portal (`publish.solanamobile.com`)에 **Solana cbBTC**를 제출하는 단계별 가이드입니다.

---

## 사전 점검

- [ ] `keystores/seeker-btcfi-release.keystore` 파일 1Password + 외장 백업 ✓ 확인
- [ ] `~/.gradle/gradle.properties`에 `SEEKER_BTCFI_RELEASE_*` 4개 키 설정 ✓ 확인
- [ ] release APK가 `./run.sh`로 정상 빌드 + 실기에서 모든 기능 동작 ✓ 확인
- [ ] `STORE/metadata/description.{ko,en}.md` 검토 — 글자 수 한도 내, 오타·과장 점검
- [ ] `STORE/legal/privacy-policy.md`를 공개 URL로 호스팅 (GitHub Pages / Notion / Vercel 등)
- [ ] LICENSE 파일을 공개 URL로 호스팅 (보통 GitHub repo README가 가리킴)

---

## Phase 1 — Publisher 지갑 준비

dApp Store의 모든 NFT 민팅은 **publisher 지갑**으로 서명합니다. **Seeker 폰의 일상 지갑과 분리**가 강력 권장됨 — 키 분실 시 dApp 자산까지 잃지 않도록.

- [ ] 별도 데스크탑 환경에서 새 지갑 생성 (Phantom / Solflare 데스크탑 확장)
- [ ] 가능하면 **Ledger 등 하드웨어 지갑 연결** (강력 권장)
- [ ] 지갑에 **0.2 SOL 이상** 충전 (NFT 민팅 + Arweave 업로드 수수료)
- [ ] 지갑 주소 메모 — 모든 Publisher/App/Release NFT의 소유자가 됨

---

## Phase 2 — Visual 자산 준비

`STORE/assets/` 폴더에 다음 파일을 배치:

- [ ] `icon-512.png` — 512×512 PNG (이미 생성됨, `assets/icon.png`에서 리사이즈)
- [ ] `banner-1200x600.png` — 1200×600 PNG (디자인 prompt: `design/banner-prompt.md`)
- [ ] (선택) `feature-graphic-1200x1200.png` — 1200×1200 PNG
- [ ] **스크린샷 ≥ 4장**, 각 1920×1080 PNG, 한국어 UI 권장:
    - 자산 탭 (지갑 연결됨, cbBTC + SOL 잔액 표시)
    - Swap 탭 (0.005 SOL 입력, cbBTC 견적 표시)
    - Swap 성공 모달 (signature + Solscan 링크)
    - 설정 탭 (언어 / 테마 / 알림 설정)
    - (선택) 다크모드 화면 1~2장

스크린샷 캡쳐 방법: `STORE/screenshot-guide.md` 참조.

---

## Phase 3 — Publisher Portal 가입 / 로그인

- [x] Publisher Portal 가입 완료 (plan.md M7 사전 준비)
- [x] KYC 완료
- [ ] Publisher 지갑으로 portal 로그인

---

## Phase 4 — Publisher NFT 민팅 (첫 제출만)

신규 publisher라면 한 번만:

- [ ] Portal → "Create Publisher" → publisher 이름 입력 (예: "Solana cbBTC Maintainers")
- [ ] 메타데이터: website, email, social
- [ ] 서명 → Publisher NFT가 본인 지갑으로 민팅됨

---

## Phase 5 — App NFT 민팅 (앱마다 한 번)

- [ ] Portal → "Add a dApp → New dApp"
- [ ] App identifier: `com.seekerbtcfi.app` (Android package, 변경 불가)
- [ ] App name: `Solana cbBTC`
- [ ] URLs:
    - `website`: (확정 필요 — GitHub repo 또는 별도 도메인)
    - `privacy_policy_url`: (Phase 0 호스팅 URL)
    - `license_url`: (LICENSE 호스팅 URL, 보통 GitHub repo)
- [ ] 서명 → App NFT 민팅됨

---

## Phase 6 — Release NFT (이번 버전) 준비

이번 v0.1.0 release를 위한 메타데이터 입력:

### 6.1 Top Up Balance (Arweave 비용)
- [ ] Portal에서 SOL → ArDrive 크레딧 변환. 약 0.05~0.1 SOL 충전 권장.

### 6.2 Release 정보 입력
- [ ] `versionCode`: `1`
- [ ] `versionName`: `0.1.0`
- [ ] APK 업로드: `android/app/build/outputs/apk/release/app-release.apk`
    - 사전 검증: `keytool -printcert -jarfile app-release.apk`로 release keystore 서명 확인
- [ ] APK SHA-256 fingerprint 기록 (변조 검증용)

### 6.3 메타데이터 입력 (locale별)
**한국어 (ko-KR)** — `STORE/metadata/description.ko.md` 복사:
- [ ] App name: `Solana cbBTC`
- [ ] Short description (≤80자)
- [ ] Long description (≤4000자)
- [ ] Tagline (선택)
- [ ] Keywords: `bitcoin, cbbtc, defi, swap, solana, wrapped-bitcoin, jupiter, btcfi, seeker, wallet`

**English (en-US)** — `STORE/metadata/description.en.md` 복사:
- [ ] App name: `Solana cbBTC`
- [ ] Short description (≤80 chars)
- [ ] Long description (≤4000 chars)
- [ ] Tagline (optional)
- [ ] Keywords (동일)

### 6.4 시각 자산 업로드
- [ ] Icon 512×512 (`STORE/assets/icon-512.png`)
- [ ] Banner 1200×600 (`STORE/assets/banner-1200x600.png`)
- [ ] Feature graphic 1200×1200 (선택)
- [ ] 스크린샷 4장 이상

### 6.5 카테고리 & 권한
- [ ] Category: `DeFi`
- [ ] Permission rationale (Android 권한 사용 사유):
    - `INTERNET`: Solana RPC + Jupiter API 호출
    - `POST_NOTIFICATIONS` (Android 13+): swap 완료 알림 (선택적, 사용자 설정 따라)

### 6.6 서명 + 민팅
- [ ] 모든 메타데이터 검토 후 "Submit for Mint"
- [ ] Publisher 지갑으로 Release NFT 서명 → 민팅
- [ ] **민팅 비용**: ~0.01 SOL (앱마다)
- [ ] **Arweave 업로드**: APK + 자산 → 비용은 충전된 크레딧에서 차감

---

## Phase 7 — 리뷰 제출

- [ ] Release NFT 민팅 완료 후 "Submit for Review" 버튼
- [ ] **리뷰 대기**: 영업일 기준 2~5일
- [ ] 리뷰 결과 통보는 publisher 이메일로 도착

### 가능한 결과

**Approved**:
- dApp Store에 노출됨
- "View on dApp Store" 링크 확보
- Seeker 사용자가 검색·설치 가능

**Rejected**:
- 피드백 메일에 명시된 사항을 `plan.md`에 기록
- 수정 후 새 release (versionCode +1) 재제출

**Common rejection 이유 (선험적)**:
- 디버그 키 서명 → 이미 release keystore로 처리됨 ✓
- privacy_policy_url 접근 불가 → URL 검증 필수
- 메타데이터 부정확 (스크린샷이 실제 앱과 다름 등)
- 권한 사용 사유 불명확

---

## Phase 8 — 승인 후 활동

- [ ] dApp Store 노출 확인 (Seeker 폰의 dApp Store 앱)
- [ ] 사용자 피드백 모니터링 (publisher 이메일 / GitHub issues)
- [ ] **다음 release 계획** (`versionCode` 단조 증가):
    - 0.1.1: 버그 수정 / 메타데이터 보정
    - 0.2.0: Phase 2 기능 (lending 등)
- [ ] SKR 개발자 보상 자격 신청 (가능해질 때)

---

## 자주 묻는 문제

**Q: Publisher 지갑을 Seeker 폰 일상 지갑과 같이 써도 되나?**
A: 기술적으로 가능하지만 **강력 비권장**. 일상 지갑 분실 시 publisher 권한까지 잃습니다. 별도 데스크탑 + Ledger 권장.

**Q: 한 번 정한 `android.package`를 바꿀 수 있나?**
A: 불가능. Publisher Portal에서도 app NFT의 핵심 식별자라 변경 X. `com.seekerbtcfi.app`로 영구 고정됨.

**Q: 0.05 SOL Arweave 비용으로 부족하면?**
A: portal에서 추가 충전 가능. 모자라면 업로드가 멈춤 — 진행 중 확인 필수.

**Q: Release 후에 description / 스크린샷만 바꾸고 싶다면?**
A: 새 release NFT 민팅이 필요함 (versionCode +1). APK는 동일해도 메타데이터 변경이라 새 release.

**Q: 리뷰 거부 후 같은 versionCode로 재제출 가능?**
A: 같은 versionCode는 한 번만. 거부되면 versionCode를 올려야 함.
