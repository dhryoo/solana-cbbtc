import { LN_SENTINEL } from "@/services/lightning/sentinels";

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

    // 계약 테스트: throw 처(useCbbtcLightning/AtomiqProvider)와 동일한 sentinel 상수를 통해
    // 매핑을 검증 → 한쪽 리네이밍 시 상수 변경이 양쪽에 동시 반영(드리프트 방지)
    it("maps Lightning invoice expiry to receive.expired (via shared sentinel)", () =>
    {
        expect(toFriendlyErrorKey(new Error(LN_SENTINEL.RECEIVE_EXPIRED).message).key).toBe("receive.expired");
    });

    it("maps cbBTC pre-swap shortfall to the USDC-retry hint (via shared sentinel)", () =>
    {
        expect(toFriendlyErrorKey(new Error(LN_SENTINEL.PRESWAP_SHORTFALL).message).key).toBe("lightning.cbbtcRetryWithUsdc");
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
