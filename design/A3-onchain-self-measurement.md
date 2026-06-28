# A3 — 온체인 자가측정 설계

설계 문서. `plan.md` "적대적 검증 백로그" **A3** 산출물.
외부 사실은 `a3-onchain-measurement-research` 워크플로우(5차원, 2026-06-28)로 검증했고,
각 사실의 confidence/출처를 본문에 표기한다. **구현이 아니라 의사결정용 문서다.**

---

## 0. TL;DR

- **"설치"** 는 거의 무료·무프라이버시로 측정 가능(GitHub release asset `download_count`) — 단 현재 release 에 APK 를 안 붙여서 **비활성**. dApp Store 포털은 사용 지표를 안 준다(평점·리뷰만).
- **"활성 사용자·리텐션"** 은 사용자 트랜잭션에 상수 마커를 다는 **태깅이 필요**한데, 그건 "지갑 X가 앱 Y를 썼다"를 **영구·1쿼리로 열거 가능**하게 만들어 셀프커스터디/프라이버시 가치와 **정면충돌**한다.
- 따라서 **기본 권고: 사용자별 온체인 마커를 달지 않는다.** 먼저 **A1**(SKR 보상/dApp Store "quality" 가 _사용자별_ 지표를 실제로 요구하는가?)을 확인한다 — 앱 자체는 이미 Publisher/App/Release NFT 로 귀속되며 사용자 지갑을 건드리지 않는다. **정말 집계 볼륨이 필요할 때만** small-p 샘플링 + opt-in + 고지로 최소화한다.

> 즉 A3의 정직한 답은 "추적 방법"이 아니라 **"설치는 싸게 측정하고, 활성/리텐션의 일부 맹목은 셀프커스터디의 *대가*로 수용하라. 태깅은 A1이 요구할 때만, 최소 침습으로."**

---

## 1. 문제 & 원칙

- **문제**: no-analytics 정책으로 "쓰이는가/돌아오는가"에 맹목 (premortem·assumptions 메타 발견).
- **제약**: `policy_no_backend` — 백엔드·analytics SDK·tracker 금지, 새 기능은 우회로를 찾을 의무.
- **답할 질문**: _쓰이는가? 돌아오는가?_ (누구인가? 는 **아님**.)
- **원칙**: 런타임에 사용자를 계측(beacon)하지 않는다. 이미 공개된 온체인 데이터를 **개발자가 사후 오프라인으로 읽는** 것은 tracker 가 아니다. 단, 그 데이터가 "공개"가 되려면 무언가 태깅이 선행돼야 하고 — 거기서 프라이버시 비용이 발생한다(§3).

---

## 2. 측정 가능한 신호 지도 (검증된 사실 기반)

### Layer 0 — 오늘 가능, 코드 0, 프라이버시 0 (단 신호가 약함)

| 소스                                  | 주는 것                                  | 한계                                                                    | 근거 (confidence)                                                                                                          |
| ------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| GitHub release asset `download_count` | APK 다운로드 수 = 설치 **하한 proxy**    | bot/CI/미러 포함, 고유 사용자 아님, 리텐션 없음, dApp Store 설치 미포함 | 필드 존재: **verified** (docs.github.com releases API) · 현재 release(v0.3.0~0.4.2)에 asset 0개라 **현재 0**: **verified** |
| dApp Store Publisher Portal           | **평점·리뷰 + AI 요약·답글**만           | 설치/활성/리텐션 telemetry **없음**                                     | **verified** (docs.solanamobile.com dapp-publishing)                                                                       |
| Publisher/App/Release NFT             | **앱 자체**의 온체인 귀속(개발자가 민팅) | 사용자 활동·리텐션 아님                                                 | 앱 귀속은 사용자 지갑을 **안 건드림**                                                                                      |

**액션(코드 변경 아님)**: release 워크플로우에서 **APK 를 GitHub release asset 으로 첨부** → 추이 폴링
`gh api repos/dhryoo/solana-cbbtc/releases --jq '.[].assets[] | {name, download_count}'`.
거친 배포 하한선이지만 **공짜·무프라이버시**다. 단 과거 release 엔 소급 데이터 없음.

### Layer 1 — 온체인 활성/리텐션 (진짜 질문 — 단 프라이버시 비용 발생, §3)

솔라나 tx 는 기본적으로 앱-귀속이 안 된다. 귀속하려면 **상수 마커**가 필요하다.

**(a) 태깅 수단**

| 수단                              | 적용                             | 비용                                                                    | 근거                                                                              |
| --------------------------------- | -------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Jupiter **`trackingAccount`**     | 스왑                             | 앱 소유 상수 pubkey 1개를 기존 `/swap` 바디에 추가, **무수수료, 한 줄** | **verified** (jupiter swagger.yaml). pubkey 참조이지 memo 문자열 아님             |
| **SPL Memo** instruction          | 앱이 직접 빌드하는 tx(Kamino·LN) | **0 lamports**, ~40 bytes, ~10–18k CU                                   | CU: 47B memo=18,097 CU **verified**; 0-lamport/40B **likely** (Solana docs)       |
| ~~`feeAccount`/`platformFeeBps`~~ | —                                | **사용자에게 수수료 부과**                                              | **금지**. platformFeeBps>0 강제 **verified** — 무수수료 포지셔닝·가치와 이중 충돌 |

- 앱은 현재 Jupiter `/swap/v1/swap`(완성 tx)을 받아 `VersionedTransaction.deserialize` 한다 (**verified**, `src/services/JupiterService.ts`). → 스왑 태깅은 **trackingAccount 한 줄**이 정석. 완성 tx 에 memo 를 사후 splice 하는 건 ALT decompile/recompile 필요라 **fragile, 비권장**. 멀티홉 스왑 tx 는 1232B 한계 근접이라 memo 직접 추가도 위험.
- Kamino/LN 은 앱이 메시지를 직접 구성 → Memo 추가 여유 충분(**easy**).

**(b) 집계 방법 (오프라인·무백엔드)**

memo *내용*으로 검색하는 RPC 는 없다(RPC·Helius 는 **주소**로만 필터). 따라서:

1. **앵커 계정 방식 (best, easy)** — 모든 앱 tx 가 **상수 앱 소유 앵커 계정**(treasury/PDA/program)도 건드리면, 무료 public-RPC `getSignaturesForAddress(anchor)` 를 `before` 페이지네이션 → 내 볼륨에 한정, **$0·오프라인**. per-signature `memo` 필드로 타입 태그까지 읽음. (Helius 무료키로 rate limit 회피 가능)
2. **인덱서 SQL (fallback)** — memo 만 상수면 Dune/Flipside 무료 에디터에서 `solana.instruction_calls` 를 `executing_account = MemoSq4…` + 태그로 필터, `COUNT(DISTINCT tx_signer)` / GROUP BY / MIN·MAX(block_time). 개발자 도구지 앱 백엔드 아님.
3. **피하기**: 글로벌 Memo program firehose(네트워크 전체 memo), Helius 유료 endpoint.

→ 근거 **verified/likely** (indexer-options 차원). 핵심 함의: **앵커 계정이 이미 있으면 memo 조차 불필요** — RPC 만으로 집계 가능.

---

## 3. 프라이버시 비용 (핵심 가치 판단 — **두현 결정 필요**)

검증된 분석(privacy-precedent 차원):

- 상수 per-user 마커는 "지갑이 존재한다"를 새로 노출하진 않는다(지갑은 이미 모든 tx 에 공개). 그러나 **"지갑 X 가 앱 Y 를 썼다"는 새롭고·영구적이며·열거 가능한 연결**을 만든다. 수동·무비용 관찰자가 **한 쿼리로 전체 유저 명단**을 받아 오프체인 신원(KYC 입금·SNS·소셜 연결 지갑)과 교차할 수 있다.
- 즉 marginal 손실은 **작지 않고 유의미하며 비가역**이다. 익명집합으로 보호되던 유저베이스를 "wallet↔app 조인"으로 열거 가능하게 바꾼다. (정교한 분석가가 cbBTC+Jupiter+모바일 패턴으로 부분 재구성할 수 있던 것을 **"분류기 구축" → "SQL 한 줄"** 로 떨어뜨리고 recall 을 100%로 올린다.)
- 관행: 트레이딩 봇(Trojan·BonkBot)은 fee account 귀속이 비즈니스 모델; Jupiter 는 opt-in + 수수료 결합. **태깅 안 한 Jupiter 스왑은 진짜로 generic.**
- **셀프커스터디/프라이버시 옹호자에게 "지갑은 어차피 공개" 논리는 태깅을 정당화하지 못한다.** 해악은 프라이버시 추구 유저 *전체*를 앱에 영구 연결하는 것이다.

**완화책 — 정직한 순위:**

1. **거친 상수 태그(PII 없음)** — 거의 도움 안 됨. *상수성 자체가 연결성*이라 PII 유무는 부차적.
2. **설정 opt-out** — **opt-IN / 기본 OFF 만 수용 가능**. 기본 ON 은 가장 모르는 유저를 영구 노출하고, 볼륨이 프라이버시-무관 유저로 편향됨.
3. **확률적 샘플링 small-p (0.05~0.1)** — 볼륨 = tagged/p (불편추정). _집계량이 꼭 필요할 때 최선_: 노출 폭을 줄이고 태그 수가 per-user 활동을 거의 안 알려줌. **단 한 번 태그된 지갑은 여전히 영구 노출**(폭은 줄지만 깊이는 아님).

---

## 4. 권고 (검증 기반)

1. **지금**: Layer 0 만 한다 — release 에 APK 첨부 → `download_count`. 무료·무프라이버시, 거친 설치 하한.
2. **사용자별 온체인 태깅은 기본적으로 하지 않는다.** Layer 1 의 활성/리텐션 신호는 프라이버시 비용이 두현의 핵심 가치와 충돌하고 비가역이다.
3. **먼저 A1 을 확인한다** — SKR 보상/dApp Store "quality" 가 _사용자별_ 온체인 지표를 실제로 요구하는가? 앱 자체는 이미 Publisher/App/Release NFT 로 귀속된다(사용자 지갑 미접촉). **요구하지 않으면 태깅은 불필요하고, A3 는 Layer 0 로 종결.**
4. **정말 집계 볼륨이 필요할 때만**(=A1 이 요구): `trackingAccount` 또는 Memo 를 **small-p 샘플링 + opt-in 기본 + 인앱/문서 고지 + no-PII 상수 + feature 별 분리**(BTCfi 활동 cross-feature 클러스터링 방지)로 최소화. **`feeAccount` 절대 금지.**
5. **가치-정합적 대안**: 활성/리텐션의 일부 맹목을 셀프커스터디의 *대가*로 수용하고, **정성 신호**(dApp Store 리뷰·Settings→Feedback 이메일·커뮤니티)로 보완. 이게 두현의 브랜드(self-custody·no-backend)와 가장 일관된다.

---

## 5. 측정 가능/불가능 요약

- **무태깅으로 가능**: 설치 proxy(download_count), 평점·리뷰, 커뮤니티 정성 신호, 앱 자체 귀속(NFT).
- **태깅해야 가능**: 활성 고유 지갑, 리텐션 코호트, feature mix, 거래 볼륨.
- **어느 쪽도 불가**: tx 없는 설치(브라우즈만), 화면 funnel, 서명 전 이탈, 신원.

---

## 6. 구현 스케치 (Layer 1 이 _승인될 경우만_ — 기본 권고는 보류)

- **클라이언트**
    - 스왑: `getSwapTransaction()` POST 바디에 `trackingAccount: APP_TRACKING_PUBKEY`(`src/constants/`). 샘플링이면 확률 p 로만 첨부.
    - Kamino/LN: 앱-빌드 tx 에 상수 Memo instruction(0 lamports). 명시적 CU limit 설정 시 +~15k CU.
    - 샘플링/opt-in 게이트는 **순수함수로 TDD**(`services/`, 90% 커버리지 대상).
- **측정**: 오프라인 `scripts/usage-report.ts`(개발자용, **번들 미포함**) — 앵커 계정 `getSignaturesForAddress` 또는 Dune SQL.
- **고지**: 프라이버시 정책·약관 갱신 + 인앱 명시.
- **절대 금지**: `feeAccount` 태깅 · 기본-ON opt-out · 글로벌 firehose · Helius 유료 endpoint.

---

## 7. 구현 전 검증할 미해결 질문

- **(A1 연계·최우선)** SKR 보상이 사용자별 지표를 요구하는가, 아니면 Publisher/App/Release NFT 귀속으로 충분한가?
- `trackingAccount` 의 정확한 온체인 인코딩(account ref vs memo) — 실제 사용된 Jupiter tx 를 Solscan 에서 확인.
- 무료 호스트 `lite-api.jup.ag` 가 `trackingAccount` 를 존중하는지 테스트 요청으로 검증.
- 실제 cbBTC 스왑 tx 의 바이트 여유(1232B) 실측(`VersionedTransaction.serialize().length`).
- 앱이 이미 **공통 앵커 계정**을 모든 tx 에 두는지 — 두면 memo 불필요, RPC 만으로 집계.
- (샘플링 채택 시) p 값, per-tx vs per-wallet, 고지 문구.

---

## 참고

- 검증 워크플로우: `a3-onchain-measurement-research` (5차원, 2026-06-28). 전체 결과는 워크플로우 출력 참조.
- 정책·프로필: 메모리 `policy_no_backend`, `user_profile`(self-custody 옹호자).
- 백로그: `plan.md` → "적대적 검증 백로그" A3. 이 문서의 결론은 **A1 리서치에 의존**한다.
