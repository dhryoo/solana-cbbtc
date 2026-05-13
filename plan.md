# plan.md — Phase 1 작업 계획

**목표**: Solana Seeker 폰을 타겟으로 한 cbBTC 기반 BTCfi dApp MVP를 dApp Store에 제출.

작업은 마일스톤 순서대로 진행. 각 마일스톤이 **완료 조건**을 모두 충족한 뒤에야 다음으로 진행.
체크박스는 작업 완료 시 `[ ]` → `[x]`로 갱신.

진행 상황 한눈에 보기:
- [x] M0: 프로젝트 부트스트랩
- [x] M1: Mobile Wallet Adapter 연결
- [x] M2: cbBTC 잔액 조회
- [x] M3: Jupiter Swap 견적
- [ ] M4: Swap 실행
- [ ] M5: UI 폴리시 & i18n
- [ ] M6: Release APK 빌드
- [ ] M7: dApp Store 제출

---

## M0 — 프로젝트 부트스트랩

**목표**: 빈 RN 프로젝트에 모든 기반 인프라(TS, ESLint, Prettier, Jest, EAS) 셋업.

### 작업 항목
- [x] Expo dev client 프로젝트 생성 (`npx create-expo-app@latest --template`)
- [x] TypeScript strict 모드 활성화 (`tsconfig.json`)
- [x] ESLint 설정 — 4-space indent, Allman 강제 (`@stylistic/brace-style: ["error", "allman"]`)
- [x] Prettier 설정 — ESLint와 충돌하지 않도록 조정 (Prettier는 비코드 파일만 처리, TS/TSX는 ESLint --fix가 담당; Prettier가 Allman 미지원이므로 분리)
- [x] Jest 설정 (`jest`, `jest-expo`, `@testing-library/react-native`)
- [x] 디렉토리 구조 생성 (`src/{components,screens,services,hooks,providers,constants,types,utils,i18n}`)
- [x] Git 초기화 + `.gitignore` (node_modules, .env, *.keystore, eas-build-* 포함) — create-expo-app이 git init 수행
- [x] EAS CLI 설치 + `eas.json` (`eas init`은 인증 필요로 보류, eas.json 수동 작성)
- [x] `README.md` 초안 (프로젝트 설명, 개발 환경 셋업 명령어)
- [x] 스모크 테스트 1개 작성 — `__tests__/smoke.test.ts`

### 완료 조건
- [x] `npx expo start --dev-client`로 빈 화면이 Android 디바이스/에뮬레이터에서 표시됨 (Seeker 실기 검증 완료)
- [x] `npm test`가 0개 실패로 통과 (2/2 passing)
- [x] `npm run lint`가 0개 에러로 통과
- [x] `npm run typecheck` 0개 에러 (보너스)

### 산출물
- 부트스트랩된 프로젝트 디렉토리 ✅
- 첫 커밋: `chore: bootstrap project` → **사용자 확인 후 커밋 예정 (현재 staged 상태)**

### M0 노트
- Expo SDK 54 / React 19.1 / RN 0.81
- ESLint v8.57.1 + @stylistic/eslint-plugin v2 + @typescript-eslint v7 (legacy .eslintrc.js)
- Allman 자동 수정 검증 완료: `function foo() {` → `function foo()\n{` 자동 변환 동작
- Prettier는 Allman 미지원 → .prettierignore에 *.ts/tsx/js/jsx 제외, ESLint가 코드 포매팅 담당
- `eas init` 미실행 (Expo 계정 로그인 필요) — M6 빌드 직전에 `npx eas init` + `npx eas login` 수행 필요
- `expo-dev-client` 설치 + `expo prebuild` 완료 (android/ 디렉토리 생성, gitignore에 포함)
- `app.json`: android.package = "com.seekerbtcfi.app" (dApp Store 영구 식별자, 첫 release 전 변경 가능)
- Seeker 실기에서 dev client APK 빌드 + 설치 + bootstrap 화면 표시 검증 완료
- 미커밋 상태 — M1 종료 후 사용자 승인 받고 일괄 커밋 예정

---

## M1 — Mobile Wallet Adapter 연결

**목표**: Seeker Seed Vault Wallet에 연결 → publicKey 화면에 표시 → 연결 해제.

### 작업 항목
- [x] 패키지 설치
    - [x] `@solana-mobile/mobile-wallet-adapter-protocol` v2.2.8
    - [x] `@solana-mobile/mobile-wallet-adapter-protocol-web3js` v2.2.8
    - [x] `@solana/web3.js` v1.98.4
    - [x] `react-native-get-random-values` v1.11
    - [x] `buffer` polyfill 설정 (index.ts에서 global.Buffer 주입)
    - [x] `@react-native-async-storage/async-storage` v2.2 (authToken 영속화)
- [x] `src/services/WalletService.ts` 작성 (TDD)
    - [x] `connect(): Promise<ConnectedAccount>` (publicKey, authToken, walletUriBase)
    - [x] `reconnect(authToken): Promise<ConnectedAccount>`
    - [x] `disconnect(authToken): Promise<void>`
    - [x] `signAndSendTransactions(txs, authToken): Promise<string[]>` (reauthorize 후 서명/전송)
- [x] `src/providers/WalletProvider.tsx` 작성
    - [x] 상태 머신: idle / restoring / connecting / connected / disconnecting / error
    - [x] connect/disconnect 액션 (memoized)
    - [x] AsyncStorage로 authToken 영속화 + 시작 시 자동 reauthorize + 토큰 회전 처리
- [x] `src/hooks/useWallet.ts` 작성 (provider 밖 사용 시 명확한 에러)
- [x] `src/components/WalletButton.tsx` 작성
- [x] `src/screens/HomeScreen.tsx` — WalletButton + 연결된 pubkey 전체 표시 (selectable)
- [x] App.tsx 리팩토링: WalletProvider로 감싸고 HomeScreen 호출

### 테스트 요구사항
- [x] `WalletService.test.ts` — 8 tests (connect/reconnect/disconnect/sign), 100% coverage
- [x] `WalletProvider.test.tsx` — 8 tests (restoring, connect, disconnect, 에러 경로, 토큰 회전, provider 밖 hook 호출)
- [x] `authStorage.test.ts` — 5 tests (저장/로드/정리/에러 복구)
- [x] `format.test.ts` — 2 tests (shortenAddress)

### 완료 조건
- [x] 실제 Seeker 폰에서 "지갑 연결" 버튼 → Seed Vault 시트 → 승인 → publicKey 표시 (실기 검증 완료)
- [x] 앱 재시작 후 연결 상태 유지 (실기 검증 완료)
- [x] "연결 해제" 버튼 작동 (실기 검증 완료)
- [x] 테스트 커버리지: WalletService 100% (목표 80% 초과)

### M1 노트
- 26 tests passing, lint+typecheck green, coverage 76.66% 전체 (services 100%, providers 88.88%)
- MWA 2.0 spec 사용: `authorize({ chain: "solana:mainnet", identity })`. deprecated `cluster` 파라미터 미사용.
- `Account.address`는 base64. PublicKey 변환은 WalletService 내부에서 처리.
- `jest.setup.js`에 AsyncStorage 공식 mock 등록. `transformIgnorePatterns`에 ESM 의존성(uuid, rpc-websockets 등) 추가.
- jest 테스트의 mock factory에서 `as unknown as Web3MobileWallet` 캐스팅 사용 (any 회피).
- 신규 native 모듈 추가됐으므로 사용자가 검증 전 다음 절차 필요:
    1. `npx expo prebuild --platform android --clean` (autolink 재실행)
    2. `npx expo run:android --device` (APK 재빌드 + 설치)

### 참고
- Solana Mobile RN 가이드: https://docs.solanamobile.com/react-native/quickstart
- 예제 저장소: `solana-mobile/solana-mobile-stack-sdk`

---

## M2 — cbBTC 잔액 조회

**목표**: 연결된 지갑의 cbBTC 잔액을 화면에 표시. Pull-to-refresh 가능.

### 작업 항목
- [x] `@solana/spl-token` v0.4.14 설치
- [x] `@tanstack/react-query` v5.10 설치 + `QueryProvider` 셋업
- [x] `src/constants/tokens.ts` 작성
    - [x] **cbBTC mint address 검증**: `cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij` — mainnet RPC `getTokenSupply`로 on-chain 확인 (decimals=8, total supply 3335 cbBTC, 2026-05-13 시점)
    - [x] SOL, WSOL, USDC mint 포함
    - [x] 토큰 메타데이터 (symbol, name, decimals, isNative) 포함
- [x] `src/services/TokenService.ts` 작성 (TDD)
    - [x] `getTokenBalance(connection, owner, mint, decimals)` → `{ amount: bigint, uiAmount: number, decimals }`
    - [x] `getSolBalance(connection, owner)` (네이티브 SOL은 getBalance)
    - [x] ATA 미존재 시 `TokenAccountNotFoundError` catch → 0 반환
- [x] `src/providers/ConnectionProvider.tsx` 추가 (Connection 싱글톤, env 기반)
- [x] `src/hooks/useTokenBalance.ts` — TanStack Query 래핑, 토큰 native 여부 분기
- [x] `src/components/BalanceCard.tsx` — 아이콘 + 심볼 + 잔액, 로딩 spinner + 에러 표시
- [x] `src/utils/format.ts`에 `formatTokenAmount` 추가 — 토큰 decimals 상한 + 뒤 0 trim
- [x] HomeScreen에 SOL + cbBTC BalanceCard, `ScrollView + RefreshControl`로 pull-to-refresh
- [x] App.tsx: `QueryProvider > ConnectionProvider > WalletProvider > HomeScreen`

### 테스트 요구사항
- [x] `TokenService.test.ts` — 7 tests (정상 ATA, ATA 미존재, RPC 에러, 대규모 amount, SOL 0/일반/에러)
- [x] `format.test.ts` — formatTokenAmount 케이스 5개 추가
- [ ] `useTokenBalance` hook integration test (React Query 자체 mock 복잡 — TokenService 100% 커버로 대체)

### 완료 조건
- [x] 잔액이 있는 지갑 연결 시 "0.00012345 cbBTC" 형식으로 표시 (실기 검증 완료)
- [x] 잔액 0/ATA 미존재 시 "0 cbBTC" 표시 (에러 없음) (실기 검증 완료)
- [x] Pull-to-refresh로 새로고침 가능 (실기 검증 완료)
- [x] 로딩 중 ActivityIndicator 표시

### M2 노트
- 38 tests passing, lint+typecheck green, services 100% coverage
- 새 패키지는 모두 pure JS (`@solana/spl-token`, `@tanstack/react-query`) → **APK 재빌드 불필요**, Metro reload만으로 검증 가능
- 토큰 잔액은 `staleTime: 30s, gcTime: 5m`. Pull-to-refresh가 즉시 invalidate.
- formatTokenAmount는 최대 8 decimals (cbBTC 정밀도) 상한. SOL 9 decimals도 8로 자름 (사실상 영향 없음, 0.000000001 lamport는 표시 X).
- ConnectionProvider는 env `EXPO_PUBLIC_SOLANA_RPC_URL` 미설정 시 public mainnet RPC fallback. 개발 중 rate limit 시 .env에 Helius/QuickNode 키 설정 권장.
- **이슈/수정**: 최초 reload 시 "ReferenceError: Property 'Buffer' doesn't exist" 발생. 원인: `index.ts` 안에서 import 사이에 끼워둔 `global.Buffer = Buffer` 할당이 호이스트된 다른 import보다 늦게 실행됨. **해결**: polyfill을 별도 파일 `polyfills.ts`로 분리하고 `index.ts`에서 첫 줄에 `import "./polyfills"`로 호출. 이후 web3.js 트리 평가 시점에 Buffer가 이미 global에 존재.

---

## M3 — Jupiter Swap 견적 조회

**목표**: SOL ↔ cbBTC swap 견적을 입력에 따라 실시간 표시.

### 작업 항목
- [x] `src/types/jupiter.ts` — QuoteResponse / QuoteParams / JupiterApiError 정의 (사용 필드만 보수적으로 선언)
- [x] `src/services/JupiterService.ts` (TDD)
    - [x] `getQuote(params)` — `https://lite-api.jup.ag/swap/v1/quote` 호출
    - [x] 입력 검증 (amount > 0, 다른 mints, slippageBps 0~10000)
    - [x] 에러 처리 (네트워크 throw 그대로 propagate, 4xx/5xx → `JupiterApiError` with status)
- [x] `src/hooks/useDebouncedValue.ts` — 일반 디바운스 훅
- [x] `src/hooks/useSwapQuote.ts` — TanStack Query 래핑, 300ms 디바운스, 네이티브 SOL은 wSOL mint로 라우팅
- [x] `src/components/QuoteDisplay.tsx`
    - [x] 예상 수령량 (rawAmount → uiAmount 변환)
    - [x] 가격 영향 (priceImpactPct → %)
    - [x] 슬리피지 chip selector (0.1% / 0.5% / 1% — 10/50/100 bps)
    - [x] 라우트 hop 수 + DEX 이름 시퀀스 (예: "Whirlpool → BisonFi")
    - [x] 최소 수령량 (otherAmountThreshold)
- [x] `src/screens/SwapScreen.tsx` — 입력 카드 + 방향 전환 버튼 + 출력 카드 + QuoteDisplay + Swap 버튼(M4 비활성)
- [x] `src/screens/AppShell.tsx` — 간단한 state-based bottom tab (자산 ↔ Swap)
- [x] App.tsx: AppShell로 교체 (HomeScreen은 자산 탭으로 이동)
- [x] `src/utils/format.ts`에 `parseTokenAmount`, `formatRawAmount` 추가

### 테스트 요구사항
- [x] `JupiterService.test.ts` — 9 tests (정상, URL params, bigint 직렬화, 0 amount 거부, 동일 mint 거부, slippage 범위, 4xx, 5xx, 네트워크)
- [x] `format.test.ts` — parseTokenAmount 5개, formatRawAmount 2개 추가
- [ ] `useSwapQuote` hook debounce 테스트 — useDebouncedValue 자체는 useEffect+setTimeout 단순 구조, JupiterService 100% 커버 + 컴포넌트 통합 검증으로 대체

### 완료 조건
- [x] 0.01 SOL 입력 시 cbBTC 예상 수령량이 1초 이내에 표시됨 (실기 검증 완료)
- [x] 토큰 방향 전환 버튼 (↕) 작동 (실기 검증 완료)
- [x] 잘못된 입력은 enabled=false로 차단 (parseTokenAmount null이면 query 비활성)
- [x] 견적 stale 시 ActivityIndicator 표시 (useQuery isFetching 처리)

### M3 노트
- 53 tests passing, lint+typecheck green
- JupiterService 88.46% lines / TokenService 100% / WalletService 100% / format 91.3% / authStorage 100%
- Jupiter API mainnet 직접 호출 검증: 0.01 SOL → 1175 sat cbBTC (≈$0.95, Whirlpool→BisonFi 2-hop)
- 네이티브 SOL → swap 경로에서는 wSOL mint (`So11111...112`)로 자동 매핑 (Jupiter 표준)
- 네비게이션은 의도적으로 react-navigation 미도입 — 화면 2개라 useState 토글로 충분. M5 UI 폴리시에서 재검토.
- Swap 실행 버튼은 disabled 상태로 노출 (M4에서 활성화). 사용자가 화면 흐름을 미리 인지하도록.
- 신규 패키지 없음. Pure JS 추가만 → Metro reload로 검증 가능, APK 재빌드 불필요.

---

## M4 — Swap 실행

**목표**: 견적 조회 후 실제 트랜잭션을 전송하고 결과 확인.

### 작업 항목
- [ ] `JupiterService.getSwapTransaction(quote, userPublicKey): Promise<VersionedTransaction>` 추가
    - [ ] `/swap/v1/swap` endpoint 호출
    - [ ] 응답의 `swapTransaction` base64 → `VersionedTransaction.deserialize()`
- [ ] `WalletService.signAndSendTransactions`와 통합
- [ ] `src/hooks/useSwap.ts` 작성
    - [ ] mutation으로 swap 실행
    - [ ] 성공 시 잔액 query invalidate (자동 갱신)
- [ ] SwapScreen에 "Swap" 버튼 추가
    - [ ] 견적 없으면 disabled
    - [ ] 클릭 시 confirmation modal (수령량, 슬리피지, 수수료 요약)
    - [ ] 진행 중 로딩 인디케이터
- [ ] 성공/실패 후 사용자 피드백
    - [ ] 성공: 트랜잭션 시그니처 + Solscan 링크 표시
    - [ ] 실패: 사용자가 이해 가능한 한국어 에러 메시지 (insufficient balance, slippage exceeded 등)

### 테스트 요구사항
- [ ] `JupiterService.getSwapTransaction` unit test
- [ ] `useSwap` mutation 성공/실패 시나리오
- [ ] **mainnet에서 소액 실거래 테스트** (0.01 SOL → cbBTC) — 수동, 결과 캡처

### 완료 조건
- 실제 Seeker 폰에서 0.01 SOL → cbBTC swap 성공
- 트랜잭션 후 잔액 자동 갱신 확인
- 슬리피지 초과 시 명확한 에러 표시
- 사용자가 트랜잭션을 거부했을 때 적절한 처리

### 주의
- 첫 실거래 전 반드시 devnet에서 동일 플로우 테스트 (Jupiter devnet 지원 확인 필요)
- 실패 가능성 있으므로 **소액(0.01 SOL 이하)으로 시작**

---

## M5 — UI 폴리시 & 한국어 i18n

**목표**: 실사용 가능한 수준의 UI/UX. 한국어 1차 지원.

### 작업 항목
- [ ] NativeWind 도입 및 설정
- [ ] 디자인 토큰 정의 (`src/constants/theme.ts`) — 색상, 폰트, 간격
- [ ] 다크모드 지원 (`useColorScheme`)
- [ ] i18next + react-i18next 설치
    - [ ] `src/i18n/ko.json`, `src/i18n/en.json`
    - [ ] 디바이스 로케일 자동 감지
    - [ ] 설정 화면에서 수동 전환 가능
- [ ] 일관된 로딩/에러/빈 상태 컴포넌트 (`LoadingView`, `ErrorView`, `EmptyView`)
- [ ] 모든 하드코딩 문자열을 i18n으로 이동
- [ ] 아이콘 통일 (lucide-react-native 또는 expo-symbols)
- [ ] Safe area 처리 (`react-native-safe-area-context`)
- [ ] 햅틱 피드백 (성공 시 light, 실패 시 error)

### 완료 조건
- 모든 텍스트가 한국어/영어 전환 가능
- 다크/라이트 모드 토글 작동 및 시스템 설정 반영
- 모든 화면에 로딩/에러 상태 처리됨
- 스플래시 스크린 + 앱 아이콘 적용

### 산출물
- 한국어 모드 스크린샷 (HomeScreen, SwapScreen)
- 영어 모드 스크린샷 (HomeScreen, SwapScreen)
- 다크모드 스크린샷

---

## M6 — Release APK 빌드

**목표**: dApp Store 제출 가능한 signed release APK 확보.

### 작업 항목
- [ ] **dApp Store 전용 keystore 생성** (Google Play 키와 분리 필수)
    - [ ] `keytool -genkey -v -keystore seeker-btcfi-release.keystore ...`
    - [ ] keystore 비밀번호 + key alias를 1Password에 저장
    - [ ] keystore 파일을 외장 저장소에 백업 (분실 시 영원히 업데이트 불가)
- [ ] `eas.json`의 production 프로파일 설정
    - [ ] 자체 keystore 사용 (`credentialsSource: "local"`)
    - [ ] `buildType: "apk"` (aab 아님)
    - [ ] versionCode 1, versionName 0.1.0
- [ ] `eas build --profile production --platform android`
- [ ] 빌드된 APK 다운로드
- [ ] **실제 Seeker 폰에 sideload 설치 후 전체 플로우 테스트**
    - [ ] 지갑 연결
    - [ ] 잔액 조회
    - [ ] 견적 조회
    - [ ] 소액 swap 실행
    - [ ] 한국어/영어 전환
    - [ ] 다크모드 전환
    - [ ] 앱 재시작 후 상태 복원

### 완료 조건
- 서명된 release APK 파일 (`.apk`) 확보
- 실기에서 위 모든 시나리오 정상 작동
- keystore 백업 2곳 이상 (1Password + 물리적 저장)
- 빌드 재현 가능 (동일 keystore로 versionCode 증가 시 재빌드 성공)

### 주의
- **디버그 키로 서명된 APK는 dApp Store 심사에서 거부됨**
- versionCode는 단조 증가 (이후 업데이트 시 항상 +1)

---

## M7 — dApp Store 제출

**목표**: Publisher Portal에 첫 release 제출 → 리뷰 대기.

### 사전 준비 (이미 완료된 항목)
- [x] Publisher Portal 가입
- [x] KYC 완료
- [ ] Publisher 지갑 준비 (별도 데스크탑 확장 지갑, ~0.2 SOL 충전)

### 작업 항목
- [ ] 앱 메타데이터 작성
    - [ ] 이름 (예: "Seeker BTCfi" — 사용자와 확정)
    - [ ] short_description (80자 이내)
    - [ ] long_description (4000자 이내, 한국어/영어)
    - [ ] 카테고리: DeFi 또는 Finance
    - [ ] 키워드: bitcoin, defi, swap, cbbtc, solana
- [ ] 시각 자산 제작
    - [ ] 아이콘 512x512 PNG
    - [ ] 배너 1200x600 PNG
    - [ ] (선택) Feature graphic 1200x1200 PNG
    - [ ] 스크린샷 최소 4장 (1920x1080, 한국어 UI 권장)
    - [ ] (선택) 프로모션 비디오
- [ ] privacy_policy_url, license_url 호스팅
    - [ ] 임시로 GitHub Pages 또는 Notion public page도 가능
- [ ] Publisher Portal에서 "Add a dApp → New dApp"
- [ ] Top Up Balance로 Arweave 업로드 비용 충전
- [ ] APK 업로드 + 메타데이터 입력
- [ ] Publisher / App / Release NFT 민팅 (모든 서명 요청 승인)
- [ ] 제출 완료 후 status 확인

### 완료 조건
- 제출 status가 "Under Review"
- 리뷰 결과 통보 이메일 수신 (영업일 2~5일)
- 승인 시: dApp Store에 노출 확인
- 거부 시: 피드백을 plan.md에 기록 후 수정 사항 작업

---

## 작업 중 이슈 트래킹

작업 중 발생한 블로커, 결정 변경, 디자인 노트는 아래에 기록:

```
[YYYY-MM-DD] M2: cbBTC mint address 확인 — 0x... (Solscan 링크)
[YYYY-MM-DD] M4: devnet에서 Jupiter 미지원 확인, mainnet 소액 테스트로 진행
```

(작업 진행하면서 추가)

---

## Phase 1 종료 후 검토 항목

M7 제출 완료 후 다음 항목 회고:

- [ ] 코드베이스가 CLAUDE.md 컨벤션을 100% 준수하는가
- [ ] 테스트 커버리지 목표(70%+) 달성했는가
- [ ] 리뷰 피드백을 모두 반영했는가
- [ ] keystore 백업이 안전한가
- [ ] 다음 Phase 2 후보 기능 정리 (Kamino lending, LN 결제, etc.)
