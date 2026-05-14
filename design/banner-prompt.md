# Solana cbBTC — dApp Store Banner Prompt

이미지 AI에게 dApp Store 배너 (1200×600 PNG) 제작을 의뢰할 때 사용하는 prompt. 기존 [`icon-prompt.md`](./icon-prompt.md), [`splash-prompt.md`](./splash-prompt.md)와 동일한 디자인 언어 유지.

---

## 1. 배너 사양

- **크기**: 1200×600 PNG
- **비율**: 2:1 가로형
- **용도**: dApp Store 앱 상세 페이지 상단 hero, 검색 결과 카드
- **잘림 가능성**: 일부 컨텍스트에서 가로 폭이 잘릴 수 있으므로 **중앙 60% 안에 핵심 요소** 배치

## 2. 컨텐츠 요구사항

- 앱 아이콘과 동일한 코인 디자인 (Bitcoin ₿ + Solana 그라데이션)
- 워드마크 "Solana cbBTC" (큰 폰트)
- 태그라인 "Bitcoin on Solana" (작은 폰트, 보조)
- 배경: Solana purple (#9945FF) 그라데이션 또는 동일 톤의 추상 패턴

## 3. 컨셉 옵션

### Concept A: "Hero + 좌측 정렬 텍스트" (권장)
좌측 영역에 코인 로고 (큼), 우측 영역에 워드마크 + 태그라인. 우측 정렬된 텍스트, 좌측은 visual hero. 첫인상 강함.

### Concept B: "센터 정렬 + 양옆 배경 장식"
중앙에 코인 + 워드마크 수직 배치, 양옆에 미세한 시각 장식 (입자, 라이트 스트릭). 대칭적, 정적인 인상.

### Concept C: "수평 분할: 라이트 ↔ 다크"
가로 절반은 라이트 보라, 나머지 절반은 다크 보라/검정. 코인과 텍스트가 양쪽 위에 동일하게 표시되어 "두 모드 모두 지원"을 시각화. 메타적 디자인.

**권장**: Concept A — dApp Store 카드 형식에 가장 잘 맞음.

## 4. 스타일 가이드

- 모던 fintech 미감 (Phantom, Backpack, Jupiter 톤)
- Flat / vector / minimal
- 그림자 절제, 그라데이션은 부드럽게
- **읽기 안전 영역**: 좌우 8%, 상하 12% 마진
- 잘림 대비: 중앙 800×600 안에 핵심 시각 요소가 모두 들어가도록

## 5. 피해야 할 것

- 정사각형 비율 (배너는 반드시 2:1 가로형)
- 너무 작은 텍스트 (배너 검색 결과 카드에서 축소 표시될 수 있음)
- 5색 이상의 복잡한 그라데이션
- 사실적 일러스트
- "Download Now" / "Coming Soon" 같은 CTA 텍스트 (스토어가 자체적으로 처리)

## 6. 모델별 prompt 예시

### 6.1 Midjourney v6 / v7

```
dApp Store banner for "Solana cbBTC", a mobile DeFi app for Solana Seeker users. Horizontal 2:1 landscape composition, 1200x600 pixels.
Left third: a stylized Bitcoin ₿ coin filled with Solana brand gradient (purple #9945FF to green #14F195), thin lighter-purple ring around the coin, occupying about 40% of the canvas height.
Right two-thirds: bold modern sans-serif wordmark "Solana cbBTC" in white, with smaller lighter-weight tagline "Bitcoin on Solana" beneath it.
Background: smooth horizontal gradient from deep Solana purple #5A21B5 on the left to brand purple #9945FF on the right, with very subtle drifting light particles.
Style: modern crypto fintech, flat with light gradient, minimal shadows, vector-friendly. Visual style of Phantom Wallet and Jupiter Exchange. No CTA text, no download badges, generous safe margins on top and bottom.
--ar 2:1 --v 6 --style raw --s 60
```

### 6.2 DALL-E 3 / ChatGPT image

```
Design a landscape banner (1200×600 pixels) for "Solana cbBTC", a mobile DeFi app on Solana.

Layout:
- Left third: stylized Bitcoin ₿ coin (about 40% of canvas height) filled with a smooth Solana brand gradient (purple #9945FF to green #14F195), with a thin lighter-purple ring around it.
- Right two-thirds: the wordmark "Solana cbBTC" in bold modern sans-serif white text, with a smaller lighter-weight tagline "Bitcoin on Solana" underneath.

Background:
- Horizontal gradient from #5A21B5 (deep purple, left) to #9945FF (brand purple, right).
- Very faint drifting light particles, low opacity.

Style:
- Modern crypto fintech aesthetic, similar to Phantom Wallet or Jupiter.
- Flat design with subtle gradients, no photorealism, no skeuomorphism.
- Keep core content within the central 60% of the canvas to survive cropping in different store contexts.

Constraints:
- No "Download Now", no store badges, no version numbers, no buttons.
- 1200×600 PNG, sRGB color space.
```

### 6.3 Imagen 3 / Imagen 4

```
A landscape banner 1200 by 600 pixels for a Solana mobile DeFi app called "Solana cbBTC". Left third: a flat Bitcoin ₿ coin with a smooth Solana purple-to-green gradient and a thin lighter ring, about 40% of canvas height. Right two-thirds: the bold sans-serif wordmark "Solana cbBTC" in white with a smaller "Bitcoin on Solana" tagline underneath in light lavender. Background is a horizontal gradient from #5A21B5 on the left to #9945FF on the right, with faint drifting light particles. Modern, premium, flat vector aesthetic in the style of Phantom and Jupiter. No CTA buttons or store badges. Output 1200×600 PNG.
```

### 6.4 Stable Diffusion (SDXL / SD3)

**Positive**:
```
dApp store banner, horizontal 2:1 landscape, left side bitcoin coin logo with solana brand gradient purple green, right side wordmark "Solana cbBTC" bold white sans serif, tagline "Bitcoin on Solana" lighter, horizontal gradient background dark purple to brand purple, modern crypto fintech, phantom wallet style, flat vector, premium, subtle light particles
```

**Negative**:
```
square aspect ratio, portrait, "download now" text, app store badge, CTA button, version number, copyright, photo, photorealistic, 3d render, watermark, busy background, multiple coins, cluttered
```

---

## 7. 검수 체크리스트

- [ ] 1200×600 PNG 정확한 크기
- [ ] 좌측 코인, 우측 텍스트 명확하게 분리
- [ ] 워드마크 "Solana cbBTC" 모든 글자 또렷
- [ ] 안전 영역 (상하 12%, 좌우 8%) 안에 모든 컨텐츠
- [ ] 앱 아이콘과 일관된 디자인 (코인 모양, 색, 톤)
- [ ] 800×600 중앙 영역만 보여도 메시지 전달 가능
- [ ] 다른 앱 스토어 배너와 차별되는 정체성

---

## 8. 통합

산출물을 받은 후:

```bash
cp /path/to/banner-1200x600.png STORE/assets/banner-1200x600.png
```

dApp Store Publisher Portal의 Release media 섹션에 업로드.

---

## 9. (선택) Feature graphic 1200×1200

`STORE/submission-checklist.md`의 선택 항목. 정사각형 배너로 카드 표시에 활용. 같은 디자인 언어로 정사각형 비율로 변형 요청:

```
Now produce a square 1200×1200 variant of the same design. Keep the coin and wordmark, but rearrange for a square canvas: coin centered-top, wordmark below, tagline at the bottom. Same color palette and style.
```
