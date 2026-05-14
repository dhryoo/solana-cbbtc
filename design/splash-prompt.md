# Solana cbBTC — Splash Screen Design Prompt

이 문서는 이미지 생성 AI에게 **앱 스플래쉬 스크린** 제작을 의뢰할 때 사용하는 prompt 모음입니다. 앱 아이콘 prompt는 [`icon-prompt.md`](./icon-prompt.md) 참조 — 본 문서와 같은 컨셉/색을 사용해 일관성 유지.

스플래쉬는 앱 시작 시 잠깐 보이는 화면이지만 첫인상을 결정합니다. 단순 로고 표시(이미 `splash-icon.png`로 해결)보다 한 단계 더 풍부한 화면을 원할 때 본 prompt를 사용하세요.

---

## 1. 프로젝트 컨텍스트 (요약)

- **앱 이름**: Solana cbBTC
- **태그라인 (선택 포함)**: "Bitcoin on Solana"
- **컨셉**: Bitcoin을 Solana 위에서 모바일로
- **타겟**: Solana Seeker (Android, 세로 화면)
- **분위기**: 모던, 신뢰감, 첫 화면이 시선을 끌되 곧 사라질 것을 의식한 미니멀

자세한 브랜드 정의·색상은 [`icon-prompt.md` §1~§2](./icon-prompt.md) 참조.

---

## 2. 스플래쉬 기술 사양

### 2.1 산출물 파일

| 파일 | 크기 | 배경 | 용도 |
|---|---|---|---|
| `splash.png` (라이트) | **1284×2778 PNG** | 보라 단색 또는 그라데이션 — 풀 배경 | 라이트모드 / 기본 |
| `splash-dark.png` (다크) | **1284×2778 PNG** | 다크 그라데이션 — 풀 배경 | 다크모드 |

### 2.2 Expo 합성 방식

`app.json`의 `splash` 설정은 두 가지 모드:
- **`resizeMode: "contain"`** (현재): 이미지를 중앙에 비율 유지로 배치, 빈 영역은 `backgroundColor`로 채움. **컨텐츠는 중앙 안전 영역에 집중**.
- **`resizeMode: "cover"`**: 이미지를 화면 전체에 채움 (일부 잘릴 수 있음). 풀 아트워크용.

본 prompt는 **`cover` 모드를 전제로 풀 배경 이미지를 만듭니다** (가장 풍부한 시각 효과). 의뢰 후 `app.json`을 `cover`로 변경합니다.

### 2.3 화면 비율 유의사항

- 1284×2778 비율 ≈ **9:19.5** (모던 안드로이드 표준)
- Seeker 실기 해상도: 1080×2412 (유사 비율)
- 컨텐츠가 너무 가장자리에 붙으면 다른 디바이스에서 잘림 → **외곽 12% 안전 마진** 유지
- **중앙 세로 60% 안에 핵심 시각 요소** 배치 권장

### 2.4 안전 영역 가이드

세로 2778 픽셀 기준:
- **상단 12% (~330px)**: 시스템 상태바 / 노치 영역 — 비울 것
- **중앙 60% (~1660px)**: 핵심 로고 / 워드마크 / 일러스트 위치
- **하단 12% (~330px)**: 시스템 네비게이션 바 / 제스처 영역 — 비울 것
- **좌우 8% (~100px 씩)**: 측면 마진

---

## 3. 컨셉 옵션

### Concept A: "Hero logo + 워드마크" (권장 — 안전, 모던)
중앙에 앱 아이콘과 동일한 코인 로고를 큼직하게 (화면 폭의 35%). 그 아래 "Solana cbBTC" 워드마크 (모던 sans-serif). 배경은 Solana purple `#9945FF` → deeper purple `#5A21B5` 라디얼 그라데이션. 미세한 라이트 파티클/입자 효과로 깊이감.

레퍼런스 분위기: Phantom, Backpack 스플래쉬.

### Concept B: "Cosmic / Solana energy"
중앙에 코인 로고. 배경에 Solana 시그니처 그라데이션 스트라이프(45도 비스듬한 purple→green) 또는 추상 isometric 패턴이 흐릿하게. 코인에 미세한 글로우. 미래지향, 정체성 강함.

레퍼런스 분위기: Solana 공식 브랜드, Jupiter.

### Concept C: "Bridge motif"
화면 좌측 상단 Bitcoin orange ₿, 우측 하단 Solana purple ◆, 두 심볼이 가운데에서 그라데이션 띠로 연결. 가운데에 앱 코인 로고가 겹쳐서 "wrapped" 컨셉을 시각화. 약간 더 일러스트레이션적.

### Concept D: "Minimal monochrome" (가장 안전)
풀 보라 배경 + 중앙에 흰색 코인 로고만. 워드마크 없거나 매우 작게. 거의 우리 현재 디자인의 폴리시 버전. 빠르게 사라질 스플래쉬에 적합.

**권장 우선순위**: A > D > B > C. **A가 시각 임팩트와 안전 사이 균형이 좋음**. C는 매력적이지만 작게 보일 때 복잡도 위험.

---

## 4. 라이트 / 다크 변형

앱은 라이트·다크 두 모드 모두 지원. 스플래쉬도 두 버전 권장 (`app.json`의 `splash.dark` 키에 별도 등록 가능).

### 라이트 (기본): `splash.png`
- 배경: `#9945FF` (Solana purple) 또는 purple → deeper purple 라디얼 그라데이션
- 로고: 흰색 + 미세 글로우
- 워드마크: 흰색 또는 매우 밝은 라벤더
- 전체 톤: 활기차고 밝은 보라

### 다크: `splash-dark.png`
- 배경: `#0E0E10` (앱 다크 토큰) → `#1A0E2E` (보라색이 살짝 도는 진한 자주) 라디얼 그라데이션
- 로고: Solana 그라데이션 (purple → green)로 채운 코인, 또는 흰색 + 보라 글로우
- 워드마크: 라이트 라벤더 (#C8B4FF 정도) 또는 흰색
- 전체 톤: 깊고 차분, 보라 액센트가 두드러짐

다크 변형은 라이트 디자인과 **레이아웃·로고 위치 동일**, 색만 변경 — 사용자가 모드 전환해도 정체성 일관.

---

## 5. 스타일 가이드 (스플래쉬 전용)

**해야 할 것**:
- 1~2초 후 사라질 화면임을 의식한 즉각적 시각 임팩트
- 앱 아이콘과 같은 디자인 언어 (코인 형태, 색, 광택 처리 동일)
- 컨텐츠는 안전 영역(중앙 60%) 안에
- 텍스트는 **"Solana cbBTC"와 (선택) "Bitcoin on Solana" 태그라인만**
- 로고를 화면의 시각적 무게 중심으로

**피해야 할 것**:
- 너무 복잡한 일러스트 (스플래쉬는 빨리 인식돼야 함)
- 로딩 인디케이터 그리기 (Expo가 별도로 표시 안 함, 그릴 필요 X)
- 광고 카피, 가격 정보, 기능 설명 텍스트
- 정사각형 또는 가로형 배치 (반드시 세로 portrait 9:19.5)
- 좁은 색역 (다양한 디스플레이에서 sRGB 색상 정확도 보장)

---

## 6. 모델별 prompt 예시 (Concept A 기준)

### 6.1 Midjourney v6 / v7 — 라이트

```
Mobile app splash screen, portrait 9:19.5 aspect ratio, full-bleed background.
Centered hero composition: a stylized Bitcoin ₿ coin filled with Solana brand gradient (purple #9945FF to green #14F195), placed slightly above vertical center, occupying about 35% of screen width. Below the coin, the wordmark "Solana cbBTC" in bold modern sans-serif (similar to SF Pro Display Bold or Inter), in pure white, with a smaller tagline "Bitcoin on Solana" in lighter weight beneath.
Background: smooth radial gradient from Solana purple #9945FF at the center to deeper purple #5A21B5 at the edges. Subtle ambient light particles drifting upward, very faint.
Style: modern crypto fintech, flat with light gradient and minimal shadow, vector-friendly, premium feel. In the visual style of Phantom Wallet and Backpack splash screens.
No loading spinner, no version text, no app store buttons. Generous safe margins on top 12%, bottom 12%, sides 8%.
--ar 9:19.5 --v 6 --style raw --s 75
```

### 6.2 Midjourney v6 / v7 — 다크

```
Mobile app splash screen, portrait 9:19.5 aspect ratio, dark mode variant.
Same composition as the light version: centered Bitcoin ₿ coin in Solana purple-to-green gradient, occupying ~35% screen width, slightly above center. Wordmark "Solana cbBTC" in bold modern sans-serif beneath, in soft lavender white #E8DCFF. Tagline "Bitcoin on Solana" in dim lavender.
Background: radial gradient from deep purple-black #1A0E2E at center to near-black #0A0612 at edges. The coin emits a subtle violet glow into the surrounding darkness.
Style: dark mode crypto fintech, premium, modern, sense of depth. Flat with one subtle glow layer.
--ar 9:19.5 --v 6 --style raw --s 75
```

### 6.3 DALL-E 3 / ChatGPT image — 라이트

```
Design a vertical mobile app splash screen for "Solana cbBTC", a Bitcoin-on-Solana mobile DeFi app. Portrait orientation, 9:19.5 aspect ratio, intended for Android phones including Solana Seeker.

Composition:
- Centered, slightly above the vertical midline: a stylized Bitcoin ₿ symbol as a flat coin, filled with a smooth gradient from Solana purple (#9945FF) to Solana green (#14F195). The coin should occupy about 35% of the screen width.
- Below the coin: the wordmark "Solana cbBTC" in a bold modern sans-serif typeface (white).
- Below the wordmark: a smaller, lighter-weight tagline "Bitcoin on Solana" in a soft lavender tint.

Background:
- A smooth radial gradient: Solana purple #9945FF at the center, transitioning to a deeper purple #5A21B5 at the edges.
- Subtle ambient light particles, very faint, drifting toward the top — like soft motes of light.

Style and constraints:
- Flat, modern, vector-friendly. No photorealism, no skeuomorphic shading.
- Crypto fintech aesthetic — think Phantom Wallet or Backpack.
- Leave at least 12% safe margin on top and bottom (no critical content in those bands — they may be covered by status bar and gesture nav).
- Output: PNG, 1284×2778 pixels, sRGB.

No loading indicator, no version number, no buttons. Just the brand-forward splash composition.
```

### 6.4 DALL-E 3 / ChatGPT image — 다크 변형 요청 (앞 출력 후 추가)

```
Now produce a dark-mode variant of the same composition. Keep the layout, typography, and proportions identical. Change only the colors:
- Background: radial gradient from deep purple-violet #1A0E2E at center to almost-black #0A0612 at the edges.
- Coin: same Solana gradient (purple to green) but with a subtle violet halo glow radiating outward.
- Wordmark: soft lavender-white (#E8DCFF) instead of pure white.
- Tagline: dimmer lavender, low contrast.
- Keep all safe margins and dimensions identical to the light version.
```

### 6.5 Stable Diffusion (SDXL / SD3) — Concept A 라이트

**Positive**:
```
mobile app splash screen, portrait aspect 9:19.5, centered bitcoin coin logo, solana brand gradient purple to green, #9945FF and #14F195, wordmark "Solana cbBTC" in bold sans-serif white below logo, radial gradient background purple center to deeper purple edges, subtle light particles, modern crypto fintech, phantom wallet aesthetic, flat vector design, premium, generous safe margins top and bottom
```

**Negative**:
```
loading spinner, progress bar, buttons, app store badge, version number, copyright text, photorealism, 3d render, skeuomorphic, photo, watermark, clutter, busy background, multiple subjects, square composition, landscape orientation
```

### 6.6 Imagen 3 / Imagen 4

```
A vertical mobile app splash screen, 1284 by 2778 pixels portrait. Centered slightly above the middle, a flat Bitcoin ₿ symbol rendered as a coin, filled with a smooth gradient from Solana purple #9945FF to Solana green #14F195, occupying about 35% of screen width. Below it, the bold modern sans-serif wordmark "Solana cbBTC" in white. Below that, the smaller tagline "Bitcoin on Solana" in light lavender. Background is a smooth radial gradient from Solana purple at center to a deeper purple at the edges, with faint drifting light particles. Modern, premium, flat vector aesthetic in the style of Phantom and Backpack wallets. No loading indicators, no buttons, generous safe margins on top and bottom.
```

---

## 7. 검수 체크리스트

산출물을 받은 후 다음을 확인:

- [ ] **크기**: 1284×2778 PNG, 세로 portrait
- [ ] **두 변형**: 라이트 + 다크 모두 받음
- [ ] **레이아웃 동일**: 라이트·다크 변형의 로고/워드마크 위치 일치
- [ ] **상단 12% 비어있음**: 상태바와 겹쳐도 안전
- [ ] **하단 12% 비어있음**: 네비게이션 바와 겹쳐도 안전
- [ ] **워드마크 가독**: "Solana cbBTC" 모든 글자 명료
- [ ] **앱 아이콘과 일관**: 코인 형태·색·스타일이 동일 디자인 언어
- [ ] **Seeker 비율 시뮬레이션**: 1080×2412로 크롭/리사이즈했을 때 컨텐츠 손실 없음
- [ ] **OS 색 정확도**: sRGB, Solana purple이 정확한 `#9945FF`
- [ ] **파일 용량**: 너무 크지 않게 (~500KB 이하 권장, PNG 최적화)

문제 시 같은 prompt에 구체 피드백 추가: "logo size 작게", "워드마크 글자 간격 좁게", "particles 더 미세하게" 등.

---

## 8. 산출물 받은 후 통합

### 8.1 파일 배치

```bash
# 기존 splash-icon.png는 유지 (contain 모드 폴백)
cp /path/to/splash.png       assets/splash.png
cp /path/to/splash-dark.png  assets/splash-dark.png
```

### 8.2 `app.json` 갱신

`splash` 섹션을 cover 모드 + 다크 변형으로 확장:

```jsonc
"splash": {
    "image": "./assets/splash.png",
    "resizeMode": "cover",
    "backgroundColor": "#9945FF",
    "dark": {
        "image": "./assets/splash-dark.png",
        "backgroundColor": "#0E0E10"
    }
}
```

(다크 변형 지원은 Expo SDK 50+ 기능, 우리 SDK 54에서 사용 가능)

### 8.3 빌드 + 검증

```bash
npx expo prebuild --platform android   # app.json 변경 사항을 native android/로 sync
adb uninstall com.seekerbtcfi.app
npx expo run:android --variant release --device
```

확인:
- 라이트모드 폰에서 앱 실행 → `splash.png` 표시
- 다크모드 폰에서 앱 실행 → `splash-dark.png` 표시
- 화면 비율 다른 디바이스에서도 잘림 없이 핵심 요소 보임
- 상단 상태바와 하단 네비게이션 영역에 컨텐츠 겹침 없음

---

## 9. (선택) 추가 변형

### 9.1 가로 모드 (사용 빈도 낮음, 권장 안 함)
Seeker 폰은 portrait 전용이라 가로 splash 불필요. 향후 태블릿 지원 시에만 고려.

### 9.2 애니메이션 스플래쉬 (Phase 2 이후)
현재는 정적 PNG. 추후 fade-in 로고, Solana 그라데이션 흐름 등 추가하려면:
- `expo-splash-screen` 패키지 + Lottie 또는 Reanimated
- native module 추가 → prebuild + 재빌드 필요
- 본 prompt 범위 밖, 별도 작업으로 분리

### 9.3 워드마크 분리 산출물 요청 (icon-prompt.md §8.3 참조)
스플래쉬에서 사용된 워드마크를 **별도 transparent PNG**로도 받아두면 README, dApp Store 배너 등에서 재사용 가능. 동일 세션에서 추가 요청.

---

## 10. 우선순위 요약

1. **Concept A (Hero logo + 워드마크)** 라이트 1장으로 시작
2. 만족스러우면 같은 컨셉의 다크 변형 추가 요청
3. 워드마크만 분리 PNG로 별도 요청 (선택)
4. 모든 산출물 검수 후 `assets/`에 배치 + `app.json` 갱신 + 빌드
