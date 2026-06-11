import { PublicKey } from "@solana/web3.js";

import { USDC } from "@/constants/tokens";
import type { ConnectedAccount } from "@/services/WalletService";

import { LightningQuoteError, LightningService, resolveDestination } from "./LightningService";
import type {
    LightningDestination,
    LightningPayOutcome,
    LightningPayPhase,
    LightningQuote,
    LightningSwapProvider,
    SolanaSigningDelegate,
} from "./types";

// BOLT11 스펙 벡터 (lightningInvoice.test.ts 와 동일 픽스처)
const COFFEE_INVOICE =
    "lnbc2500u1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpu9qrsgquk0rl77nj30yxdy8j9vdx85fkpmdla2087ne0xh8nhedh8w27kyke0lp53ut353s06fv3qfegext0eh0ymjpf39tuven09sam30g4vgpfna3rh";
const AMOUNTLESS_INVOICE =
    "lnbc1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpu9qrsgquk0rl77nj30yxdy8j9vdx85fkpmdla2087ne0xh8nhedh8w27kyke0lp53ut353s06fv3qfegext0eh0ymjpf39tuven09sam30g4vgprj6706";
const COFFEE_TS = 1496314658;

describe("resolveDestination", () =>
{
    it("accepts a non-expired bolt11 with embedded amount (no explicit amount)", () =>
    {
        const d = resolveDestination(COFFEE_INVOICE, null, COFFEE_TS + 10);
        expect(d.kind).toBe("bolt11");
    });

    it("rejects an expired bolt11", () =>
    {
        expect(() => resolveDestination(COFFEE_INVOICE, null, COFFEE_TS + 9999))
            .toThrow(LightningQuoteError);
        try
        {
            resolveDestination(COFFEE_INVOICE, null, COFFEE_TS + 9999);
        }
        catch (e)
        {
            expect((e as LightningQuoteError).code).toBe("expired_invoice");
        }
    });

    it("rejects bolt11 with explicit amount (이중 금액 지정 금지)", () =>
    {
        try
        {
            resolveDestination(COFFEE_INVOICE, 1000n, COFFEE_TS + 10);
            fail("should throw");
        }
        catch (e)
        {
            expect((e as LightningQuoteError).code).toBe("amount_not_allowed");
        }
    });

    it("rejects amountless bolt11 (MVP 미지원)", () =>
    {
        try
        {
            resolveDestination(AMOUNTLESS_INVOICE, null, COFFEE_TS + 10);
            fail("should throw");
        }
        catch (e)
        {
            expect((e as LightningQuoteError).code).toBe("amount_required");
        }
    });

    it("lightning address requires a positive amount", () =>
    {
        try
        {
            resolveDestination("jack@strike.me", null);
            fail("should throw");
        }
        catch (e)
        {
            expect((e as LightningQuoteError).code).toBe("amount_required");
        }
        const ok = resolveDestination("jack@strike.me", 5000n);
        expect(ok.kind).toBe("lnurlOrAddress");
        if (ok.kind === "lnurlOrAddress")
        {
            expect(ok.destination).toBe("jack@strike.me");
            expect(ok.amountSats).toBe(5000n);
        }
    });

    it("garbage input throws invalid_input", () =>
    {
        try
        {
            resolveDestination("not lightning", null);
            fail("should throw");
        }
        catch (e)
        {
            expect((e as LightningQuoteError).code).toBe("invalid_input");
        }
    });
});

describe("LightningService (Facade + mock provider)", () =>
{
    const OWNER = new PublicKey("9xQeWvG816bUx9EPSWvPjW8TQ6E7KqkbszxbjGAxAJat");
    const account: ConnectedAccount = {
        publicKey: OWNER,
        authToken: "auth-token",
        walletUriBase: "",
    };

    function makeMockProvider(overrides: Partial<LightningSwapProvider> = {}): LightningSwapProvider
    {
        const fakeQuote: LightningQuote = {
            providerId: "mock",
            srcToken: USDC,
            inputBase: 5_000_000n,
            inputWithoutFeeBase: 4_970_000n,
            feeBase: 30_000n,
            outputSats: 7_400n,
            quoteExpiresAt: Date.now() + 60_000,
            destinationLabel: "jack@strike.me",
            ref: {},
        };
        return {
            id: "mock",
            getSupportedSourceTokens: jest.fn().mockResolvedValue([USDC]),
            quote: jest.fn().mockResolvedValue(fakeQuote),
            pay: jest.fn().mockImplementation(
                async (_q: LightningQuote, _s: SolanaSigningDelegate, onPhase: (p: LightningPayPhase) => void): Promise<LightningPayOutcome> =>
                {
                    onPhase("signing");
                    onPhase("paying");
                    return { status: "paid", commitTxId: "tx123", lnSecret: "secret" };
                },
            ),
            getRefundableCount: jest.fn().mockResolvedValue(0),
            refundAll: jest.fn().mockResolvedValue(0),
            ...overrides,
        };
    }

    it("getQuote validates input then delegates to provider with resolved destination", async () =>
    {
        const provider = makeMockProvider();
        const svc = new LightningService(provider);
        await svc.getQuote({
            rawInput: "Jack@strike.me",
            amountSats: 7_400n,
            srcToken: USDC,
            srcAddress: OWNER.toBase58(),
        });
        expect(provider.quote).toHaveBeenCalledTimes(1);
        const [tokenArg, destArg, addrArg] = (provider.quote as jest.Mock).mock.calls[0];
        expect(tokenArg).toBe(USDC);
        expect((destArg as LightningDestination).kind).toBe("lnurlOrAddress");
        expect(addrArg).toBe(OWNER.toBase58());
    });

    it("getQuote propagates validation errors without touching provider", async () =>
    {
        const provider = makeMockProvider();
        const svc = new LightningService(provider);
        await expect(svc.getQuote({
            rawInput: "garbage",
            amountSats: null,
            srcToken: USDC,
            srcAddress: OWNER.toBase58(),
        })).rejects.toThrow(LightningQuoteError);
        expect(provider.quote).not.toHaveBeenCalled();
    });

    it("pay delegates with a signing delegate built from the account and reports phases", async () =>
    {
        const provider = makeMockProvider();
        const svc = new LightningService(provider);
        const phases: LightningPayPhase[] = [];
        const quote = await svc.getQuote({
            rawInput: "jack@strike.me",
            amountSats: 7_400n,
            srcToken: USDC,
            srcAddress: OWNER.toBase58(),
        });
        const outcome = await svc.pay(quote, account, (p) => phases.push(p));
        expect(outcome.status).toBe("paid");
        expect(phases).toEqual(["signing", "paying"]);
        const [, signerArg] = (provider.pay as jest.Mock).mock.calls[0];
        expect((signerArg as SolanaSigningDelegate).publicKey.equals(OWNER)).toBe(true);
    });
});
