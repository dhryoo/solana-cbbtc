# Lightning 심화 로드맵 — 이해할 메커니즘 + 완성도 구멍 + 트랙

학습/완성도 프로젝트(메모리 `project_goals`)의 LN 심화 기준 문서.
`ln-deepening-map` 워크플로우(6영역 병렬, 2026-06-28)의 정밀 매핑을 합성한 것.
**목표는 사용자 증가가 아니라 "Bitcoin LN/HTLC를 코드로 체득" + 견고성.**

---

## 1. 먼저 이해할 핵심 메커니즘 (학습 너겟)

> 이 섹션이 이 프로젝트의 "왜 LN을 하는가" 의 답이다. 코드는 아래 개념의 구현체다.

- **ToBTCLN(보내기) = Solana-측 HTLC**: 사용자가 BOLT11의 `payment_hash` H로 키된 Solana escrow에
  토큰을 잠근다(COMMITED). LP가 LN 인보이스를 오프체인으로 지불하면 **preimage P**(SHA256(P)=H)를
  얻고, **그 P를 온체인에 공개해야만** escrow를 가져간다(claim). 즉 **"LP가 자금을 가져감 == 실제로
  인보이스를 지불함"** 이 같은 사건이다. 지불 안 하면 P를 못 얻어 claim 불가 → timelock 만료 후 사용자 refund.
  claim과 refund는 온체인에서 **상호배타** → 앱 상태가 헷갈려도 _자금은 못 잃는다._
- **FromBTCLN(받기) = 방향이 반대**: LP/송신자가 **먼저** BTC를 HODL HTLC에 잠그고, 사용자가 **마지막에**
  Solana claim tx에 서명해 P를 공개 → LP가 그 P로 inbound BTC를 정산. 사용자가 **두 번째**로 행동하고
  **SOL을 써야**(tx fee + escrow rent + ATA rent) 이미 잠긴 자금을 푼다 → 환원 불가한 실패모드 =
  "지불은 도착했는데 claim을 못/안 함" → **그래서 받기는 SOL을 하드게이트**. 미claim은 사용자 손해 0
  (LN HODL timeout으로 송신자 환불).
- **failover 경계 = commit()**: HTLC라 commit 이후엔 그 LP의 claim-or-timelock에 묶인다 → **failover는
  오직 quote 시점에만** 가능, commit 후엔 불가. 이게 환불 머신러리가 존재하는 이유.
- **협조적 vs 일방적 환불**: LP가 즉시 공동서명(cooperative) vs LP가 비협조면 사용자가 timelock 만료까지
  기다려 일방 환불(unilateral). **현재 코드는 이 구분을 사용자에게 안 보여준다.**
- **cbBTC pre-swap = 비원자적 2-leg**: leg1 Jupiter(원자적) + leg2 Atomiq HTLC. cbBTC로 HTLC를 직접
  못 채워 USDC로 선스왑 → 두 leg이 서로 원자적이지 않음 → **"중간자산(USDC)에 갇힘" 상태**가 핵심 난제.
  confirmation vs finality vs timeout 의 차이가 학습 포인트.
- **waitForPaymentResilient**: SDK의 timeout/throw는 **실패의 증거가 아니다.** 온체인 CLAIMED(=preimage
  소비)가 진실의 원천 → refund 전에 `_sync()`로 재확인해야 settled swap을 이중처리(false-negative) 안 함.
- **Hermes 기질(substrate)**: polyfill(`Buffer.subarray`, `AbortSignal.throwIfAborted`)이 있어야 HTLC가
  *도달 가능*하다. Hermes엔 TypedArray species 생성자 + 최신 AbortSignal static이 없어서(Node엔 있음)
  device-only로 깨졌던 것(M17.1/M18). RN-vs-spec의 핵심 교훈.

---

## 2. 발견된 구멍 (정직한 적대적 평가 — 6영역 모두 robustness=partial)

### 정확성 (Correctness)

- **quote 만료 미적용**: `quoteExpiresAt`를 채우지만 **아무도 안 읽음**. 모바일에서 quote→commit 간극이
  수분이라 stale quote로 escrow commit 가능 → raw SDK 에러. (seam·send 둘 다 지목)
- **`providerId` 무시 라우팅**: `pay()/waitAndClaim()`이 `quote.providerId`를 무시하고 단일 `this.provider`로
  감 → provider 2개면 **자금 오라우팅 잠재버그**(A quote를 B로 실행).
- **`LightningQuote.ref`가 live SDK 객체**: 직렬화 불가·프로세스 수명 종속 → 안드로이드 백그라운딩 시 dead.
- **cbBTC: timeout==success 오인**: `swap_confirm_timeout`(90s)을 "USDC로 스왑됨"으로 단정 →
  프로젝트 자체 gotcha #8 위배(미확인 ≠ 실패).
- 빈 `claimTxId`로 success 렌더(죽은 explorer 링크), 실패 후 refundable 배너 stale(30s).

### 자금안전 가시성 (Fund-safety visibility) — 가장 큰 완성도 구멍

- **in-flight COMMITTED/SOFT_CLAIMED 보내기 invisible**: `getRefundableSwaps`는 state=4 REFUNDABLE만
  반환 → commit 직후 앱 죽으면 "X 잠김, T시각 해제" 표시가 없음. `getAllSwaps`는 **DEV** 진단에만 wired.
- **받기 복구경로 0**: 받기는 refundable 배너 같은 게 없음 → LN 지불 도착 후 claim 실패 시 inbound 자금이
  **stuck + invisible**(손실은 아니지만 가시성 구멍).
- **timelock·협조/일방 환불 미표시**: 사용자는 불투명한 count만 봄 → 자금이 잠겼는데 잃었다고 오해 가능.
- **preimage(lnSecret) 버려짐**: pay()가 P를 받지만 결과카드/히스토리에 안 남김. **LN의 가장 의미있는
  암호학적 산물(=지불 증명)을 학습 프로젝트가 버리는 중.**

### 회복탄력성 (Resilience)

- 단일 provider(레지스트리·failover 없음) / Atomiq 런타임 **단일 RPC SPOF**(앱 나머지는 failover) /
  LP discovery가 2026-06-13 하드코딩 IP로 fallback(부패 중, count==0이 **DEV** 로그뿐).

### 테스트

- **polyfills.ts 100% 미테스트 + jest에서 도달불가**(Node엔 native 있음) → subarray/throwIfAborted 회귀가
  75 테스트 통과하고 **device에서 LP discovery를 brick**. device-only 함정이 CI로 안 잡힘.
- `quote()`·`createReceive()` 미테스트, cbBTC pay **순서 안전성**(shortfall→pay 전) 미테스트,
  stringly-typed sentinel(`'cbbtc_preswap_shortfall'` 등)이 throw처와 friendlyError에서 따로 하드코딩.

---

## 3. 심화 트랙 (학습 + 완성도 순)

### Track A — 정확성 quick wins (각 S, 빠르게 출시)

- **A1. quote 만료 적용** — facade `pay()`에 `quote_expired` 가드 + UI 카운트다운/비활성/재견적. (dead field 활성화)
- A2. provider 레지스트리 + `providerId` 라우팅(오라우팅 버그 차단, 이중LP 전제)
- A3. Atomiq 런타임에 `makeFailoverFetch` 주입(단일 RPC SPOF 제거)
- A4. sentinel 상수 모듈(LN_ERR.\*) — throw처↔friendlyError 계약 테스트
- A5. pay onError에서 `['lightning','refundable']` invalidate(stale 배너)

### Track B — HTLC 안전을 *관찰가능*하게 (학습 코어) ⭐

- **B1. preimage = 지불증명(Proof-of-Payment)** — `lnSecret`을 결과카드+로컬 히스토리에 노출/보존 +
  "hash(preimage)==payment_hash" 설명. _버려지던 산물을 앱의 LN 학습 모멘트로._ (CLAIMED 후에만, 민감취급)
- B2. **in-flight/stuck swap 패널** — `getAllSwaps`를 상태별(COMMITTED/SOFT_CLAIMED/CLAIMED/REFUNDABLE/
  claimable-receive)로 분류 + 금액 + **timelock 해제시각** 표시. 가장 큰 가시성 구멍을 닫음.
- B3. **실제 state machine 구동** — `waitForPayment` 불린 + `_sync` 핵 대신 `swap.getState()`로 UI/환불 결정.
- B4. 받기 회복 패리티 — 받기 wait에 resilient 가드 + stuck-receive 복구 surface.
- B5. 협조/일방 환불 구분 표시(timelock 가시화).

### Track C — 회복탄력성 / 이중 LP (build-to-learn)

- C1. (A2 후) `quoteWithFailover` — 우선순위로 provider 시도, **인프라 에러만** fallover하고
  `LightningAmountError`(금액 범위)는 절대 fallover 안 함(에러 분류학이 함정). + "왜 post-commit failover가
  불가능한가" ADR.
- C2. **BoltzProvider 스켈레톤** — 같은 인터페이스 구현(처음엔 not_implemented throw). _추상화의 정직한
  시험_: 모든 Atomiq-ism(min/max 에러 모양·refund-by-address·live ref·SOLANA 가정)을 드러냄. 최고 학습.

### Track D — 테스트 경화

- **D1. polyfills.test.ts** — native 삭제→resetModules→재import로 각 패치 검증. device-only 함정을 CI 계약으로.
- D2. `quote()`/`createReceive()` DI 테스트(positional-arg 계약). D3. `useCbbtcLightningPay` 통합테스트
  (shortfall→pay-전 순서 = 자금안전).

---

## 4. 추천 오프닝

1. **A1 (quote 만료, S)** — 워밍업: 실제 버그·저위험·TDD, quote-vs-commit 타이밍 체득.
2. **B1 (preimage 지불증명, M)** — 학습 코어: HTLC 원자성(preimage=H의 원상)을 _눈에 보이게_.

그다음 B2(stuck-swap 가시화) → C(이중 LP). Track D는 각 코드 변경과 함께 짝지어 진행.

---

## 참고

- 매핑 워크플로우: `ln-deepening-map` (6영역, 2026-06-28). 전체 gap 목록은 워크플로우 출력 참조.
- 메모리: `project_goals`(학습/완성도 우선), `project_phase3_design`, `reference_monitoring_triggers`(Atomiq 교체).
- 백로그: `plan.md` "적대적 검증 백로그".
