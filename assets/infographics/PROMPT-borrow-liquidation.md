# Infographic 3 — Borrow & liquidation (담보 대출 & 청산)

목표: "cbBTC 를 담보로 USDC 를 빌리면, health(건전성) 게이지로 위험도를 알 수 있고,
담보 가격이 청산가 아래로 떨어지면 청산된다" 를 한눈에 보여주는 인포그래픽.

## Image prompt (영문 — 이미지 AI 에 입력)

```
A clean, modern, flat-design infographic for a mobile fintech app, white background,
generous padding. Top row: a bitcoin coin (orange ₿, #F7931A) labeled "Collateral"
with a right arrow to a dollar/USDC coin (Solana purple #9945FF) labeled "Borrow",
showing you borrow against collateral.

Center: a large horizontal HEALTH gauge / meter divided into three colored zones,
left-to-right: green "Safe", yellow "Caution", red "Danger". A small pointer/needle
sits in the green zone. Under the gauge, a dashed vertical marker line labeled
"Liquidation price".

Bottom hint: a small down-arrow on the bitcoin coin with a caption-free icon showing
that if the collateral price falls toward the red zone / below the liquidation price,
the position gets liquidated (e.g., a small warning triangle in the red zone).

Style: minimal, geometric, soft rounded corners, subtle shadows. Solana purple
(#9945FF) as the primary accent; use green / amber / red only for the three gauge
zones; bitcoin orange (#F7931A) only for the ₿ coin. White background, high contrast,
flat vector illustration. Only the short universal labels listed (Collateral, Borrow,
Safe, Caution, Danger, Liquidation price) — no sentences. 16:10 aspect ratio.
```

## 의도 (검수 포인트)

- 담보(₿) → 차입($) 관계 + **health 게이지 3구간(Safe/Caution/Danger)** + **청산가 마커**.
- 가격 하락 → 빨강(청산) 위험을 시각화 (경고 삼각형 등).
- 짧은 보편 영어 라벨만, 문장 없음. 게이지 색(녹/황/적)은 앱의 riskZone 색과 의미 일치.
- 라이트 배경, 퍼플 메인.
