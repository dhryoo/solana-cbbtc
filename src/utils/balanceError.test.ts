import { classifyBalanceError } from "./balanceError";

describe("classifyBalanceError", () =>
{
    it("classifies rate-limit errors", () =>
    {
        expect(classifyBalanceError(new Error("429 Too Many Requests")).kind).toBe("rateLimit");
        expect(classifyBalanceError(new Error("rate limit exceeded")).kind).toBe("rateLimit");
    });

    it("classifies network errors", () =>
    {
        expect(classifyBalanceError(new TypeError("Network request failed")).kind).toBe("network");
        expect(classifyBalanceError(new Error("timeout")).kind).toBe("network");
    });

    it("classifies 4xx RPC errors", () =>
    {
        expect(classifyBalanceError(new Error("400 Bad Request")).kind).toBe("rpc4xx");
        expect(classifyBalanceError(new Error("404 not found")).kind).toBe("rpc4xx");
    });

    it("classifies 5xx RPC errors", () =>
    {
        expect(classifyBalanceError(new Error("503 Service Unavailable")).kind).toBe("rpc5xx");
        expect(classifyBalanceError(new Error("Internal server error")).kind).toBe("rpc5xx");
    });

    it("classifies auth errors", () =>
    {
        expect(classifyBalanceError(new Error("401 Unauthorized")).kind).toBe("auth");
        expect(classifyBalanceError(new Error("invalid api key")).kind).toBe("auth");
    });

    it("falls back to unknown", () =>
    {
        expect(classifyBalanceError(new Error("something weird")).kind).toBe("unknown");
    });
});
