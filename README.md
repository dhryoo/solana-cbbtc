# Solana cbBTC

Mobile-native BTCfi dApp for the [Solana Seeker](https://solanamobile.com/seeker) phone.
Hold and swap **cbBTC** (Coinbase Wrapped BTC on Solana) directly from your phone, with
Mobile Wallet Adapter and Seed Vault hardware-backed signing.

> Status: **Phase 1 MVP feature-complete.** Pending [Solana dApp Store](https://docs.solanamobile.com/dapp-publishing/overview) submission.

## Features

- **cbBTC ↔ SOL swaps** via [Jupiter v6](https://dev.jup.ag) (versioned transactions, dynamic priority fees with cap)
- **Mobile Wallet Adapter** — works with any MWA-compatible wallet (Phantom, Solflare, Backpack) and Seeker's Seed Vault
- **Seeker awareness** — detects Seeker hardware + Solana Mobile Genesis Token, shows "Hardware secured" indicator
- **App Lock** — biometric / device PIN gate on app open and from background (opt-in)
- **Offline handling** — global banner, action blocking, explicit empty states (no stuck spinners)
- **Localized** — Korean (primary) + English
- **Theme** — light / dark / system
- **Push notifications** for swap completion (opt-in)
- **Share swap result** to any system Share target

## Tech Stack

- React Native + [Expo SDK 54](https://docs.expo.dev/) (dev client, Android only)
- TypeScript strict
- Mobile Wallet Adapter ([`@solana-mobile/mobile-wallet-adapter-protocol`](https://docs.solanamobile.com/mobile-wallet-adapter/overview))
- [`@solana/web3.js`](https://solana.com/docs/clients/javascript) + [`@solana/spl-token`](https://github.com/solana-labs/solana-program-library/tree/master/token/js)
- TanStack Query (server state) + React Context (UI state)
- i18next + react-i18next
- `expo-network` for connectivity, `expo-local-authentication` for biometrics

## Prerequisites

- Node.js **v20.19+** or **v22.13+**
- Java 17 + Android SDK (via Android Studio)
- A real Android device or emulator — **MWA does not work in Expo Go**
- (Optional) Helius or QuickNode RPC key for higher rate limits

## Setup

```bash
git clone https://github.com/dhryoo/solana-cbbtc.git
cd solana-cbbtc
npm install
cp .env.example .env
# Edit .env if you have a custom RPC endpoint
```

### Run on a device (dev client)

```bash
npx expo prebuild --platform android   # one-time, generates android/
npm run android                        # build + install + launch
npm start                              # Metro bundler for subsequent JS reloads
```

If you have the release keystore set up, `./run.sh` rebuilds + installs the release variant.

### Tests, lint, typecheck

```bash
npm test
npm run lint
npm run typecheck
```

Pre-commit hook runs lint-staged + `tsc --noEmit` automatically.

## Project Layout

```
src/
├── components/   # Stateless UI building blocks
├── screens/      # Home, Swap, Settings, About, Lock, AppShell
├── services/     # External SDK wrappers (Jupiter, Token, Wallet, Notification, Haptics, AppLock, Seeker)
├── hooks/        # useSwap, useSwapQuote, useTokenBalance, useSeekerIdentity, ...
├── providers/    # Context: Connection, Wallet, Theme, I18n, Notification, AppLock, Network, Toast, Query
├── constants/    # Mint addresses, RPC, theme palette, Seeker constants
├── types/        # Global TS types (jupiter.ts, ...)
├── utils/        # Pure helpers (format, parse, error classification, ...)
└── i18n/         # ko.json, en.json
STORE/            # dApp Store submission metadata, screenshots, legal
plugins/          # Expo config plugin for release signing
scripts/          # Asset preparation tooling (Python)
```

External SDK calls are confined to `src/services/`. Components never import `@solana/web3.js` directly.

## Coding Conventions

- **Indentation**: 4 spaces (no tabs)
- **Braces**: Allman style — `function foo()\n{` (enforced by ESLint `@stylistic/brace-style`)
- **TypeScript**: strict, no `any`
- **File naming**: `PascalCase.tsx` for components, `camelCase.ts` for utils/services
- **Commits**: Conventional Commits (`feat(scope): ...`)

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full set of rules.

## Release Build (dApp Store submission)

```bash
# Configure keystore env in ~/.gradle/gradle.properties:
#   SEEKER_BTCFI_RELEASE_STORE_FILE=/abs/path/to/keystore
#   SEEKER_BTCFI_RELEASE_STORE_PASSWORD=...
#   SEEKER_BTCFI_RELEASE_KEY_ALIAS=...
#   SEEKER_BTCFI_RELEASE_KEY_PASSWORD=...

./run.sh                # prebuild + uninstall + run:android release
# or
eas build --profile production --platform android
```

> Debug-signed APKs are rejected by the Solana dApp Store. Use the release keystore — once published, the keystore can never be lost (apps cannot be updated otherwise).

## License

[MIT](./LICENSE) © Solana cbBTC contributors

---

## 한국어 안내

Solana Seeker 폰을 타겟으로 한 BTCfi 모바일 dApp입니다. cbBTC ↔ SOL swap을 Jupiter v6로 처리하고, Seed Vault 하드웨어 서명을 지원합니다.

### 주요 기능

- cbBTC / SOL / SKR 잔액 표시
- Jupiter 기반 swap (versioned tx, dynamic priority fee with cap)
- Mobile Wallet Adapter 지원 — Seeker Seed Vault 자동 인식
- Seeker Genesis Token 확인 시 "Verified" 표시
- 생체 인증 앱 잠금 (opt-in)
- 오프라인 상태 자동 감지 + 액션 차단
- 한국어 / English, 라이트 / 다크 / 시스템 테마

### 빠른 실행 (Android 디바이스 필요)

```bash
git clone https://github.com/dhryoo/solana-cbbtc.git
cd solana-cbbtc
npm install
cp .env.example .env

npx expo prebuild --platform android
npm run android
```

자세한 기여 가이드는 [CONTRIBUTING.md](./CONTRIBUTING.md) 참조.

## Disclaimer

이 앱은 mainnet에서 실거래를 실행합니다. 자기 자산을 다루기 전에 소액으로 테스트하세요.
This app executes real transactions on Solana mainnet. Test with small amounts before transacting at scale.
