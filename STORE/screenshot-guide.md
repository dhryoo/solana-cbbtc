# Screenshot Capture Guide — Solana cbBTC

dApp Store는 **최소 4장의 스크린샷**을 요구합니다. 본 가이드는 어떤 화면을 어떻게 캡쳐할지, 그리고 dApp Store의 표시 규격에 맞게 가공하는 방법을 다룹니다.

---

## 사양 확인

| 항목 | 요구사항 |
|---|---|
| 크기 | **1920×1080** (Full HD, 16:9) 권장 |
| 최소 개수 | 4장 |
| 형식 | PNG |
| Orientation | Portrait → 회전/패딩으로 1920×1080 landscape로 변환 (또는 portrait native size) |
| Locale | 한국어 UI 권장 (메인 마켓이 한국이라면) — 영문 별도 권장 |
| 색공간 | sRGB |

Seeker 폰의 실제 해상도는 **1080×2412** (portrait). 1920×1080 landscape로 맞추려면 회전 + 배경 패딩이 필요합니다. 또는 portrait 그대로 업로드하고 Publisher Portal이 자동 처리하도록.

---

## 추천 캡쳐 시나리오

### 1. 자산 화면 — 지갑 연결됨, 잔액 있음 ⭐ 권장 첫 번째

**이유**: 앱의 "무엇을 하는지"가 한눈에 보이는 화면.

**준비**:
- Seeker 지갑에 cbBTC + SOL 잔액 있는 상태
- 지갑 연결 완료
- 라이트 모드 (한국어)

**캡쳐 내용**:
- 헤더 "Solana cbBTC" + "Bitcoin on Solana"
- (있다면) "✓ Seeker Verified" 배지
- cbBTC BalanceCard (0.00012345 cbBTC 같은 실제 값)
- SOL BalanceCard
- "연결 해제" 버튼
- "아래로 당겨 새로고침" 힌트

**파일명**: `screenshot-1-home-ko.png`

### 2. Swap 화면 — 견적 표시 중

**이유**: 핵심 기능(swap) 시각적 증명.

**준비**:
- Swap 탭 진입
- 0.005 SOL 입력
- 견적 표시 완료

**캡쳐 내용**:
- 입력: SOL 0.005
- 방향전환 버튼 (↕)
- 출력 카드: cbBTC
- QuoteDisplay: 예상 수령량, 가격 영향, 라우트 (예: "2 hops · Whirlpool → BisonFi"), 최소 수령량
- 슬리피지 chip 선택 상태
- Swap 실행 버튼 (활성화)

**파일명**: `screenshot-2-swap-quote-ko.png`

### 3. Swap 확인 모달

**이유**: UX의 완성도와 신뢰감.

**준비**:
- Swap 버튼 탭 → ConfirmModal 표시 중 (idle 단계)

**캡쳐 내용**:
- "Swap 확인" 헤더
- 입력 / 예상 수령량 / 최소 수령량 / 슬리피지 / 라우트 요약
- "지갑에서 한 번 더 승인이 필요합니다" warning
- 취소 / Swap 실행 버튼

**파일명**: `screenshot-3-swap-confirm-ko.png`

### 4. 설정 화면

**이유**: 다국어 + 다크모드 + 알림 등 폭넓은 기능 노출.

**준비**:
- 설정 탭

**캡쳐 내용**:
- 언어 선택 (한국어 활성)
- 테마 선택 (시스템 / 라이트 / 다크)
- **알림 토글 + 설명**
- 정보 섹션 (버전, 네트워크)

**파일명**: `screenshot-4-settings-ko.png`

### 5. (선택, 권장) 다크모드 자산 화면

**이유**: 다크모드 지원을 시각화. 마케팅 효과 큼.

**준비**:
- 설정 → 테마 → Dark
- 자산 탭으로 이동

**캡쳐 내용**: 화면 1번과 동일하나 다크 테마

**파일명**: `screenshot-5-home-dark-ko.png`

### 6. (선택) 영어 UI 1~2장

**이유**: 영어권 사용자 대상 별도 locale 메타데이터에 업로드.

다음 화면을 영어로 캡쳐:
- 자산 화면: `screenshot-1-home-en.png`
- Swap 견적: `screenshot-2-swap-quote-en.png`

---

## 캡쳐 방법

### Method 1: Seeker 폰 자체 스크린샷 (가장 간단)

1. Seeker에서 원하는 화면 표시
2. **전원 버튼 + 볼륨 다운 버튼 동시 길게 누름**
3. 갤러리에서 USB 또는 클라우드로 PC로 이동

장점: 즉시 가능, 실 사용 모습  
단점: portrait 1080×2412 → landscape 1920×1080 변환 필요

### Method 2: `adb screencap` (자동화 가능)

```bash
# 원하는 화면 띄운 상태에서:
adb -s SM02G40619122996 shell screencap -p /sdcard/screen.png
adb -s SM02G40619122996 pull /sdcard/screen.png ./STORE/assets/screenshot-raw-1.png
adb -s SM02G40619122996 shell rm /sdcard/screen.png
```

장점: 일관된 품질, 스크립트화 가능

### Method 3: Android Studio Logcat → "Screenshot"

Android Studio가 떠 있다면 Device File Explorer 또는 Logcat 화면에서 카메라 아이콘 → 즉시 png 다운로드.

---

## Portrait → 1920×1080 Landscape 변환

Seeker는 portrait이지만 dApp Store 권장은 landscape 1920×1080. 두 가지 접근:

### A. 그냥 Portrait 1080×2412로 업로드
- 일부 Publisher Portal에서 자동 처리
- 권장. 시도해 보고 거부되면 B로.

### B. Portrait 캡쳐를 1920×1080 frame에 배치 + 보라 배경 padding

```bash
# scripts/frame_screenshots.py (자동 생성 가능)
python3 scripts/frame_screenshots.py STORE/assets/screenshot-raw-1.png
```

또는 PIL로 한 줄:
```python
from PIL import Image
src = Image.open("screenshot-raw-1.png")  # 1080x2412
# Resize to fit 1080 height? No, want full readability.
# Better: pad horizontally to 1920 width, center the portrait.
canvas = Image.new("RGB", (1920, 1080), "#9945FF")
# Scale portrait to 1080 height
scaled = src.resize((int(src.size[0] * 1080 / src.size[1]), 1080), Image.LANCZOS)
# Paste centered
x = (1920 - scaled.size[0]) // 2
canvas.paste(scaled, (x, 0))
canvas.save("screenshot-1-home-ko.png", "PNG", optimize=True)
```

캔버스 색을 Solana purple로 두면 디자인이 통일됩니다.

---

## 파일 배치

모든 스크린샷은 `STORE/assets/`에:

```
STORE/assets/
├── icon-512.png               (생성 완료)
├── banner-1200x600.png        (AI 산출물)
├── screenshot-1-home-ko.png
├── screenshot-2-swap-quote-ko.png
├── screenshot-3-swap-confirm-ko.png
├── screenshot-4-settings-ko.png
├── screenshot-5-home-dark-ko.png
├── screenshot-1-home-en.png   (선택)
└── screenshot-2-swap-quote-en.png  (선택)
```

---

## 검수 체크리스트 (제출 전)

- [ ] 4장 이상의 스크린샷
- [ ] 모두 1920×1080 (또는 native portrait 일관 크기)
- [ ] 한국어 UI 일관 (영어 별도 locale은 영어 캡쳐 따로)
- [ ] **민감 정보 없음** — 실제 지갑 주소가 보이면 마스킹 또는 별도 테스트 지갑 사용
- [ ] **트랜잭션 signature** 노출 신중 (역시 테스트 지갑 권장)
- [ ] 디자인 / UI 요소가 최신 release APK와 정확히 일치
- [ ] 이미지 압축 — PNG optimize로 500KB 이하 권장

---

## 트러블슈팅

**Q: 스크린샷에 status bar / navigation bar가 보이면?**
A: 상관없음. 일부 앱은 시각적 깨끗함을 위해 잘라내지만 자연스러운 모바일 경험을 보여주는 게 더 좋음.

**Q: 캡쳐된 색상이 실제와 달라요.**
A: Seeker는 P3 색공간을 사용. dApp Store는 sRGB 권장이라 살짝 색이 변환됨. PIL의 `image.convert("RGB")` 또는 macOS Preview에서 "Export → sRGB" 변환.

**Q: 한 번 업로드한 스크린샷을 바꾸려면?**
A: 새 release NFT 민팅 시 교체 가능 (versionCode +1). 그 외에는 변경 불가.
