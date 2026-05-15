---
title: Terms of Use
---

# Terms of Use — Solana cbBTC

**Effective date**: 2026-05-15
**Version**: 0.1.0

By installing or using the **Solana cbBTC** mobile application ("the app", "Solana cbBTC"), you agree to these Terms of Use ("Terms"). If you do not agree, do not install or use the app.

## TL;DR

- The app is a **self-custody tool** — you hold your own keys, you sign every transaction.
- We do **not** custody your funds, route your transactions through our servers, or have any ability to reverse a transaction.
- The app is provided **AS IS**, with no warranties. You bear sole responsibility for your funds.
- Released under the [MIT License](https://github.com/dhryoo/solana-cbbtc/blob/main/LICENSE). Source code is public.

---

## 1. What the app does

Solana cbBTC is an open-source mobile dApp targeting the Solana Seeker. It lets you:

- View on-chain balances (cbBTC, SOL, SKR) for a wallet you control
- Request swap quotes from the public Jupiter Swap API
- Sign and submit swap transactions through your wallet (Solana Mobile Wallet Adapter, including Seeker's Seed Vault)
- Open transaction receipts on Solscan

The app **does not**:

- Hold, manage, or custody your private keys (they remain inside your wallet of choice — Seed Vault, Phantom, Solflare, etc.)
- Run any backend service, account system, or server-side wallet routing
- Operate as a money services business, broker, exchange, or fiduciary on your behalf

## 2. Eligibility

You must be **at least 18 years old**, legally capable of entering into binding agreements, and not subject to sanctions that would prohibit your use of the Solana network or Jupiter.

## 3. Your responsibilities

You agree to:

- **Safeguard your own keys.** If your wallet's seed phrase is compromised, your funds may be irretrievably lost. The app cannot recover keys.
- **Verify every transaction.** The confirmation modal shows the expected receive amount, slippage, and minimum receive. Confirm these before signing.
- **Use the app only for lawful purposes.** You will not use the app to launder funds, evade sanctions, finance terrorism, or violate applicable laws.
- **Comply with the tax and reporting obligations** of your jurisdiction. The app provides no tax reporting.
- **Test with small amounts first** on mainnet. The app executes real transactions on Solana mainnet — there is no testnet mode.

## 4. No financial advice

Information shown in the app — including swap quotes, price impact, route details, balances, and market cap claims in marketing copy — is provided for convenience only and **does not constitute financial, investment, tax, or legal advice**. Token prices and Bitcoin-pegged token mechanisms (including cbBTC's redemption model) are governed entirely by third-party issuers (Coinbase, Solana Labs, etc.), not by the app or its developers.

## 5. Third-party services

The app interacts with the following third-party services. Their terms apply to their portion of the transaction:

- **Solana RPC** (default `https://api.mainnet-beta.solana.com`) — operated by Solana Labs or your configured provider
- **Jupiter Swap API** (`https://lite-api.jup.ag`) — operated by Jupiter; quote and route execution are entirely Jupiter's responsibility
- **Coinbase Wrapped BTC (cbBTC)** — the cbBTC token is issued and redeemed by Coinbase under Coinbase's terms
- **Solscan** — used only when you tap an explorer link
- **Solana Mobile dApp Store / Publisher** — distribution and update channel governed by Solana Mobile

The developers of Solana cbBTC have **no control** over these services and do not warrant their availability, accuracy, or behavior.

## 6. No warranties

THE APP IS PROVIDED **"AS IS" AND "AS AVAILABLE"** WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, RELIABILITY, OR UNINTERRUPTED OPERATION.

The developers do not guarantee that:

- The app will be free of bugs, defects, or security vulnerabilities
- Swap routes shown will execute successfully on-chain
- Slippage tolerance will be sufficient under all market conditions
- The app will remain compatible with future Android, wallet, RPC, or Jupiter versions

## 7. Limitation of liability

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE DEVELOPERS AND CONTRIBUTORS OF SOLANA cbBTC SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES — INCLUDING WITHOUT LIMITATION LOST PROFITS, LOST DATA, LOST FUNDS, OR LOSS OF GOODWILL — ARISING FROM OR RELATED TO:

- Use of, or inability to use, the app
- Market volatility, price impact, slippage, or front-running of any transaction
- Bugs, errors, or interruptions in the app or any third-party service
- Mistaken or unauthorized transactions signed through your wallet
- Loss, theft, or compromise of your private keys, recovery phrase, or device
- Changes to or discontinuation of third-party services (Solana RPC, Jupiter, Coinbase cbBTC, etc.)

You assume **sole responsibility** for your use of the app and for all transactions you authorize.

## 8. Intellectual property and open source

The app's source code is released under the [MIT License](https://github.com/dhryoo/solana-cbbtc/blob/main/LICENSE). You may inspect, fork, modify, and redistribute it under the terms of that license.

Third-party trademarks (Solana, Solana Mobile, Seeker, Coinbase, cbBTC, Jupiter, etc.) are property of their respective owners. The app's use of these names is for descriptive purposes only and does not imply endorsement.

## 9. Changes to these Terms

Material changes will be reflected in a new release of the app and published in the open-source repository. The "Effective date" at the top will be updated. Continued use of the app after a change constitutes acceptance of the revised Terms.

## 10. Governing law

These Terms are governed by the laws of the Republic of Korea, without regard to conflict-of-laws principles. Any dispute arising from or related to the app or these Terms shall be subject to the exclusive jurisdiction of the courts located in Seoul, Republic of Korea, except where mandatory consumer-protection laws of your jurisdiction require otherwise.

## 11. Contact

For questions about these Terms:

- Repository: <https://github.com/dhryoo/solana-cbbtc>
- Issues: <https://github.com/dhryoo/solana-cbbtc/issues>
- Email: <idfeelme@gmail.com>

---

_See also: [Privacy Policy](./privacy-policy)._

_Solana cbBTC is released under the MIT License. See the project repository for the full license text._
