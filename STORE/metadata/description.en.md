# dApp Store metadata — English (en-US)

Source for Solana Mobile dApp Store Publisher Portal submission. Copy the relevant block into the portal field.

---

## App name

```
Solana cbBTC
```

## Short description (≤ 80 chars)

```
Mobile BTCfi for Solana Seeker — swap cbBTC instantly via Jupiter.
```

(66 chars)

Alternatives:

- "Bitcoin on Solana. Swap cbBTC from your Seeker." (47 chars)
- "Hold and swap cbBTC on Solana Seeker, hardware-secured." (55 chars)

---

## Long description (≤ 4000 chars)

```
Solana cbBTC is the mobile BTCfi app for Solana Seeker users.

cbBTC is Coinbase's 1:1 Bitcoin-pegged token — currently the largest wrapped Bitcoin on Solana mainnet with $340M+ market cap. This app gives you the most direct, hardware-secured path to hold and swap cbBTC from your Seeker.

🔑 Core features

• Mobile Wallet Adapter — direct integration with Seeker's Seed Vault for hardware-level key security
• Live balances — cbBTC, SOL, and SKR on one screen, pull-to-refresh
• Jupiter Swap integration — best routes from Solana's largest aggregator for SOL ↔ cbBTC
• Slippage control — pick 0.1% / 0.5% / 1% per trade
• Versioned transactions + dynamic priority fees — Jupiter v6's latest format, auto-prioritizes during congestion (capped at 0.001 SOL)
• Share swap result — send the Solscan link to any system Share target
• Swap completion notifications — get results even when the app is backgrounded (opt-in)

🛡️ Security first

• Private keys never leave the Seeker Seed Vault hardware
• App lock (opt-in) — biometric or device PIN gate on app open and on returning from background
• Every transaction is approved directly by you
• No backend servers — calls only Solana RPC and Jupiter API
• No analytics, no trackers, no advertising IDs

📶 Reliability

• Offline auto-detection — top banner + action blocking when there's no internet, no stuck spinners
• Pre-flight gas check — swap is blocked when SOL is too low to pay fees, preventing failed transactions
• Double-tap guard — prevents accidental duplicate transactions
• All errors (internet, Jupiter rate limits, slippage, blockhash, etc.) are mapped to clear localized messages

🎯 Seeker-aware

• "Seeker Verified" badge for Genesis Token holders, cryptographically checked on-chain
• "Hardware secured" indicator when connected via Seed Vault
• Built specifically for the Solana Mobile ecosystem

✨ User experience

• Korean / English, instant switch
• Light / Dark mode with system tracking or manual choice
• Large-text friendly — layout stays intact when system font is scaled up
• Screen reader support (accessibility label / role / state on every interactive element)
• Native splash + smooth fade transition for fast launches
• Minimal permissions — only internet, with notifications and biometric auth opt-in

📱 Supported tokens

• cbBTC (Coinbase Wrapped BTC) — primary swap asset
• SOL (native Solana token)
• SKR (Solana Mobile) — balance display
• Future expansion: USDC, additional BTC-pegged tokens

🔮 Roadmap

• Phase 2: cbBTC-backed lending (e.g., Kamino)
• Phase 3: Lightning Network payment rails (experimental)
• Phase 4: Cross-asset wrapped BTC comparison and routing

📊 Tech stack

React Native · Expo SDK 54 · TypeScript strict · Solana Mobile Wallet Adapter · Jupiter Swap v6 · TanStack Query

🌐 Open source

Released under the MIT license. All security and transaction logic is open for review.
GitHub: https://github.com/dhryoo/solana-cbbtc

⚠️ Disclaimer

Solana cbBTC is a self-custody tool — you sign every transaction yourself. Standard Solana network fees apply, and Jupiter swaps incur route-dependent price impact. Confirm the expected receive amount and slippage in the confirmation modal before signing.

This app executes real mainnet transactions. You bear sole responsibility for your funds. The developers are not liable for losses arising from incorrect inputs, market volatility, network outages, or any other cause.
```

> About 3,000 characters — well within the 4,000 limit.

---

## Category

```
DeFi
```

(or Finance, depending on Publisher Portal options)

---

## Keywords

```
bitcoin, cbbtc, defi, swap, solana, wrapped-bitcoin, jupiter, btcfi, seeker, wallet
```

---

## Tagline (optional, ≤ 50 chars)

```
Bitcoin on Solana — straight from your Seeker.
```
