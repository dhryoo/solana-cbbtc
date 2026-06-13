# Infographic 6 — Lightning payment via atomic swap (Lightning 결제 작동 방식)

목표: "Solana 자산을 HTLC escrow 에 잠그면(서명은 Solana 쪽만) LP 가 Lightning 인보이스를
대신 지급하고, 지급 증명(비밀값)으로만 escrow 를 가져갈 수 있다 — 실패하면 환불" 을 보여주는
인포그래픽 (trust-minimized atomic swap 개념).

## Image prompt (영문 — 이미지 AI 에 입력)

```
A clean, modern, flat-design infographic for a mobile fintech app, white background,
generous padding. A left-to-right flow with THREE nodes and a safety loop:

- Left node: a smartphone / wallet icon with a Solana-purple coin (#9945FF),
  labeled "Your wallet (Solana)". A small signature/pen icon beneath it labeled "You sign".
- Middle node: a padlock inside a rounded-square vault, purple outline, labeled
  "Escrow (HTLC)". An arrow from left node into the vault labeled "Lock".
- Right node: a lightning bolt ⚡ icon (bitcoin orange #F7931A) over a receipt/invoice
  card, labeled "Lightning invoice paid". An arrow from the vault to it through a small
  neutral "LP" relay node.
- A thin key icon traveling back from the right node to the vault, labeled "Payment
  proof unlocks", conveying that the LP can only claim the locked funds by proving
  the invoice was paid.
- Below the vault, a subtle dashed return arrow back to the wallet labeled "Refund if
  not paid" (gray-green), conveying the safety path.

Style: minimal, geometric, soft rounded corners, subtle shadows. Solana purple (#9945FF)
primary accent; bitcoin orange (#F7931A) only for the lightning bolt; gray for the LP
node and dashed refund path. White background, high contrast, flat vector illustration.
Only short universal labels (Your wallet, You sign, Lock, Escrow, LP, Lightning invoice
paid, Payment proof unlocks, Refund if not paid) — no sentences. 16:10 aspect ratio.
```

## 의도 (검수 포인트)

- 사용자 서명은 왼쪽(Solana 지갑)에만 있어야 함 — LN 쪽에 서명/키 아이콘 금지
- "비밀값(지급 증명) 없이는 LP 가 escrow 를 못 가져간다"는 인과가 화살표 방향으로 읽혀야 함
- 환불 경로(점선)가 위협이 아닌 안전망으로 보이게 (gray-green, 점선)
- 적용 위치: `src/screens/LightningGuideScreen.tsx` 의 INFOGRAPHIC_LIGHTNING
  (생성 후 `assets/lightning-pay.png` 로 저장하고 require 연결)
