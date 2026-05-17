---
title: Solana cbBTC
---

# Solana cbBTC

Mobile-native **BTCfi** dApp for the [Solana Seeker](https://solanamobile.com/seeker) phone.
Hold and swap **cbBTC** (Coinbase Wrapped BTC on Solana) directly from your phone, with Mobile Wallet Adapter and Seed Vault hardware-backed signing.

## Resources

- 📖 [**Source code on GitHub**](https://github.com/dhryoo/solana-cbbtc)
- 🔒 [**Privacy Policy**](./privacy-policy)
- 📄 [**Terms of Use**](./terms-of-use)
- 🔧 [**Troubleshooting**](./troubleshooting)
- 📜 [MIT License](https://github.com/dhryoo/solana-cbbtc/blob/main/LICENSE)
- 🐛 [Report an issue](https://github.com/dhryoo/solana-cbbtc/issues)

## Features

- cbBTC ↔ SOL swaps via [Jupiter](https://dev.jup.ag)
- Works with any [Mobile Wallet Adapter](https://docs.solanamobile.com/mobile-wallet-adapter/overview) compatible wallet (Phantom, Solflare, Backpack) and Seeker's Seed Vault
- Seeker hardware + Solana Mobile Genesis Token detection
- Biometric / PIN app lock (opt-in)
- Offline-aware: explicit banner and action blocking, no stuck spinners
- Korean / English, light / dark / system theme

## About the project

This is an open-source MVP targeting the [Solana Mobile dApp Store](https://docs.solanamobile.com/dapp-publishing/overview).
The codebase is **TypeScript strict**, **React Native + Expo**, with no proprietary backend.
Every data path the app uses is auditable on GitHub.

---

<sub>Released under the MIT License. © Solana cbBTC contributors.</sub>
