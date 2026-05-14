import { JupiterApiError } from "@/types/jupiter";

import { toFriendlySwapError } from "./swapError";

describe("toFriendlySwapError", () =>
{
    it("maps user rejection to userCancelled key", () =>
    {
        const result = toFriendlySwapError(new Error("User rejected the request"));
        expect(result.key).toBe("errors.userCancelled");
        expect(result.isUserCancellation).toBe(true);
    });

    it("maps wallet session termination to sessionTerminated key", () =>
    {
        const result = toFriendlySwapError(new Error("session terminated unexpectedly"));
        expect(result.key).toBe("errors.sessionTerminated");
        expect(result.isUserCancellation).toBe(true);
    });

    it("maps insufficient balance variants", () =>
    {
        const result = toFriendlySwapError(new Error("Transfer: insufficient lamports"));
        expect(result.key).toBe("errors.insufficientBalance");
        expect(result.isUserCancellation).toBe(false);
    });

    it("maps slippage exceeded", () =>
    {
        const result = toFriendlySwapError(new Error("Slippage tolerance exceeded by 1.2%"));
        expect(result.key).toBe("errors.slippageExceeded");
    });

    it("maps stale blockhash", () =>
    {
        const result = toFriendlySwapError(new Error("Blockhash not found"));
        expect(result.key).toBe("errors.blockhashExpired");
    });

    it("maps JupiterApiError 429 to rateLimit", () =>
    {
        const result = toFriendlySwapError(new JupiterApiError("rate limit", 429, {}));
        expect(result.key).toBe("errors.rateLimit");
    });

    it("maps JupiterApiError 5xx to jupiter5xx", () =>
    {
        const result = toFriendlySwapError(new JupiterApiError("server down", 503, {}));
        expect(result.key).toBe("errors.jupiter5xx");
    });

    it("maps Jupiter 4xx (non-429) to jupiterClient with status param", () =>
    {
        const result = toFriendlySwapError(new JupiterApiError("bad request", 400, {}));
        expect(result.key).toBe("errors.jupiterClient");
        expect(result.params).toEqual({ status: 400 });
    });

    it("includes raw message for debugging", () =>
    {
        const result = toFriendlySwapError(new Error("some weird internal error"));
        expect(result.rawMessage).toBe("some weird internal error");
    });

    it("returns generic fallback for unknown errors", () =>
    {
        const result = toFriendlySwapError(new Error("unicorn"));
        expect(result.key).toBe("errors.generic");
    });
});
