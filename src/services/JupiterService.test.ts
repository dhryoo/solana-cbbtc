import {
    PublicKey,
    TransactionMessage,
    VersionedTransaction,
} from "@solana/web3.js";

import { JupiterApiError, type QuoteResponse } from "@/types/jupiter";

import { getQuote, getSwapTransaction } from "./JupiterService";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const CBBTC_MINT = "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij";
const USER = new PublicKey(new Uint8Array(32).fill(1));

function mockOkResponse(payload: unknown): Response
{
    return {
        ok: true,
        status: 200,
        json: async () => payload,
        text: async () => JSON.stringify(payload),
    } as unknown as Response;
}

function mockErrorResponse(status: number, body: unknown): Response
{
    return {
        ok: false,
        status,
        json: async () => body,
        text: async () => JSON.stringify(body),
    } as unknown as Response;
}

const SUCCESS_QUOTE: QuoteResponse = {
    inputMint: SOL_MINT,
    outputMint: CBBTC_MINT,
    inAmount: "10000000",
    outAmount: "1175",
    otherAmountThreshold: "1170",
    swapMode: "ExactIn",
    slippageBps: 50,
    priceImpactPct: "0",
    routePlan: [],
};

function makeFakeVersionedTx(): VersionedTransaction
{
    const message = new TransactionMessage({
        payerKey: USER,
        recentBlockhash: "11111111111111111111111111111111",
        instructions: [],
    }).compileToV0Message();
    return new VersionedTransaction(message);
}

function txToBase64(tx: VersionedTransaction): string
{
    return Buffer.from(tx.serialize()).toString("base64");
}

describe("JupiterService.getQuote", () =>
{
    let fetchSpy: jest.SpyInstance;

    beforeEach(() =>
    {
        fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(mockOkResponse(SUCCESS_QUOTE));
    });

    afterEach(() =>
    {
        fetchSpy.mockRestore();
    });

    it("parses a successful response", async () =>
    {
        const quote = await getQuote({
            inputMint: SOL_MINT,
            outputMint: CBBTC_MINT,
            amount: 10_000_000n,
            slippageBps: 50,
        });

        expect(quote.inAmount).toBe("10000000");
        expect(quote.outAmount).toBe("1175");
        expect(quote.slippageBps).toBe(50);
    });

    it("builds the URL with inputMint, outputMint, amount, slippageBps", async () =>
    {
        await getQuote({
            inputMint: SOL_MINT,
            outputMint: CBBTC_MINT,
            amount: 10_000_000n,
            slippageBps: 50,
        });

        const url = String(fetchSpy.mock.calls[0]?.[0] ?? "");
        expect(url).toContain("/swap/v1/quote");
        expect(url).toContain(`inputMint=${SOL_MINT}`);
        expect(url).toContain(`outputMint=${CBBTC_MINT}`);
        expect(url).toContain("amount=10000000");
        expect(url).toContain("slippageBps=50");
    });

    it("serializes bigint amount as decimal string (no scientific notation)", async () =>
    {
        await getQuote({
            inputMint: SOL_MINT,
            outputMint: CBBTC_MINT,
            amount: 100_000_000_000_000n,
            slippageBps: 50,
        });

        const url = String(fetchSpy.mock.calls[0]?.[0] ?? "");
        expect(url).toContain("amount=100000000000000");
        expect(url).not.toMatch(/[eE]\+/);
    });

    it("rejects zero or negative amount before hitting the network", async () =>
    {
        await expect(getQuote({
            inputMint: SOL_MINT,
            outputMint: CBBTC_MINT,
            amount: 0n,
            slippageBps: 50,
        })).rejects.toThrow(/amount must be > 0/i);

        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("rejects identical input and output mints", async () =>
    {
        await expect(getQuote({
            inputMint: SOL_MINT,
            outputMint: SOL_MINT,
            amount: 1_000n,
            slippageBps: 50,
        })).rejects.toThrow(/input and output mints must differ/i);

        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("rejects out-of-range slippageBps", async () =>
    {
        await expect(getQuote({
            inputMint: SOL_MINT,
            outputMint: CBBTC_MINT,
            amount: 1_000n,
            slippageBps: -1,
        })).rejects.toThrow(/slippageBps/i);

        await expect(getQuote({
            inputMint: SOL_MINT,
            outputMint: CBBTC_MINT,
            amount: 1_000n,
            slippageBps: 100_001,
        })).rejects.toThrow(/slippageBps/i);

        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("throws JupiterApiError with status on HTTP 4xx", async () =>
    {
        fetchSpy.mockResolvedValueOnce(mockErrorResponse(400, { error: "Invalid mint" }));

        const promise = getQuote({
            inputMint: SOL_MINT,
            outputMint: CBBTC_MINT,
            amount: 1_000n,
            slippageBps: 50,
        });

        await expect(promise).rejects.toBeInstanceOf(JupiterApiError);
        await expect(promise).rejects.toMatchObject({ status: 400 });
    });

    it("throws JupiterApiError on HTTP 5xx", async () =>
    {
        fetchSpy.mockResolvedValueOnce(mockErrorResponse(503, { error: "service unavailable" }));

        await expect(getQuote({
            inputMint: SOL_MINT,
            outputMint: CBBTC_MINT,
            amount: 1_000n,
            slippageBps: 50,
        })).rejects.toMatchObject({ status: 503 });
    });

    it("propagates network errors with the original message", async () =>
    {
        fetchSpy.mockRejectedValueOnce(new TypeError("Network request failed"));

        await expect(getQuote({
            inputMint: SOL_MINT,
            outputMint: CBBTC_MINT,
            amount: 1_000n,
            slippageBps: 50,
        })).rejects.toThrow(/network request failed/i);
    });
});

describe("JupiterService.getSwapTransaction", () =>
{
    let fetchSpy: jest.SpyInstance;
    let fakeTx: VersionedTransaction;
    let fakeBase64: string;

    beforeEach(() =>
    {
        fakeTx = makeFakeVersionedTx();
        fakeBase64 = txToBase64(fakeTx);
        fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
            mockOkResponse({ swapTransaction: fakeBase64, lastValidBlockHeight: 12345 }),
        );
    });

    afterEach(() =>
    {
        fetchSpy.mockRestore();
    });

    it("returns a deserialized VersionedTransaction", async () =>
    {
        const result = await getSwapTransaction({
            quote: SUCCESS_QUOTE,
            userPublicKey: USER,
        });

        expect(result.transaction).toBeInstanceOf(VersionedTransaction);
        expect(txToBase64(result.transaction)).toBe(fakeBase64);
        expect(result.lastValidBlockHeight).toBe(12345);
    });

    it("POSTs JSON body with quoteResponse and userPublicKey", async () =>
    {
        await getSwapTransaction({
            quote: SUCCESS_QUOTE,
            userPublicKey: USER,
        });

        const [url, init] = fetchSpy.mock.calls[0] ?? [];
        expect(String(url)).toContain("/swap/v1/swap");
        expect(init?.method).toBe("POST");
        const headers = (init?.headers ?? {}) as Record<string, string>;
        expect(headers["Content-Type"] ?? headers["content-type"]).toMatch(/json/i);

        const body = JSON.parse(String(init?.body ?? "{}"));
        expect(body.userPublicKey).toBe(USER.toBase58());
        expect(body.quoteResponse).toMatchObject({
            inputMint: SOL_MINT,
            outputMint: CBBTC_MINT,
        });
        // 기본값으로 wrap/unwrap SOL true
        expect(body.wrapAndUnwrapSol).toBe(true);
    });

    it("respects wrapAndUnwrapSol override", async () =>
    {
        await getSwapTransaction({
            quote: SUCCESS_QUOTE,
            userPublicKey: USER,
            wrapAndUnwrapSol: false,
        });

        const [, init] = fetchSpy.mock.calls[0] ?? [];
        const body = JSON.parse(String(init?.body ?? "{}"));
        expect(body.wrapAndUnwrapSol).toBe(false);
    });

    it("throws JupiterApiError on HTTP failure", async () =>
    {
        fetchSpy.mockResolvedValueOnce(mockErrorResponse(429, { error: "rate limit" }));

        await expect(getSwapTransaction({
            quote: SUCCESS_QUOTE,
            userPublicKey: USER,
        })).rejects.toMatchObject({
            name: "JupiterApiError",
            status: 429,
        });
    });

    it("propagates network errors", async () =>
    {
        fetchSpy.mockRejectedValueOnce(new TypeError("Network request failed"));

        await expect(getSwapTransaction({
            quote: SUCCESS_QUOTE,
            userPublicKey: USER,
        })).rejects.toThrow(/network request failed/i);
    });

    it("throws if swapTransaction is missing in the response", async () =>
    {
        fetchSpy.mockResolvedValueOnce(mockOkResponse({ lastValidBlockHeight: 1 }));

        await expect(getSwapTransaction({
            quote: SUCCESS_QUOTE,
            userPublicKey: USER,
        })).rejects.toThrow(/swapTransaction/i);
    });
});
