# RUNBOOK — Solana cbBTC 인시던트 대응

외부 의존성(cbBTC 발행자·Jupiter·Kamino·Atomiq·Solana RPC)이 흔들릴 때의 대응 절차.
premortem 시나리오 5(외부 의존 무너짐)에 대한 무방비 상태를 메우기 위한 문서.

> 이 문서는 plan.md 의 **D1** 항목 산출물이다. 발견·갱신 시 `적대적 검증 백로그` 섹션과 동기화한다.

---

## 0. 대전제 (먼저 읽을 것)

1. **자금은 항상 사용자 지갑 또는 온체인 컨트랙트에 있다.** 앱은 자금·키를 보유하지 않는다.
   → 앱이 죽거나 우리가 잠수해도 사용자 자금 자체는 안전하다. 우리의 일은
   **"잘못된 행동을 막고(차단), 정확히 고지하는 것"** 이지 자금을 구제하는 게 아니다.
2. **우리에겐 텔레메트리가 없다** (no-backend·no-analytics 정책). 따라서 인시던트 **인지**는
   오직 세 경로뿐이다:
    - (A) 의존성의 공식 채널 (status 페이지 / X / Discord / GitHub)
    - (B) 사용자 제보 (Settings → Feedback 이메일)
    - (C) **우리가 직접 돌리는 점검** — 온체인 조회·엔드포인트 health (아래 §6 체크리스트)
3. 의심스러우면 **"실행 차단 + 솔직한 고지"** 가 항상 옳다. 손해 보는 거래를 통과시키는 것보다
   잠시 기능을 막는 게 낫다.

---

## 1. cbBTC 디페그 / Coinbase 발행 이슈

가장 치명적. 앱 이름·핵심 자산이 cbBTC 하나에 묶여 있어 디페그 헤드라인 한 줄에 신뢰가 탄다.

- **신호**: cbBTC/BTC 가격 괴리(>1~2%), Coinbase 발행/상환 중단 공지, DeFiLlama/오라클 가격 이상,
  Jupiter 라우트에서 비정상 슬리피지, 사용자 "왜 1 cbBTC 가 1 BTC 가 아니냐" 제보.
- **즉시 조치**:
    - 스왑·예치를 **강제로 막지는 않되**(사용자 자산 처분권 존중), 위기 고지 배너로 현황 안내(§5).
    - 디페그 중에는 cbBTC↔USDC/SOL 스왑이 _불리하게_ 체결될 수 있음을 명확히 경고.
    - Kamino 담보(cbBTC) 가치 하락 → 차입 사용자 **청산 위험 급증**. "Health 확인" 을 고지에 포함.
- **복구·해제**: 페그 회복 + 발행자 정상 공지 확인 후 배너 해제.
- **확인처**: coinbase.com/cbbtc, Solscan(cbBTC mint), DeFiLlama cbBTC peg, Coinbase status/X.

## 2. Kamino 중단 · 익스플로잇 · 오라클 스테일

- **신호**: Kamino 공식 채널의 pause/exploit 공지, 예치·차입·상환 트랜잭션 대량 실패,
  앱 내 `oracleStaleHint` 빈발(이미 차입은 오라클 신선할 때만 실행되도록 게이트됨).
- **즉시 조치**:
    - 익스플로잇·pause 정황이면 위기 배너로 **Earn 사용 자제** 안내.
    - 오라클 스테일은 보통 일시적 → 앱이 이미 차입을 막고 재시도 유도. 추가 조치 불필요.
    - **출금**은 사용자 권리이므로 막지 않는다(컨트랙트가 허용하는 한).
- **복구·해제**: Kamino 정상 공지 + 트랜잭션 성공 재현 후 해제.
- **확인처**: app.kamino.finance, Kamino X/Discord, klend-sdk GitHub.

## 3. Jupiter 중단 / 스왑 실패 급증

- **신호**: quote 5xx·rate-limit 급증(`errors.jupiter5xx`/`rateLimit`), 라우트 미발견,
  서명 후 체결 실패 다발.
- **즉시 조치**:
    - 대부분 일시적. 앱이 이미 친절 에러로 안내(재시도 유도) → 추가 조치 보통 불필요.
    - 장기 장애면 위기 배너로 "스왑 일시 지연" 고지.
- **복구·해제**: quote 정상 복귀 확인.
- **확인처**: Jupiter status/X, dev.jup.ag. (호스트: `lite-api.jup.ag`)

## 4. Lightning LP (Atomiq) 다운 / 환불 정체

Labs(실험) 기능이라 영향 범위는 제한적이지만, 자금이 escrow 에 묶일 수 있어 주의.

- **신호**: LP discovery 실패("No intermediary found"), quote 무응답, 결제 후 정산 지연,
  환불 대기(refundable) 누적.
- **즉시 조치**:
    - 자금은 HTLC escrow 에 안전(LP 가 결제 증명 없이는 못 가져감). **앱은 환불 경로를 항상 노출** 중.
    - LP 전면 다운이면 Settings → Labs 토글 **잠정 off 권고**를 위기 배너로 안내.
    - 메모리 `monitoring-triggers`: Atomiq 는 2026-06 교체 검토 대상, Boltz 는 bridge-routed 대안.
- **복구·해제**: LP registry(`nodes.atomiq.exchange`) 재가동 + quote 성공 확인.
- **확인처**: github.com/atomiqlabs, npm @atomiqlabs/sdk, registry-mainnet.json.

## 5. Solana RPC 장애 (Helius + failover)

- **신호**: 잔액·히스토리 로드 실패(`balanceRpc5xx`/`balanceRateLimit`), 전반적 지연.
- **즉시 조치**:
    - 앱에 이미 429/5xx **failover fetch** 가 있음(`makeFailoverFetch`). 보통 자동 흡수.
    - 1차(Helius) 키 소진/장애면 .env RPC 엔드포인트 교체 후 핫픽스 빌드 고려.
- **확인처**: Helius status, status.solana.com.

---

## 6. no-backend 위기 고지 경로 (핵심)

우리는 서버가 없으므로 **push 가 아니라 pull** 로만 사용자에게 닿을 수 있다. 가용 채널:

- **현재 가동 중**: 앱이 켜질 때 GitHub `/releases/latest` 를 pull → `UpdateBanner`.
  (`src/services/UpdateCheckService.ts`)
- **단기 (코드 변경 0, 지금 당장 가능)**:
  핫픽스/패치 **릴리스 노트(body)** 에 advisory 문구를 넣어 배포 → 사용자는 업데이트 배너로 인지.
  단점: 버전 범프가 필요하고, "업데이트 있음" 프레이밍이라 *긴급 공지*엔 둔하다.
- **권장 (후속 설계 — 빌드는 별도 결정)**:
  리포에 정적 `advisory.json` 을 두고 `raw.githubusercontent.com` 에서 fetch → **버전 범프 없이**
  인앱 배너로 즉시 고지. 이 프로젝트는 이미 **LP registry 를 같은 raw 호스트에서 fetch** 하므로
  새 호스트·새 권한·백엔드 없이 정책을 지키며 구현 가능하다. (스키마 예: `{ active, level, ko, en, url }`)
  → 구현 전 사용자 승인 필요. 본 런북에는 "경로가 존재한다" 까지만 확정.

---

## 7. 분기별 사전 점검 체크리스트

인시던트가 터지기 전에 직접 돌리는 점검(텔레메트리 부재 보완):

- [ ] cbBTC 페그 정상(±0.5% 내), 발행자 공지 이상 없음
- [ ] Jupiter quote 1건 성공(SOL↔cbBTC)
- [ ] Kamino 마켓 로드 + 소액 예치/출금 1회 성공
- [ ] (Labs) Atomiq LP discovery + quote 1건 성공, 환불 경로 동작
- [ ] RPC 1차/2차(failover) 모두 응답
- [ ] 의존성 버전 드리프트 확인 (klend-sdk / farms-sdk 핀, @atomiqlabs/sdk, jup 호스트)
- [ ] 메모리 `monitoring-triggers` 표 갱신일 6개월 이내인지

---

## 참고

- 의존성 재평가 트리거 표: 메모리 `reference_monitoring_triggers`
- Phase 3(Lightning) 설계 맥락: 메모리 `project_phase3_design`
- 적대적 검증 백로그(이 런북의 출처): `plan.md` → "적대적 검증 백로그" 섹션
