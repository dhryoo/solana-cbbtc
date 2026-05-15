# Screenshot Capture Guide — Solana cbBTC

dApp Store 제출에는 **최소 4장의 스크린샷**이 필요합니다. 본 가이드는 Phase 1 폴리시 작업 후 현재 UI 기준으로 어떤 화면을 어떻게 캡쳐할지, 그리고 1920×1080 landscape 형식에 맞게 가공하는 방법을 정리합니다.

---

## 사양 요약

| 항목      | 권장 / 요구                                                  |
| --------- | ------------------------------------------------------------ |
| 크기      | **1920×1080** (Full HD, 16:9) 또는 native portrait 1080×2412 |
| 최소 개수 | 4장                                                          |
| 형식      | PNG (sRGB)                                                   |
| Locale    | 한국어 UI 권장 (메인 마켓 기준) + 영어 별도 권장             |
| 파일 크기 | 권장 1MB 이하 (PNG optimize 후)                              |

Seeker 폰의 native 해상도는 portrait **1080×2412**. dApp Store 권장은 landscape **1920×1080** 이라 변환 필요. 자동화: `scripts/frame_screenshots.py`.

---

## 사전 준비 — 테스트 데이터 (중요)

스크린샷 품질의 80%는 화면에 표시되는 **잔액 / 견적 / 상태** 가 자연스러운지에 달려 있습니다. 깔끔한 화면을 위해:

### A. 별도 테스트 지갑 만들기 (필수)

**왜 별도?** 실 사용 지갑의 주소가 영원히 dApp Store에 박히는 걸 막기 위해서. 그리고 잔액·트랜잭션 내역을 의도대로 통제하기 위해서.

1. Phantom / Solflare 새 지갑 1개 생성 (시드 백업)
2. Seeker에 import (또는 Seed Vault 사용 시 별도 지갑 슬롯)
3. 메인넷에서 **0.05 SOL 이상** 충전 (가스 + ATA 생성 + 스크린샷용 swap 1회)

### B. cbBTC 소량 확보 (Optional but recommended)

자산 화면의 빈 잔액보다 실제 cbBTC가 표시되는 게 훨씬 낫습니다.

- 본 앱의 swap 기능으로 0.01 SOL → cbBTC swap → 미세 cbBTC 잔액 생성
- 또는 다른 swap 도구에서 cbBTC 0.0001 정도 송금
- 표시될 값 예시: `0.00001234 cbBTC`

### C. (선택) Seeker Genesis Token 보유 확인

만약 Seeker 사용자라면 자동으로 "Seeker Verified" 배지가 표시됩니다. 이게 보이는 화면이 마케팅 가치가 큽니다.

### D. 다크모드 / 라이트모드 둘 다 캡쳐 권장

다크모드 캡쳐 1~2장 추가는 사실상 효과적인 마케팅.

---

## 권장 스크린샷 세트

### Quick 4장 (최소 제출용)

심사 통과를 위한 최소 set. 약 15분 소요.

1. 자산 화면 (한국어, 라이트, 지갑 연결)
2. Swap 견적 화면 (0.005 SOL → cbBTC)
3. Swap 성공 모달 (서명 + Solscan + 공유 버튼)
4. 설정 화면 (언어 / 테마 / 앱 잠금 / 알림 / 정보)

### Recommended 6~8장 (마케팅 + locale)

투자 대비 효과 좋음. 약 25분.

1~4: Quick set 동일 5. 자산 화면 다크모드 (한국어) 6. Swap 견적 화면 (영어 UI) 7. About 모달 (한국어, MIT 라이선스 영역까지) 8. Swap 확인 모달 (idle 단계, 슬리피지/라우트 표시)

---

## 각 시나리오 상세

### #1 자산 화면 — 지갑 연결, 잔액 표시 ⭐

**왜 첫번째**: 앱이 "뭘 하는지" 1초 안에 보임

**사전 준비**:

- 한국어 UI, 라이트 모드, 인터넷 연결 ✓
- 지갑 연결 완료 (Seeker라면 Seed Vault 사용)
- cbBTC + SOL + SKR 중 최소 SOL은 잔액 0 이상

**캡쳐에 들어와야 하는 요소**:

- 상단: "Solana cbBTC" 제목 + `Mainnet` 네트워크 배지
- (Seeker 디바이스 + GT 보유 시) "✓ Seeker Verified" 배지
- cbBTC BalanceCard (실제 잔액 또는 0.00000000 cbBTC)
- SOL BalanceCard
- SKR BalanceCard
- WalletCard:
    - "연결된 지갑" 라벨
    - 지갑 주소 (full base58)
    - (Seed Vault 사용 시) "🔒 하드웨어로 보안됨"
    - "Solscan에서 보기" 버튼
- 하단: "연결 해제" + "아래로 당겨 새로고침" 힌트

**파일명**: `screenshot-1-home-ko.png`

---

### #2 Swap 견적 화면

**왜 두번째**: 핵심 기능 시각화

**사전 준비**:

- Swap 탭으로 이동
- 입력 카드에 `0.005` 입력 (SOL → cbBTC 방향)
- 견적 도착 대기 (1~2초)
- 슬리피지 0.5% (기본값) 선택된 상태

**캡쳐 요소**:

- 입력 카드: SOL, "0.005"
- ↕ 방향 전환 버튼
- 출력 카드: cbBTC
- QuoteDisplay:
    - **예상 수령량** (예: 0.00006789 cbBTC)
    - 🟢 "방금 견적" 인디케이터 (fresh)
    - **가격 영향** (예: 0.012%)
    - **라우트** (예: "2 hops · Whirlpool → Orca")
    - **최소 수령량**
- 슬리피지 chip: 0.1% / 0.5% (활성) / 1%
- "Swap 실행" 버튼 (보라 활성 상태)

**파일명**: `screenshot-2-swap-quote-ko.png`

---

### #3 Swap 성공 모달

**왜**: 완성된 UX + 공유 기능 강조

**사전 준비**:

- 실제로 작은 swap 한 번 실행 (0.005 SOL → cbBTC 정도)
- 성공 모달이 뜬 상태에서 즉시 캡쳐

**캡쳐 요소**:

- "Swap 성공" 제목
- "트랜잭션이 네트워크에 전송됐습니다." 메시지
- Signature (Courier 폰트, full base58, copyable)
- 1행: `[Solscan 열기]` + `[공유]` (둘 다 secondary)
- 2행: `[확인]` (primary)

**팁**: 모달이 너무 빨리 사라지면 Solscan/공유 버튼 누르지 말고 캡쳐만 빨리.

**파일명**: `screenshot-3-swap-success-ko.png`

---

### #4 설정 화면

**왜**: 다국어 + 다크모드 + 보안 + 알림 폭넓게 노출

**사전 준비**:

- 설정 탭으로 이동
- 가능하면 앱 잠금 토글 ON 상태 (생체 인증 등록되어 있어야 함)

**캡쳐 요소** (스크롤 거의 없이 한 화면에 다 들어옴):

- **언어** 섹션: [한국어 활성] / English
- **테마** 섹션: 시스템 / 라이트 / 다크
- **앱 잠금** 섹션:
    - "지문/PIN으로 잠금" 토글
    - 설명 텍스트
- **알림** 섹션:
    - "Swap 완료 알림" 토글
- **정보** 섹션:
    - About 행 (chevron)
    - 문의/제보 행 (mail 아이콘)
    - 버전 / 네트워크 / Seeker 인증 등 KV 행

**파일명**: `screenshot-4-settings-ko.png`

**팁**: 핸드폰의 시계/배터리 status bar는 자르지 말고 그대로 — 자연스러움 +.

---

### #5 (선택) 자산 화면 다크모드 ⭐

**왜**: 다크모드 지원 시각적 증명. 마케팅 효과 가장 큼.

**사전 준비**:

1. 설정 → 테마 → **Dark** 선택
2. 자산 탭으로 돌아옴

**캡쳐 요소**: #1과 동일하지만 다크 테마

**파일명**: `screenshot-5-home-dark-ko.png`

---

### #6 (선택) 영어 UI — 자산 또는 Swap 견적

**왜**: 영어 locale 메타데이터에 별도 업로드용

**사전 준비**:

1. 설정 → 언어 → English
2. 자산 또는 Swap 탭

**파일명**: `screenshot-1-home-en.png` 또는 `screenshot-2-swap-quote-en.png`

---

### #7 (선택) About 모달

**왜**: 앱 설명/MIT 라이선스 명시. 신뢰감 +.

**사전 준비**:

- 설정 → 정보 → **앱 소개** 탭

**캡쳐 요소**:

- 상단 "About" + X 닫기
- 마크다운 렌더링된 본문 (Solana cbBTC 소개, Features 등)
- 스크롤 위치는 본문 상단 권장

**파일명**: `screenshot-7-about-ko.png`

---

### #8 (선택) Swap 확인 모달 (idle 단계)

**왜**: 트랜잭션 전 명확한 confirmation UX 강조

**사전 준비**:

- Swap 탭 → 0.005 입력 → 견적 도착
- "Swap 실행" 탭 → 확인 모달 뜬 상태에서 캡쳐 (서명 직전)

**캡쳐 요소**:

- "Swap 확인" 제목
- 입력 / 예상 수령량 / 최소 수령량 / 슬리피지 / 라우트 (각 행)
- "지갑에서 한 번 더 승인이 필요합니다. mainnet 실거래입니다." warning
- 취소 + Swap 실행 버튼

**파일명**: `screenshot-8-swap-confirm-ko.png`

---

## ⚠️ 피해야 할 화면

- **오프라인 배너가 보이는 상태** — 캡쳐 전 Wi-Fi/셀룰러 ON 확인
- **에러 메시지가 뜬 상태** — Jupiter rate limit 등이 떠 있으면 잠시 후 재시도
- **로딩 스피너만 보이는 상태** — 데이터 도착 후 캡쳐
- **빈 잔액 (0 SOL, 0 cbBTC)** — 사전 준비 §B 참조

---

## 캡쳐 방법

### Method 1: Seeker 자체 스크린샷 (가장 단순)

1. 원하는 화면 표시
2. **전원 + 볼륨 다운 동시 짧게 누름** (길게 누르면 전원 메뉴)
3. 갤러리에서 PC로 이동 (USB 또는 Google Drive)

→ portrait 1080×2412 PNG

### Method 2: `adb screencap` (스크립트화 가능)

```bash
adb devices  # 디바이스 시리얼 확인

# 즉시 한 장:
adb shell screencap -p /sdcard/cap.png && adb pull /sdcard/cap.png ./STORE/assets/raw-1.png

# 또는 인터랙티브 — Enter 누르면 다음 캡쳐
while true; do
    read -p "다음 화면 띄우고 Enter (Ctrl-C로 종료): " line
    fname="STORE/assets/raw-$(date +%H%M%S).png"
    adb shell screencap -p /sdcard/cap.png && adb pull /sdcard/cap.png "$fname"
    echo "  → $fname"
done
```

### Method 3: Android Studio Device Explorer

Android Studio 떠 있을 때: 우측 Device 패널 → 카메라 아이콘 → 즉시 PNG 다운로드.

---

## Portrait → 1920×1080 변환

`scripts/frame_screenshots.py` 로 자동 처리. 보라색 배경에 portrait 캡쳐를 중앙 배치:

```bash
# 단일 파일:
python3 scripts/frame_screenshots.py STORE/assets/raw-1.png STORE/assets/screenshot-1-home-ko.png

# 일괄 (raw-*.png 모두):
python3 scripts/frame_screenshots.py --batch STORE/assets/raw-*.png
```

스크립트 인자:

- `--bg "#9945FF"` (기본): Solana 보라
- `--portrait-height 1000` (기본): 캔버스 안에서 portrait이 차지할 높이 (1080 - 상하 padding)

---

## PNG 최적화

용량 줄이기 (Publisher Portal 업로드 빠르고 Arweave 비용 절감):

```bash
# oxipng — PNG 무손실 압축
brew install oxipng
oxipng -o 4 STORE/assets/screenshot-*.png

# 또는 ImageOptim 앱 사용 (drag-and-drop GUI)
```

보통 30~50% 감소. 시각적 변화 없음.

---

## 검수 체크리스트 (제출 전)

- [ ] 4장 이상의 PNG, 모두 1920×1080 (또는 portrait 1080×2412 일관)
- [ ] 한국어 + 영어 set 각각 또는 한국어 단일 set
- [ ] **민감 정보 점검**:
    - [ ] 별도 테스트 지갑 주소 (실 사용 지갑 노출 X)
    - [ ] 트랜잭션 signature는 공개되어도 무방 (이미 on-chain)
    - [ ] 잔액이 너무 크지 않음 (의도적으로 micro-balance)
- [ ] 디자인 / UI가 최신 release APK와 정확히 일치
- [ ] 오프라인 배너 / 에러 메시지 없음
- [ ] PNG 압축 완료, 각 파일 1MB 이하 권장

---

## 트러블슈팅

**Q: 캡쳐된 색이 실제와 미세하게 달라요.**
A: Seeker는 P3 색공간. dApp Store는 sRGB 권장. `convert` 또는 Preview "Export → sRGB"로 변환 가능. 대부분 무시 가능한 차이.

**Q: 한 번 업로드한 스크린샷을 바꾸려면?**
A: 새 release NFT (versionCode +1)에서만 가능. 그래서 첫 제출이 중요.

**Q: status bar (시계/배터리)가 보이는데 자르나요?**
A: 그대로 둬도 무방. 자연스러운 모바일 경험을 보여주는 게 더 효과적.

**Q: Seed Vault 사용 시 "Hardware secured" 인디케이터가 안 보여요.**
A: `useSeekerIdentity` hook이 walletUriBase가 비어있을 때 + Seeker 디바이스일 때 true 반환. Phantom/Solflare 등 외부 지갑으로 연결하면 false. 정확히 Seeker Seed Vault 연결 상태에서 캡쳐 필요.

**Q: "Seeker Verified" 배지가 안 보여요.**
A: 해당 wallet이 Genesis Token (Token-2022, mint authority `GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4`) 보유 중일 때만 표시. 없으면 그냥 캡쳐 — 일반 사용자도 이게 정상.
