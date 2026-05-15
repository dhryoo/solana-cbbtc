---
title: Privacy Policy
---

# Privacy Policy — Solana cbBTC

**Effective date**: 2026-05-14
**Version**: 0.1.0

This document describes the data practices of the **Solana cbBTC** mobile application ("the app", "we", "us") published on the Solana Mobile dApp Store.

## TL;DR

- We do not collect, store, or transmit any personal information.
- We do not run any backend servers.
- The app communicates only with public Solana RPC endpoints and the Jupiter Swap public API.
- All user preferences are stored locally on your device.
- Open-source under MIT license — you can audit every data path yourself.

---

## 1. Data we collect

**We collect nothing.** No accounts, no email, no analytics, no telemetry, no advertising IDs, no usage tracking.

## 2. Data stored locally on your device

The app uses Android's `AsyncStorage` (encrypted at-rest by the OS where supported) to persist user preferences and session state:

| Key                              | Purpose                       | Contents                                                                            |
| -------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| `wallet:authToken`               | Mobile Wallet Adapter session | Opaque token issued by your wallet (Seed Vault) — does not contain your private key |
| `settings:language`              | Language preference           | "ko" or "en"                                                                        |
| `settings:themeMode`             | Theme preference              | "system", "light", or "dark"                                                        |
| `settings:notifications:enabled` | Swap notification toggle      | "1" or "0"                                                                          |

All of this data lives only on your device. Uninstalling the app removes it.

## 3. Network requests

The app contacts the following external services. None of these requests carry your personal identifiers — only public information already on-chain.

### 3.1 Solana RPC

- **Endpoint**: configurable, defaults to `https://api.mainnet-beta.solana.com`
- **Purpose**: read your public token balances; submit signed transactions you have approved
- **Information sent**: your wallet's public address (already public on-chain) and signed transaction bytes
- **Provider's privacy policy**: governed by the RPC operator you configure (Solana Labs by default)

### 3.2 Jupiter Swap API

- **Endpoint**: `https://lite-api.jup.ag`
- **Purpose**: fetch swap quotes and build swap transactions
- **Information sent**: input/output token mint addresses, requested amounts, slippage tolerance, and your wallet's public address (for transaction building only)
- **Provider's privacy policy**: see jup.ag

### 3.3 Solscan (optional, on user action)

- **Endpoint**: `https://solscan.io`
- **Purpose**: opens a browser when you tap a transaction signature to view the on-chain receipt
- **Information sent**: transaction signature only (public on-chain data)
- This only happens when you explicitly tap a link.

## 4. Notifications

If you enable swap completion notifications, the app:

- Requests OS-level notification permission
- Schedules **local-only** notifications using `expo-notifications`
- **Does not** register a push token with any remote service
- **Does not** send notification data to a server

All notification data is generated and shown on your device. You can disable notifications anytime in Settings; this revokes future scheduling but does not delete the OS preference (managed by Android).

## 5. Wallet integration

The app connects to wallets via the Solana **Mobile Wallet Adapter** protocol. The selected wallet (Seed Vault on Seeker, or any compatible wallet) handles your private keys; this app **never sees them**. Authorization tokens granted by the wallet are stored locally (see §2) and can be revoked by disconnecting or by the wallet itself.

## 6. Third-party policies

You may want to review the privacy practices of:

- **Solana Labs** (default RPC) — https://solana.com
- **Jupiter** (swap API) — https://jup.ag
- **Coinbase** (cbBTC issuer) — https://www.coinbase.com/legal/privacy

We have no control over these services.

## 7. Children

This app is not intended for users under 18 years of age. It executes real cryptocurrency transactions on Solana mainnet.

## 8. Changes

Material changes to this policy will be reflected in a new release of the app and published in the open-source repository. The "Effective date" at the top will be updated.

## 9. Contact

This is an open-source project. For privacy concerns, questions, or to report an issue:

- Repository: <https://github.com/dhryoo/solana-cbbtc>
- Issues: <https://github.com/dhryoo/solana-cbbtc/issues>
- Maintainer email: <idfeelme@gmail.com>

---

_Solana cbBTC is released under the MIT License. See the project repository for the full license text._
