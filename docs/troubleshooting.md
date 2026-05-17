---
title: Troubleshooting
---

# Troubleshooting — Solana cbBTC

This page mirrors the in-app **Settings → About → Troubleshooting** section so it is searchable from the open web. If you hit a problem with the app, find it below first.

For anything not listed here, please [open a GitHub issue](https://github.com/dhryoo/solana-cbbtc/issues) or email <idfeelme@gmail.com>.

---

## The app gets stuck on "Authenticating…"

A known App Lock unlock bug in v0.1.0 that could leave the lock screen frozen on the biometric prompt after a cold start. **Fixed in v0.1.1 and later.**

If you are currently stuck:

1. **Android Settings → Apps → Solana cbBTC → Storage → Clear data**
2. Reopen the app and reconnect your wallet
3. (Optional) Re-enable App Lock in Settings — the new version routes around the race

Make sure you're on the latest version from the Solana dApp Store.

## My wallet won't connect

- An MWA-compatible wallet must be installed: **Phantom**, **Solflare**, **Backpack**, or **Seeker Seed Vault**
- Check internet connectivity — no orange offline banner at the top
- Open your wallet app once to make sure it's unlocked, then retry the connect button

## Balances or quotes won't load

- If the "No internet connection" banner is showing, fix your network first
- On the Assets screen, **pull down to refresh**
- Jupiter API may be temporarily rate-limiting (HTTP 429). The app retries with exponential backoff automatically; wait a few seconds and try again.

## My swap fails

| Error message                 | What to do                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| **Insufficient SOL for fees** | Keep at least 0.002 SOL in the wallet for gas + ATA rent                             |
| **Slippage exceeded**         | Increase slippage tolerance from 0.5% to 1% (Swap screen → slippage chips) and retry |
| **Blockhash expired**         | Retry immediately — the app fetches a fresh quote automatically                      |
| **User cancelled**            | Approve the transaction again in the wallet popup                                    |
| **Network request failed**    | Check internet; if persistent, an RPC endpoint may be down momentarily               |
| **Authorization expired**     | Disconnect the wallet and reconnect                                                  |

## App Lock setup notes

- App Lock is **off by default**; you opt in from Settings → App Lock
- Requires biometric (fingerprint/face) **or** device PIN to be enrolled at the OS level
- The Seeker's hardware-backed prompt is used when available; standard Android biometric otherwise
- If you forget your device biometric/PIN, **clearing app data** (see above) is the recovery path. No funds are stored in the app — your wallet keys are unaffected.

## "Seeker Verified" badge doesn't show

The badge appears only when:

1. You're on a Seeker device
2. The connected wallet owns a Solana Mobile Genesis Token (Token-2022, mint authority `GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4`)

Both conditions must be true. If you're on Seeker but don't have the Genesis Token, no badge — this is expected.

## "Hardware secured" indicator doesn't show

The indicator appears only when the connected wallet is the Seeker's **Seed Vault**. External wallets like Phantom or Solflare won't show it even when their own keys are securely stored, because the app uses a heuristic specific to the Seed Vault MWA flow.

## Reporting a bug

Include in the issue or email:

1. Device + Android version (e.g., "Seeker, Android 14")
2. App version (Settings → About → Version)
3. Wallet used (Seed Vault / Phantom / Solflare / …)
4. Exact steps to reproduce
5. Expected vs. actual behavior
6. Screenshot or screen recording if relevant
7. Transaction signature (Solscan link) if the issue is on-chain

GitHub Issues: <https://github.com/dhryoo/solana-cbbtc/issues>
Email: <idfeelme@gmail.com>

---

_See also: [Privacy Policy](./privacy-policy) · [Terms of Use](./terms-of-use)._
