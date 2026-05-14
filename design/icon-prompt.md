# Solana cbBTC — App Icon & Splash Screen Design Prompt

이 문서는 이미지 생성 AI(Midjourney, DALL-E, Imagen, Stable Diffusion 등)에게 앱 아이콘과 스플래쉬 스크린 제작을 의뢰할 때 사용하는 prompt 모음입니다. 컨텍스트 → 사양 → 컨셉 → 모델별 prompt 순서로 구성. 통째로 붙여도 되고 섹션만 발췌해도 됩니다.

---

## 1. 프로젝트 컨텍스트

**앱 이름**: Solana cbBTC
**한 줄 정의**: Solana 위에서 cbBTC(Coinbase Wrapped Bitcoin)를 다루는 모바일 dApp
**타겟 디바이스**: Solana Seeker (Android 전용 mobile-first)
**핵심 기능**: cbBTC ↔ SOL swap, 잔액 조회 (확장 예정: lending, on-chain BTC 결제)
**브랜드 톤**: 모던, 신뢰감, 미니멀, mobile-native. 토이/장난스러움 X, 과한 장식 X.
**경쟁 레퍼런스 (분위기 참고)**: Phantom, Backpack, Jupiter, Drift, Kamino, Solflare

---

## 2. 브랜드 컬러 팔레트

| 역할 | HEX | 출처 |
|---|---|---|
| Primary (Solana purple) | `#9945FF` | Solana 공식 |
| Accent (Solana green) | `#14F195` | Solana 공식 |
| Bitcoin orange | `#F7931A` | Bitcoin 표준 |
| 다크 배경 | `#0E0E10` | 앱 다크모드 토큰 |
| 라이트 배경 | `#FFFFFF` | 앱 라이트모드 토큰 |

**색 사용 가이드**:
- Primary 단색 vs 그라데이션(purple → green / purple → orange) 둘 다 허용
- Bitcoin orange는 cbBTC 정체성을 위해 포함 권장하나 비중은 보조
- 단색 흰색/검정 위에서도 식별 가능해야 함 (앱 모드 전환 대응)

---

## 3. 산출물 사양 (필수)

다음 4가지 파일을 동일한 디자인 컨셉으로, **다른 사용처에 맞게 변형**해서 제작:

### 3.1 `icon.png` — 앱 아이콘 (스토어/iOS/fallback)
- **크기**: 1024×1024 PNG
- **배경**: 풀 배경 (단색 또는 그라데이션)
- **컨텐츠**: 중앙 75% 안에 핵심 로고
- **safe-area**: 외곽 12% 마진 (런처 마스킹/잘림 방지)
- **모서리**: 사각 그대로 (OS가 둥글게 마스킹)
- **투명도**: 불투명

### 3.2 `adaptive-icon.png` — Android 적응형 아이콘 (foreground)
- **크기**: 1024×1024 PNG
- **배경**: **완전 투명**
- **컨텐츠**: **중앙 712×712 safe zone 안**에만 (런처가 원/사각/물방울 등 다양한 모양으로 마스킹)
- **여백**: 외곽에 충분한 padding (전체 면적의 30% 정도)
- 배경색은 앱 설정에서 `#9945FF`로 합성됨 → 보라색 배경 위에서 잘 보이도록 디자인

### 3.3 `splash-icon.png` — 스플래쉬 화면 중앙 로고
- **크기**: 1024×1024 PNG (앱이 자동 리사이즈)
- **배경**: **완전 투명**
- **컨텐츠**: 중앙에 큰 로고 (전체 면적의 50~70% 차지)
- 배경은 앱이 `#9945FF` 단색으로 깔아줌
- icon.png보다 단순·플랫하게 (스플래쉬는 짧은 순간 보이므로 즉각 인식 우선)

### 3.4 (선택) `wordmark.png` — 텍스트 로고
- **크기**: 1024×512 (가로형) 또는 1024×256
- "Solana cbBTC" 텍스트를 브랜드 폰트/스타일로
- dApp Store 배너, README 등에 활용

---

## 4. 컨셉 옵션 (셋 중 하나 고르거나 AI가 변형 제시)

### Concept A: "Wrapped Bitcoin on Solana"
Bitcoin 심볼(₿)을 Solana 그라데이션(purple→green)으로 채운 동전 형태. 동전 외곽에 얇은 광택 링, 또는 동전이 Solana의 시그니처 비스듬한 stripe로 감싸진 형태. **Wrapped** 컨셉을 시각화.

### Concept B: "Bridge between chains"
좌측 Bitcoin orange ₿ ↔ 우측 Solana purple ◆ 두 심볼이 가운데에서 연결되거나 겹쳐지는 형태. 양방향 화살표 또는 한 줄의 그라데이션 띠로 연결. swap 기능을 직접 암시.

### Concept C: "Abstract geometric ₿"
Bitcoin ₿ 글리프를 Solana 특유의 각진 isometric/3D 스타일로 재해석. 단색 보라 배경 + 흰색 또는 그라데이션 ₿. 가장 미니멀, 폰트적 인상. Phantom·Backpack 톤과 가까움.

**권장**: Concept A 또는 C. swap에 종속되지 않으면서 cbBTC와 Solana 정체성 모두 시사.

---

## 5. 스타일 가이드

**해야 할 것**:
- Flat / minimal / geometric 우선
- 한 가지 메인 컨셉에 집중 (시각 요소 2~3개 이하)
- 작은 크기(48px)에서도 식별 가능해야
- 광택·그림자는 절제 (있다면 미세하게)
- vector-friendly한 형태 (재변환 가능하도록)
- 다크모드(#0E0E10)와 라이트모드(#FFFFFF) 둘 다에서 분리감 유지

**피해야 할 것**:
- 텍스트 (단, "₿" 단일 글리프는 OK)
- 사실적 일러스트, 사진, AI-generated 노이즈
- 5개 이상의 색상
- 복잡한 그라데이션 (3색 이상)
- skeuomorphic (실제 동전 photoreal 등)
- 캐릭터, 마스코트, 동물
- 흔한 crypto 클리셰 (큐브, 사슬, 자물쇠)

---

## 6. 출력 파일 형식 요구

- **포맷**: PNG (sRGB)
- **투명도**: adaptive-icon.png과 splash-icon.png은 반드시 alpha channel 보존
- **해상도**: 1024×1024 (이후 앱이 자동 다운샘플)
- **명도**: 외곽 잘림 가정하고 컨텐츠를 중앙으로

---

## 7. 모델별 prompt 예시

아래 prompt들은 위 사양을 모델별 문법으로 옮긴 것입니다. 모델 선택 후 그대로 붙여 사용.

### 7.1 Midjourney v6 / v7

```
Modern minimal mobile app icon for "Solana cbBTC", a DeFi app on Solana blockchain.
Centered Bitcoin symbol ₿ rendered as a coin, filled with smooth Solana brand gradient (purple #9945FF to green #14F195). Subtle thin outline ring around the coin. Solid Solana purple #9945FF background with very subtle radial vignette. Geometric, flat-design, vector-style, no text, no skeuomorphism, no photorealism, no shadow noise. Designed to be legible at 48 pixels. Composition: subject occupies central 65% with safe outer margin. Crypto fintech aesthetic, in the visual style of Phantom Wallet and Jupiter Exchange. --ar 1:1 --v 6 --style raw --s 50
```

대안 (Concept C 미니멀):
```
Bold sans-serif Bitcoin symbol ₿ in white, centered on a deep Solana purple #9945FF background, flat vector design, no gradient, no border, no text, mobile app icon, generous outer margin, looks great at small sizes, in the visual style of modern crypto wallets like Phantom and Backpack. --ar 1:1 --v 6 --style raw
```

### 7.2 DALL-E 3 / ChatGPT image

```
Design a square mobile app icon for "Solana cbBTC", a Bitcoin-on-Solana DeFi app.

Concept: a Bitcoin ₿ symbol stylized as a flat geometric coin, filled with a smooth gradient from Solana purple (#9945FF) to Solana green (#14F195). Place it centered on a solid #9945FF background with a faint radial vignette. Add a thin lighter-purple ring around the coin to suggest "wrapped Bitcoin". No text, no photorealism, no shadows. Keep the design vector-style and minimal so it remains legible at 48×48 pixels. Crypto fintech aesthetic similar to Phantom or Jupiter. Composition must leave a 12% safe margin around the edges. Output: 1024×1024 PNG, sRGB.
```

### 7.3 Stable Diffusion (SDXL / SD3) — positive + negative

**Positive**:
```
mobile app icon, centered bitcoin symbol coin, gradient fill purple to green, solana brand colors #9945FF and #14F195, flat vector design, minimal, geometric, crypto fintech, phantom wallet aesthetic, thin outline ring, solid solana purple background, sharp, legible at small size, square composition, 1:1 aspect ratio
```

**Negative**:
```
text, letters, words, watermark, photo, photorealistic, 3d render, skeuomorphic, shadow noise, cluttered, multiple objects, character, mascot, animal, chain, lock, cube, gradient noise, busy background
```

### 7.4 Imagen 3 / Imagen 4

```
A minimal modern mobile app icon, 1024 by 1024 pixels. Centered Bitcoin ₿ glyph styled as a flat coin filled with a smooth Solana brand gradient from purple #9945FF to green #14F195. Background is solid Solana purple #9945FF. Thin lighter ring around the coin suggesting wrapped Bitcoin. Vector flat design, no text, no photorealism, generous outer safe margin, clearly readable at 48 pixel size. In the aesthetic of Phantom and Jupiter crypto apps.
```

---

## 8. 변형 요청 — 한 컨셉 → 4파일

AI가 메인 디자인 (icon.png)을 결정하면, 다음 변형을 별도 요청하세요. **같은 채팅/세션** 안에서 일관성 유지.

### 8.1 adaptive-icon.png 변형 요청

```
Now produce the same design with these changes for an Android adaptive icon foreground:
- Make the background fully transparent (alpha = 0).
- Keep only the central foreground content (the coin with ₿ and ring).
- Shrink the foreground so it fits within the central 712×712 area of a 1024×1024 canvas. The remaining 156-pixel border on every side must be empty transparent.
- The foreground must look intentional when masked into a circle (no critical elements near the corners).
```

### 8.2 splash-icon.png 변형 요청

```
Now produce a splash-screen variant with:
- Fully transparent background.
- The coin with ₿ (no surrounding ring) enlarged to occupy ~60% of the canvas.
- Cleaner and simpler than the app icon — this is a brief flash during app launch, so legibility and impact matter more than detail.
- Center the design exactly. No outer ornaments.
```

### 8.3 (선택) wordmark.png 변형 요청

```
Now create a horizontal wordmark for "Solana cbBTC":
- Canvas 1024×256 PNG, transparent background.
- "Solana cbBTC" in a bold modern sans-serif (e.g., similar to Inter, SF Pro Display, or Söhne Bold).
- Color: white for use on the Solana purple background, OR the Solana gradient (purple → green) for use on dark/light neutral backgrounds.
- Optional: a small coin icon (matching the app icon design) preceding the text. Same vertical baseline.
```

---

## 9. 검수 체크리스트

AI가 산출물을 보낸 후 다음을 확인:

- [ ] `icon.png` 1024×1024, 풀 배경, 외곽 12% 마진
- [ ] `adaptive-icon.png` 1024×1024, alpha 투명, 중앙 712×712 안에만 컨텐츠
- [ ] `splash-icon.png` 1024×1024, alpha 투명, 중앙 큰 로고
- [ ] 4파일 모두 동일 디자인 언어 (색·형태·스타일 일관)
- [ ] 다크/라이트 배경 위에 올려서 시인성 테스트 (실제 앱은 라이트/다크 둘 다 지원)
- [ ] 48×48로 리사이즈해 봤을 때 식별 가능
- [ ] Android 원형/사각/물방울 마스크 셋 다 적용 상상 시 자연스러운지

문제 발견 시 같은 prompt에 "iterate on..."을 추가해서 재요청.

---

## 10. 파일 배치

산출물을 받은 후:

```bash
# 기존 placeholder 백업 (선택)
mv assets/icon.png assets/icon.placeholder.png

# 새 파일 배치
cp /path/to/icon.png            assets/icon.png
cp /path/to/adaptive-icon.png   assets/adaptive-icon.png
cp /path/to/splash-icon.png     assets/splash-icon.png
# (선택) wordmark는 design/ 폴더에 보관, 코드에서 직접 사용 안 함
cp /path/to/wordmark.png        design/wordmark.png
```

이후 release APK 재빌드:
```bash
adb uninstall com.seekerbtcfi.app
npx expo run:android --variant release --device
```

`splash.backgroundColor`와 `android.adaptiveIcon.backgroundColor`는 `app.json`에서 `#9945FF`로 이미 설정되어 있어 새 아이콘과 정합됨. 다른 색이 필요하면 두 값을 같이 변경.
