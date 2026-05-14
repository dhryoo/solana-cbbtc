# Contributing

Thanks for your interest in Solana cbBTC. This is a small project and contributions of any size are welcome — bug reports, fixes, polish, translations, docs.

## Before You Start

- **Open an issue first** if you're planning a non-trivial change. A short alignment thread saves rework.
- Search existing issues — the bug or feature might already be tracked.
- Verify the bug on a real Android device (Seeker preferred). MWA features cannot be reproduced in iOS / Expo Go.

## Development Setup

See [README.md](./README.md#setup). In short:

```bash
npm install
cp .env.example .env
npx expo prebuild --platform android
npm run android
```

## Coding Rules

These are enforced by ESLint + a pre-commit hook. CI will reject PRs that violate them.

### Indentation & braces

- **4 spaces**, no tabs
- **Allman braces** — open brace on its own line:

```ts
function getBalance(pubkey: PublicKey): Promise<number> {
    if (!pubkey) {
        throw new Error("pubkey required");
    }
    return connection.getBalance(pubkey);
}
```

JSX `return (...)` is exempt — readability first.

### TypeScript

- `strict: true`
- **No `any`**. Use `unknown` + type guards.
- Exported functions / components must declare an explicit return type.

### Naming

- Components: `PascalCase.tsx`
- Utils / services / hooks: `camelCase.ts`
- Constants: `UPPER_SNAKE_CASE`
- Types / interfaces: `PascalCase` (no `I` prefix)

### Comments

- Default: **none**. Well-named identifiers and tests carry intent.
- Add a comment only when the **why** is non-obvious (hidden invariant, workaround for an external bug, performance trade-off).
- Don't restate **what** the code does.
- Korean comments are OK alongside English.

### Architecture

- External SDK calls (`@solana/web3.js`, Jupiter API, MWA, expo-\*) live in `src/services/`. Components / screens never import them directly.
- React Query is the only server-state cache. Don't add ad-hoc fetch + useState pairs.
- New visible strings must be added to **both** `src/i18n/ko.json` and `src/i18n/en.json`.

## Testing

```bash
npm test            # full suite
npm run test:watch
```

Coverage targets:

- `src/services/`: 90 %+ (external boundary, must be testable in isolation)
- `src/hooks/`: 80 %+
- Overall: 70 %+

Prefer behavior tests over snapshot tests. Mock RPC / Jupiter / MWA at the service boundary.

## Commit Messages

[Conventional Commits](https://www.conventionalcommits.org/), English subject line:

```
feat(swap): support ExactOut swap mode
fix(balance): handle ATA-not-found as zero instead of error
ui(home): increase spacing between balance cards
chore(deps): bump expo to 54.0.34
test(jupiter): cover 429 retry path
```

Body / footer optional but encouraged for non-trivial changes.

## Pull Requests

- One logical change per PR. Refactor + feature in one PR makes review hard.
- Update tests with the code. PRs that touch business logic without test changes will get pushback.
- Update `src/i18n/*.json` for any new user-visible string in **both** languages.
- Update `README.md` if you add a feature surface.
- Don't bump version / changelog — the maintainer does that at release time.

## Reporting a Bug

Include in the issue:

1. Device + OS version (e.g., "Seeker, Android 14")
2. App version (Settings → About → Version)
3. Wallet used (Seed Vault / Phantom / Solflare / ...)
4. Steps to reproduce
5. What you expected vs. what happened
6. Screenshot or screen recording if relevant
7. Tx signature (Solscan link) if the issue is on-chain

For security-sensitive issues (keystore handling, signature flow, private key exposure), email **idfeelme@gmail.com** instead of filing a public issue.

## Code of Conduct

Be civil. Disagree on the technical merits, not the person. No harassment. Maintainers reserve the right to remove anything that violates this in spirit.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](./LICENSE).
