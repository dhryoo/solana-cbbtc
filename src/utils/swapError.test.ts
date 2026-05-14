import { JupiterApiError } from "@/types/jupiter";

import { toFriendlySwapError } from "./swapError";

describe("toFriendlySwapError", () =>
{
    it("maps user rejection to Korean cancel message", () =>
    {
        const result = toFriendlySwapError(new Error("User rejected the request"));
        expect(result.message).toMatch(/사용자가/);
        expect(result.isUserCancellation).toBe(true);
    });

    it("maps wallet session termination to a friendly message", () =>
    {
        const result = toFriendlySwapError(new Error("session terminated unexpectedly"));
        expect(result.message).toMatch(/지갑 세션/);
        expect(result.isUserCancellation).toBe(true);
    });

    it("maps insufficient balance variants", () =>
    {
        const result = toFriendlySwapError(new Error("Transfer: insufficient lamports"));
        expect(result.message).toMatch(/잔액이 부족/);
        expect(result.isUserCancellation).toBe(false);
    });

    it("maps slippage exceeded", () =>
    {
        const result = toFriendlySwapError(new Error("Slippage tolerance exceeded by 1.2%"));
        expect(result.message).toMatch(/슬리피지/);
    });

    it("maps stale blockhash", () =>
    {
        const result = toFriendlySwapError(new Error("Blockhash not found"));
        expect(result.message).toMatch(/블록해시/);
    });

    it("maps JupiterApiError 429 specifically", () =>
    {
        const result = toFriendlySwapError(new JupiterApiError("rate limit", 429, {}));
        expect(result.message).toMatch(/Jupiter API 요청이 너무 잦/);
    });

    it("maps JupiterApiError 5xx to service-unavailable", () =>
    {
        const result = toFriendlySwapError(new JupiterApiError("server down", 503, {}));
        expect(result.message).toMatch(/일시적으로 응답하지 않/);
    });

    it("includes raw message for debugging", () =>
    {
        const result = toFriendlySwapError(new Error("some weird internal error"));
        expect(result.rawMessage).toBe("some weird internal error");
    });

    it("returns a generic fallback for unknown errors", () =>
    {
        const result = toFriendlySwapError(new Error("unicorn"));
        expect(result.message).toMatch(/트랜잭션이 실패/);
    });
});
