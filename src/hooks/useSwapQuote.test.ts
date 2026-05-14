import { JupiterApiError } from "@/types/jupiter";

import { retryDelayQuote, shouldRetryQuote } from "./useSwapQuote";

describe("shouldRetryQuote", () =>
{
    it("retries 429 once (failureCount 0 → true, 1 → false)", () =>
    {
        const err = new JupiterApiError("rate limited", 429);
        expect(shouldRetryQuote(0, err)).toBe(true);
        expect(shouldRetryQuote(1, err)).toBe(false);
    });

    it("retries 5xx up to twice", () =>
    {
        const err = new JupiterApiError("server error", 503);
        expect(shouldRetryQuote(0, err)).toBe(true);
        expect(shouldRetryQuote(1, err)).toBe(true);
        expect(shouldRetryQuote(2, err)).toBe(false);
    });

    it("does not retry non-429 4xx (client error)", () =>
    {
        const err = new JupiterApiError("bad request", 400);
        expect(shouldRetryQuote(0, err)).toBe(false);
    });

    it("does not retry 404 (client error)", () =>
    {
        const err = new JupiterApiError("not found", 404);
        expect(shouldRetryQuote(0, err)).toBe(false);
    });

    it("does not retry input validation errors thrown by our code", () =>
    {
        expect(shouldRetryQuote(0, new Error("amount must be > 0"))).toBe(false);
        expect(shouldRetryQuote(0, new Error("input and output mints must differ"))).toBe(false);
        expect(shouldRetryQuote(0, new Error("slippageBps must be between 0 and 10000"))).toBe(false);
    });

    it("retries generic network errors up to twice", () =>
    {
        const err = new Error("network request failed");
        expect(shouldRetryQuote(0, err)).toBe(true);
        expect(shouldRetryQuote(1, err)).toBe(true);
        expect(shouldRetryQuote(2, err)).toBe(false);
    });
});

describe("retryDelayQuote", () =>
{
    it("uses 1.5s for 429 (regardless of attempt)", () =>
    {
        const err = new JupiterApiError("rate limited", 429);
        expect(retryDelayQuote(0, err)).toBe(1500);
    });

    it("backs off exponentially for other errors: 500ms, 1500ms", () =>
    {
        const err = new JupiterApiError("server error", 503);
        expect(retryDelayQuote(0, err)).toBe(500);
        expect(retryDelayQuote(1, err)).toBe(1500);
    });

    it("backs off exponentially for generic network errors", () =>
    {
        const err = new Error("fetch failed");
        expect(retryDelayQuote(0, err)).toBe(500);
        expect(retryDelayQuote(1, err)).toBe(1500);
    });
});
