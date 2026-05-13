# seeker-btcfi

Solana Seeker 폰을 타겟으로 한 cbBTC 기반 BTCfi 모바일 dApp (MVP).

> 영구 컨텍스트는 [`CLAUDE.md`](./CLAUDE.md), 작업 계획은 [`plan.md`](./plan.md) 참조.

## 핵심 기술 스택

- **React Native + Expo** (dev client, Android 전용)
- **TypeScript** (strict mode)
- **Solana Mobile Wallet Adapter** (Seeker Seed Vault 호환)
- **Jupiter Swap v6** (cbBTC ↔ SOL ↔ USDC)
- **TanStack Query** (서버 상태)
- **NativeWind** (스타일링, M5에서 추가 예정)
- **Jest + @testing-library/react-native**

## 개발 환경 셋업

### 사전 요구사항

- Node.js v20.19+ 또는 v22.13+ (현재 v23도 동작)
- Android Studio (에뮬레이터) 또는 실제 Seeker/Android 디바이스
- Expo dev client 빌드 필수 (MWA는 Expo Go에서 동작 불가)

### 설치

```bash
npm install
cp .env.example .env
# .env 수정 — RPC URL 등
```

### 로컬 개발

```bash
# Metro 번들러 시작 (dev client 모드)
npm start

# Android 디바이스/에뮬레이터에 dev client 빌드 후 실행
npm run android
```

처음 한 번은 dev client 빌드 필요:

```bash
npx expo prebuild           # 네이티브 프로젝트 생성
npx expo run:android        # APK 빌드 + 디바이스에 설치
```

### 테스트

```bash
npm test                    # 전체 테스트
npm run test:watch          # watch 모드
npm run test:coverage       # 커버리지 리포트
```

### 린트 & 포맷

```bash
npm run lint                # ESLint 체크 (4-space, Allman 강제)
npm run lint:fix            # 자동 수정
npm run typecheck           # tsc --noEmit
npm run format              # 비코드 파일은 Prettier, 코드는 ESLint --fix
```

## 코드 스타일 (필수)

- **들여쓰기**: 스페이스 4개
- **중괄호**: Allman (함수 본체는 새 줄)
- **언어**: TypeScript strict, `any` 금지
- **네이밍**: 컴포넌트 `PascalCase.tsx`, 유틸 `camelCase.ts`

자세한 내용은 [`CLAUDE.md §3`](./CLAUDE.md#3-코딩-컨벤션-필수-준수) 참조.

## 빌드 (M6 이후)

```bash
# Release APK (dApp Store 제출용)
eas build --profile production --platform android
```

> ⚠️ **디버그 키로 서명된 APK는 dApp Store 심사에서 거부됩니다.**
> 별도 release keystore가 필요합니다 ([`CLAUDE.md §7`](./CLAUDE.md#7-환경-변수--시크릿) 참조).

## 디렉토리 구조

```
src/
├── components/   # 재사용 가능 컴포넌트
├── screens/      # 화면 단위
├── services/     # 비즈니스 로직 (외부 SDK 호출은 여기서만)
├── hooks/        # React hooks
├── providers/    # Context providers
├── constants/    # mint address, RPC URL 등
├── types/        # 글로벌 TS 타입
├── utils/        # 순수 함수
└── i18n/         # ko.json, en.json
```

## 라이선스

미정 (dApp Store 제출 전 결정).
