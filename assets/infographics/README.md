# Guide Infographics

안내 화면(`LendingGuideScreen.tsx` / `SwapGuideScreen.tsx`)에 들어갈 인포그래픽.

## 생성 방법

각 `PROMPT-*.md` 의 영문 프롬프트를 이미지 생성 AI(Midjourney / DALL·E / Ideogram 등)에 넣어 PNG 를 만든 뒤,
**이 폴더에 아래 파일명으로 저장**하세요:

| 파일명                   | 내용                                         | 프롬프트                       |
| ------------------------ | -------------------------------------------- | ------------------------------ |
| `non-custodial.png`      | 비수탁(self-custody) 자금 흐름               | `PROMPT-non-custodial.md`      |
| `transparency.png`       | 투명성 (on-chain · no-backend · open-source) | `PROMPT-transparency.md`       |
| `borrow-liquidation.png` | 담보 대출 & 청산 (health 게이지 · 청산가)    | `PROMPT-borrow-liquidation.md` |
| `withdraw.png`           | 인출 (Kamino → 내 지갑, 전액/일부, 언제든)   | `PROMPT-withdraw.md`           |
| `swap-route.png`         | Swap 최적 경로 (Jupiter aggregator)          | `PROMPT-swap-route.md`         |

> non-custodial / transparency / borrow-liquidation / withdraw 는 현재 `assets/` 바로 아래에 연결돼 있습니다.
> swap-route 도 동일하게 `assets/swap-route.png` 로 저장하면 연결하겠습니다 (지금은 placeholder).

## 사양

- **사이즈**: 1600×1000 px (가로:세로 ≈ 16:10) 권장. 앱에서 가로 꽉 차게 표시되고 높이 ~200dp.
- **배경**: 흰색 또는 투명. (앱 안내 화면 배경이 라이트이므로 라이트 배경에 잘 보이게)
- **텍스트**: **최소화**. 앱이 ko/en 캡션을 따로 붙이므로 이미지엔 한국어/영어 문장을 넣지 말 것.
  꼭 필요하면 아이콘 + 아주 짧은 보편 영어 단어(Wallet, Kamino, ₿)만.
- **스타일**: flat / minimal / modern, 둥근 모서리, Solana 퍼플(#9945FF) 메인 + 비트코인 오렌지(#F7931A) ₿ 액센트.

## 적용

PNG 를 위 파일명으로 저장한 뒤 알려주시면, `LendingGuideScreen.tsx` 의
`INFOGRAPHIC_NON_CUSTODIAL` / `INFOGRAPHIC_TRANSPARENCY` 를 `require("../../assets/infographics/...png")`
로 연결합니다 (지금은 placeholder 박스가 표시됨).
