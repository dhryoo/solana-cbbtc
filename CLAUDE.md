# CLAUDE.md — Seeker BTCfi dApp 프로젝트 컨텍스트

이 파일은 Claude Code가 이 프로젝트에서 작업할 때 항상 참고해야 하는 영구 컨텍스트입니다.
구체적인 작업 단계는 `plan.md`를 따릅니다.

---

## 1. 프로젝트 개요

**프로젝트명**: (임시) `seeker-btcfi` — 실제 이름은 첫 커밋 전에 사용자와 함께 결정

**한 줄 정의**: Solana Seeker 폰을 타겟으로 하는 cbBTC 기반 BTCfi 모바일 dApp MVP.

**최종 목표**:
1. Solana dApp Store에 quality app으로 등록
2. 향후 SKR 개발자 보상 자격 확보 (Season 1 기준 1인당 750,000 SKR)
3. cbBTC를 핵심 자산으로 다루는 모바일 네이티브 경험 제공

**비목표 (out of scope)**:
- Zeus Network / zBTC 통합 (인수 후 불안정 상태로 향후 6개월 관찰 후 재검토)
- iOS 지원 (Seeker는 Android 전용)
- 자체 토큰 발행
- 복잡한 DeFi 전략 (lending, leverage 등은 Phase 2 이후)

---

## 2. 핵심 기술 결정 & 근거

| 결정 | 선택 | 근거 |
|---|---|---|
| 핵심 자산 | **cbBTC** | Coinbase 발행, Solana에서 시총 $346M+, Jupiter/Kamino/Drift 통합 완료, 5년 후 생존 가능성 가장 높음 |
| 프레임워크 | **React Native + Expo (dev client)** | 빠른 MVP, Solana Mobile RN SDK 공식 지원, EAS Build로 APK 생성 용이 |
| 언어 | **TypeScript (strict mode)** | 타입 안정성, Solana SDK들이 TS 우선 지원 |
| 지갑 연동 | **Mobile Wallet Adapter (MWA)** | Seeker Seed Vault 공식 프로토콜, Android intent 기반 |
| Swap | **Jupiter v6 API** | Solana 최대 aggregator, REST API로 SDK 의존성 최소화 |
| 상태 관리 | **TanStack Query + React Context** | 서버 상태와 클라이언트 상태 분리 |
| 스타일링 | **NativeWind** | Tailwind 익숙도 + RN 호환 |
| 테스트 | **Jest + @testing-library/react-native** | 표준, Doohyun TDD 워크플로우와 부합 |
| i18n | **i18next + react-i18next** | 한국어 1차 + 영어 |

**Expo Go가 아닌 dev client를 쓰는 이유**: MWA는 네이티브 Android intent에 의존하므로 Expo Go에서 동작 불가. `expo prebuild` 또는 development build 필요.

---

## 3. 코딩 컨벤션 (필수 준수)

이 컨벤션은 협상 불가합니다. 모든 새 코드와 수정 코드에 적용.

### 들여쓰기 & 포맷
- **들여쓰기: 스페이스 4개** (탭 금지)
- **중괄호: Allman 스타일** — 중괄호를 새 줄에 놓음

```typescript
// 올바른 예
function getBalance(pubkey: PublicKey): Promise<number>
{
    if (!pubkey)
    {
        throw new Error("pubkey required");
    }
    return connection.getBalance(pubkey);
}

// 잘못된 예 (K&R 스타일)
function getBalance(pubkey: PublicKey): Promise<number> {
    if (!pubkey) {
        throw new Error("pubkey required");
    }
    return connection.getBalance(pubkey);
}
```

JSX의 경우 React 관례상 Allman을 강제하기 어려운 부분(return 문 등)은 가독성을 우선시함. 단, 컴포넌트 함수 본체와 일반 함수는 반드시 Allman.

### TypeScript
- `strict: true` 필수
- `any` 사용 금지 (불가피한 경우 `unknown` + 타입 가드)
- 외부에 export되는 모든 함수/컴포넌트는 명시적 반환 타입
- Props/State 인터페이스는 컴포넌트 파일 내 정의

### 네이밍
- 파일명: `PascalCase.tsx` (컴포넌트), `camelCase.ts` (유틸/서비스)
- 컴포넌트: PascalCase
- 함수/변수: camelCase
- 상수: UPPER_SNAKE_CASE
- 타입/인터페이스: PascalCase, `I` prefix 사용 안 함

### 주석
- 한국어 주석 OK
- WHY를 설명 (WHAT은 코드가 설명)
- TODO/FIXME는 이슈 번호 또는 plan.md 마일스톤 참조

### 커밋 메시지
- Conventional Commits 형식 (영문)
- 예: `feat(swap): add Jupiter quote service`, `test(wallet): cover MWA connection edge cases`

---

## 4. 테스트 전략 (TDD 필수)

Kent Beck의 Red-Green-Refactor 사이클을 모든 비즈니스 로직에 적용:

1. **Red**: 실패하는 테스트 먼저 작성
2. **Green**: 테스트를 통과시키는 최소 코드 작성
3. **Refactor**: 테스트가 녹색인 상태에서 정리

### 테스트 우선순위
1. **services/** 디렉토리의 모든 함수는 unit test 필수 (외부 의존성 mock)
2. **hooks/** 디렉토리의 hook은 통합 test 권장
3. **components/** 는 핵심 인터랙션만 (스냅샷 테스트는 지양)
4. **screens/** 는 smoke test 수준

### Mock 전략
- Solana RPC는 `@solana/web3.js`의 `Connection`을 mock
- Jupiter API는 `fetch` mock 또는 MSW 사용
- MWA는 인터페이스 추상화 후 mock 구현 주입

### 커버리지 목표
- services/: 90%+
- hooks/: 80%+
- 전체: 70%+

---

## 5. 파일 구조

```
project-root/
├── CLAUDE.md           # 이 파일 (영구 컨텍스트)
├── plan.md             # 작업 진행 추적
├── README.md           # 외부 공개용
├── package.json
├── tsconfig.json
├── .eslintrc.js        # 4-space, Allman 강제
├── .prettierrc
├── jest.config.js
├── app.json            # Expo config
├── eas.json            # EAS Build config
├── babel.config.js
├── src/
│   ├── components/     # 재사용 가능 컴포넌트 (Stateless 우선)
│   ├── screens/        # 화면 단위 (HomeScreen, SwapScreen)
│   ├── services/       # 비즈니스 로직 / 외부 API 래퍼
│   │   ├── JupiterService.ts
│   │   ├── TokenService.ts
│   │   └── WalletService.ts
│   ├── hooks/          # React hooks
│   ├── providers/      # Context providers
│   ├── constants/      # mint addresses, RPC URLs 등
│   ├── types/          # 글로벌 TS 타입
│   ├── utils/          # 순수 함수 유틸
│   └── i18n/           # 번역 리소스 (ko.json, en.json)
├── __tests__/          # 또는 src/**/__tests__/ 공존
└── assets/             # 이미지, 폰트, 아이콘
```

**모듈화 원칙**: 각 서비스 파일은 단일 책임. 외부 SDK 호출은 반드시 services/ 안에서만. 컴포넌트가 `@solana/web3.js`를 직접 import하면 안 됨.

---

## 6. 외부 의존성 & 레퍼런스

작업 전 항상 최신 공식 문서를 먼저 확인할 것 (버전이 바뀌었을 수 있음).

| 항목 | URL |
|---|---|
| Solana Mobile 공식 문서 | https://docs.solanamobile.com |
| Solana Mobile RN 가이드 | https://docs.solanamobile.com/react-native/quickstart |
| Mobile Wallet Adapter spec | https://docs.solanamobile.com/mobile-wallet-adapter/overview |
| Solana web3.js | https://solana.com/docs/clients/javascript |
| Jupiter API 문서 | https://dev.jup.ag |
| Jupiter Swap v6 | https://dev.jup.ag/docs/apis/swap-api |
| cbBTC 정보 | https://www.coinbase.com/cbbtc |
| dApp Publishing 가이드 | https://docs.solanamobile.com/dapp-publishing/overview |
| EAS Build | https://docs.expo.dev/build/introduction |

**확인 필요한 상수** (작업 시작 시 최신값 검증):
- cbBTC mint address (Solana mainnet) — Solscan에서 "cbBTC" 검색하여 verified mint 확인
- Solana RPC endpoint — Helius 또는 QuickNode 무료 티어 키 발급 권장
- Jupiter API base URL — 현재 `https://lite-api.jup.ag` (rate-limited 무료) 또는 `https://api.jup.ag` (인증 필요)

---

## 7. 환경 변수 & 시크릿

`.env` 사용. `.gitignore`에 반드시 포함.

```
EXPO_PUBLIC_SOLANA_RPC_URL=https://...
EXPO_PUBLIC_JUPITER_API_BASE=https://lite-api.jup.ag
```

**절대 금지**:
- 시드 구문, 프라이빗 키를 코드/저장소에 하드코딩
- API 키를 클라이언트 번들에 노출 (`EXPO_PUBLIC_` 접두사는 노출됨을 의식)
- keystore 파일을 git에 커밋

**keystore 관리**:
- dApp Store 전용 새 keystore 생성 (Google Play 키와 분리 필수)
- 1Password 또는 물리적 백업 2곳 이상에 보관
- 분실 시 앱 업데이트 영원히 불가

---

## 8. 빌드 & 배포

### 로컬 개발
```bash
npx expo start --dev-client
# Android 디바이스 연결 후 dev client 앱에서 스캔
```

### Release APK 빌드
```bash
eas build --profile production --platform android
```

`eas.json`에서 production 프로파일은 반드시 release keystore 사용. 디버그 키로 빌드된 APK는 dApp Store 심사 거부됨.

### dApp Store 제출 흐름
1. release APK 빌드 완료
2. Publisher Portal (`publish.solanamobile.com`) 로그인
3. publisher 지갑은 **Seeker 폰 기본 지갑이 아닌 별도 데스크탑 확장 지갑** (가급적 Ledger 연결)
4. "Add a dApp → New dApp" → 메타데이터 입력
5. APK 업로드 → Publisher/App/Release NFT 자동 민팅
6. 제출 → 영업일 기준 2~5일 리뷰 대기

---

## 9. 주의사항 (Gotchas)

작업 중 자주 발생하는 함정들. 코드 작성 전 한 번 더 확인할 것.

1. **Expo Go에서 MWA가 작동하지 않음**. 반드시 dev client 또는 prebuild 후 native 빌드.
2. **MWA는 Android 전용**. iOS 시뮬레이터/디바이스에서 테스트 불가. 반드시 실제 Android 디바이스 또는 에뮬레이터.
3. **Seeker Seed Vault는 MWA 프로토콜을 통해 접근**. 별도 SDK가 아니라 표준 MWA 호출로 동일하게 동작.
4. **Jupiter swap-transaction이 반환하는 트랜잭션은 versioned transaction (v0)**. legacy transaction으로 처리하면 실패. `VersionedTransaction.deserialize()` 사용.
5. **dApp Store는 디버그 서명 APK를 거부**. release keystore로 서명된 APK만 가능.
6. **cbBTC 잔액 조회 시 ATA(Associated Token Account)가 없으면 0이 아니라 에러 가능**. `getAccount` 호출 전 ATA 존재 여부 확인 또는 try-catch로 0 반환.
7. **Solana RPC 무료 티어는 rate limit이 있음**. 개발 중에는 Helius/QuickNode 키 사용 권장.
8. **트랜잭션 시뮬레이션 실패가 곧 실패가 아닐 수 있음** (compute budget 등). 실제 send 후 결과 확인.

---

## 10. 작업 진행 방식

1. 새 작업 시작 시 `plan.md`의 다음 미완료 마일스톤 확인
2. 해당 마일스톤의 작업 항목을 순서대로 진행
3. 각 항목 완료 시 `plan.md`에서 체크박스 갱신 (`[ ]` → `[x]`)
4. 마일스톤 완료 시 "완료 조건"을 모두 충족했는지 확인 후 다음 마일스톤으로
5. 막히는 부분이 있으면 plan.md에 `BLOCKED:` 노트 추가 후 사용자에게 보고

**막혔을 때 행동 규칙**:
- 외부 API/SDK 동작이 문서와 다를 때: 임의 추측 금지, 공식 문서 또는 GitHub issue 검색 후 보고
- 설계 결정이 필요할 때: 옵션 2~3개를 정리해서 사용자에게 질문
- 컨벤션이 명확하지 않을 때: 이 파일을 업데이트하고 사용자 확인 받기
