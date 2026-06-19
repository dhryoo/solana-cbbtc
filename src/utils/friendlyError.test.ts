import { toFriendlyErrorKey } from "./friendlyError";

describe("toFriendlyErrorKey", () =>
{
    it("maps user rejection (Seed Vault X / MWA cancel) to userCancelled", () =>
    {
        const r = toFriendlyErrorKey("java...CancellationException");
        expect(r.key).toBe("errors.userCancelled");
        expect(r.isUserCancellation).toBe(true);
    });

    it("maps wallet timeout before network (bare /timeout/ would mis-match)", () =>
    {
        const r = toFriendlyErrorKey("java.util.concurrent.TimeoutException: Timed out waiting for response with id=7");
        expect(r.key).toBe("errors.walletTimeout");
        expect(r.isUserCancellation).toBe(false);
    });

    it("maps auth failure to authExpired", () =>
    {
        expect(toFriendlyErrorKey("-1/authorization request failed").key).toBe("errors.authExpired");
    });

    it("maps oracle staleness to oracleStale", () =>
    {
        expect(toFriendlyErrorKey("custom program error: 6039 PriceTooOld").key).toBe("errors.oracleStale");
    });

    it("maps no-borrows (6021) to noBorrows", () =>
    {
        expect(toFriendlyErrorKey("0x1785 ObligationBorrowsEmpty").key).toBe("errors.noBorrows");
    });

    it("maps Lightning invoice expiry to receive.expired", () =>
    {
        expect(toFriendlyErrorKey("receive_invoice_expired").key).toBe("receive.expired");
    });

    it("maps cbBTC pre-swap shortfall to the USDC-retry hint", () =>
    {
        expect(toFriendlyErrorKey("cbbtc_preswap_shortfall").key).toBe("lightning.cbbtcRetryWithUsdc");
    });

    it("maps insufficient funds to insufficientBalance", () =>
    {
        expect(toFriendlyErrorKey("Transfer: insufficient lamports 1000").key).toBe("errors.insufficientBalance");
    });

    it("maps rate limit to rateLimit", () =>
    {
        expect(toFriendlyErrorKey("HTTP 429 rate limit").key).toBe("errors.rateLimit");
    });

    it("maps network failure to network", () =>
    {
        expect(toFriendlyErrorKey("Network request failed").key).toBe("errors.network");
    });

    it("falls back to generic for unknown raw errors (no raw leak)", () =>
    {
        const r = toFriendlyErrorKey("0xdeadbeef some weird internal program panic");
        expect(r.key).toBe("errors.generic");
        expect(r.isUserCancellation).toBe(false);
    });
});
