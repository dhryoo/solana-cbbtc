import { USDC } from "@/constants/tokens";

import { AtomiqProvider, waitForPaymentResilient, waitForReceivePaymentResilient } from "./AtomiqProvider";
import { LN_SENTINEL } from "./sentinels";
import type { LightningDestination, LightningQuote, LightningReceive, SolanaSigningDelegate } from "./types";

// loadRuntime DI 덕에 실제 Atomiq SDK 없이 결과 분기를 검증한다. makeSigner 는 identity 로 두어
// swap 메서드에 전달되는 signer/abortSignal 을 그대로 단언할 수 있게 한다.
const SIGNER = { id: "signer" } as unknown as SolanaSigningDelegate;

function provider(): AtomiqProvider
{
    // makeSigner identity → swap 메서드에 넘어가는 signer 를 그대로 단언 가능
    const runtime = { makeSigner: (s: unknown) => s };
    return new AtomiqProvider(async () => runtime as never);
}

function payQuote(swap: unknown): LightningQuote
{
    return { ref: swap } as unknown as LightningQuote;
}

describe("AtomiqProvider.pay", () =>
{
    it("returns paid (with lnSecret) and forwards the abortSignal to commit + waitForPayment", async () =>
    {
        const controller = new AbortController();
        const swap = {
            commit: jest.fn(async () => "commitTx"),
            waitForPayment: jest.fn(async () => true),
            refund: jest.fn(async () => "refundTx"),
            getSecret: () => "preimage",
        };
        const phases: string[] = [];
        const outcome = await provider().pay(payQuote(swap), SIGNER, (p) => phases.push(p), controller.signal);

        expect(outcome).toEqual({ status: "paid", commitTxId: "commitTx", lnSecret: "preimage" });
        expect(swap.commit).toHaveBeenCalledWith(SIGNER, controller.signal);
        expect(swap.waitForPayment).toHaveBeenCalledWith(undefined, undefined, controller.signal);
        expect(swap.refund).not.toHaveBeenCalled();
        expect(phases).toEqual(["signing", "paying"]);
    });

    it("falls back to refunded when the LP never pays", async () =>
    {
        const swap = {
            commit: jest.fn(async () => "commitTx"),
            waitForPayment: jest.fn(async () => false),
            refund: jest.fn(async () => "refundTx"),
            getSecret: () => null,
        };
        const phases: string[] = [];
        const outcome = await provider().pay(payQuote(swap), SIGNER, (p) => phases.push(p));

        expect(outcome).toEqual({ status: "refunded", commitTxId: "commitTx" });
        expect(swap.refund).toHaveBeenCalledTimes(1);
        expect(phases).toEqual(["signing", "paying", "refunding"]);
    });

    it("returns refund_failed (with error) when the refund signature is declined", async () =>
    {
        const swap = {
            commit: jest.fn(async () => "commitTx"),
            waitForPayment: jest.fn(async () => false),
            refund: jest.fn(async () => { throw new Error("user declined"); }),
            getSecret: () => null,
        };
        const outcome = await provider().pay(payQuote(swap), SIGNER, () => undefined);

        expect(outcome).toEqual({ status: "refund_failed", commitTxId: "commitTx", error: "user declined" });
    });

    it("treats a waitForPayment timeout-throw as paid when the swap actually settled (false-negative guard)", async () =>
    {
        // 사용자 보고 케이스: LP 타임아웃 에러가 떴지만 온체인 정산은 성공.
        const swap = {
            commit: jest.fn(async () => "commitTx"),
            waitForPayment: jest.fn(async () => { throw new Error("Timed out while waiting for LP to process the swap"); }),
            refund: jest.fn(async () => "refundTx"),
            getSecret: () => "preimage",
            _sync: jest.fn(async () => true),
            isSuccessful: jest.fn(() => true), // 재동기화 결과 실제로는 CLAIMED
        };
        const outcome = await provider().pay(payQuote(swap), SIGNER, () => undefined);

        expect(outcome).toEqual({ status: "paid", commitTxId: "commitTx", lnSecret: "preimage" });
        expect(swap._sync).toHaveBeenCalled();
        expect(swap.refund).not.toHaveBeenCalled();
    });

    it("re-throws the waitForPayment error when re-sync shows the swap did NOT settle", async () =>
    {
        const swap = {
            commit: jest.fn(async () => "commitTx"),
            waitForPayment: jest.fn(async () => { throw new Error("boom"); }),
            refund: jest.fn(),
            getSecret: () => null,
            _sync: jest.fn(async () => true),
            isSuccessful: jest.fn(() => false),
        };
        await expect(provider().pay(payQuote(swap), SIGNER, () => undefined)).rejects.toThrow("boom");
    });
});

describe("waitForPaymentResilient", () =>
{
    it("passes abortSignal as the THIRD arg (not maxWaitTimeSeconds)", async () =>
    {
        const controller = new AbortController();
        const swap = { waitForPayment: jest.fn(async () => true) };
        await waitForPaymentResilient(swap, controller.signal);
        expect(swap.waitForPayment).toHaveBeenCalledWith(undefined, undefined, controller.signal);
    });

    it("returns the resolved value when waitForPayment succeeds", async () =>
    {
        expect(await waitForPaymentResilient({ waitForPayment: jest.fn(async () => true) })).toBe(true);
        expect(await waitForPaymentResilient({ waitForPayment: jest.fn(async () => false) })).toBe(false);
    });

    it("re-throws (without re-sync) when the user aborted", async () =>
    {
        const controller = new AbortController();
        controller.abort();
        const sync = jest.fn(async () => true);
        const swap = {
            waitForPayment: jest.fn(async () => { throw new Error("aborted"); }),
            _sync: sync,
            isSuccessful: () => true,
        };
        await expect(waitForPaymentResilient(swap, controller.signal)).rejects.toThrow("aborted");
        expect(sync).not.toHaveBeenCalled(); // 취소는 재확인 없이 그대로 전파
    });

    it("re-syncs and returns true when a throw hides a settled swap", async () =>
    {
        const swap = {
            waitForPayment: jest.fn(async () => { throw new Error("timeout"); }),
            _sync: jest.fn(async () => true),
            isSuccessful: jest.fn(() => true),
        };
        expect(await waitForPaymentResilient(swap)).toBe(true);
        expect(swap._sync).toHaveBeenCalledWith(true);
    });

    it("still re-throws if re-sync itself fails", async () =>
    {
        const swap = {
            waitForPayment: jest.fn(async () => { throw new Error("orig"); }),
            _sync: jest.fn(async () => { throw new Error("sync failed"); }),
            isSuccessful: jest.fn(() => false),
        };
        await expect(waitForPaymentResilient(swap)).rejects.toThrow("orig");
    });
});

describe("waitForReceivePaymentResilient", () =>
{
    it("정상 종료(true/false)면 그대로 반환", async () =>
    {
        expect(await waitForReceivePaymentResilient({ waitForPayment: jest.fn(async () => true) })).toBe(true);
        expect(await waitForReceivePaymentResilient({ waitForPayment: jest.fn(async () => false) })).toBe(false);
    });

    it("일시적 오류로 throw 하면 backoff 후 재-진입해 결국 결제를 받는다", async () =>
    {
        jest.useFakeTimers();
        const waitForPayment = jest.fn()
            .mockRejectedValueOnce(new Error("network blip"))
            .mockResolvedValue(true);
        const p = waitForReceivePaymentResilient({ waitForPayment }, undefined, 5, 3_000);
        await jest.advanceTimersByTimeAsync(3_000);
        await expect(p).resolves.toBe(true);
        expect(waitForPayment).toHaveBeenCalledTimes(2); // 실패 1 + 성공 1
        jest.useRealTimers();
    });

    it("abort 되면 재시도 없이 즉시 전파", async () =>
    {
        const controller = new AbortController();
        controller.abort();
        const waitForPayment = jest.fn(async () => { throw new Error("aborted"); });
        await expect(waitForReceivePaymentResilient({ waitForPayment }, controller.signal)).rejects.toThrow("aborted");
        expect(waitForPayment).toHaveBeenCalledTimes(1); // 재시도 없음
    });

    it("연속 실패가 한도를 넘으면 마지막 에러 전파", async () =>
    {
        jest.useFakeTimers();
        const waitForPayment = jest.fn(async () => { throw new Error("down"); });
        const p = waitForReceivePaymentResilient({ waitForPayment }, undefined, 2, 1_000);
        p.catch(() => undefined);
        await jest.advanceTimersByTimeAsync(1_000 * 3);
        await expect(p).rejects.toThrow("down");
        // 최초 1 + 재시도 2 = 3 회
        expect(waitForPayment).toHaveBeenCalledTimes(3);
        jest.useRealTimers();
    });
});

describe("AtomiqProvider.waitAndClaim", () =>
{
    function receive(swap: unknown): LightningReceive
    {
        return { ref: swap } as unknown as LightningReceive;
    }

    it("returns received with the last claim tx + output, forwarding abortSignal", async () =>
    {
        const controller = new AbortController();
        const swap = {
            waitForPayment: jest.fn(async () => true),
            commitAndClaim: jest.fn(async () => ["claimA", "claimB"]),
            getOutput: () => ({ rawAmount: 12_345n }),
        };
        const phases: string[] = [];
        const outcome = await provider().waitAndClaim(receive(swap), SIGNER, (p) => phases.push(p), controller.signal);

        expect(outcome).toEqual({ status: "received", claimTxId: "claimB", outBase: 12_345n });
        expect(swap.waitForPayment).toHaveBeenCalledWith(undefined, undefined, controller.signal);
        expect(swap.commitAndClaim).toHaveBeenCalledWith(SIGNER, controller.signal);
        expect(phases).toEqual(["awaiting", "claiming"]);
    });

    it("throws receive_invoice_expired when the invoice is never paid (never reaches claim)", async () =>
    {
        const swap = {
            waitForPayment: jest.fn(async () => false),
            commitAndClaim: jest.fn(async () => ["x"]),
            getOutput: () => ({ rawAmount: 0n }),
        };
        await expect(provider().waitAndClaim(receive(swap), SIGNER, () => undefined))
            .rejects.toThrow(LN_SENTINEL.RECEIVE_EXPIRED);
        expect(swap.commitAndClaim).not.toHaveBeenCalled();
    });
});

// --- quote() / createReceive(): swapper.swap 의 positional-arg 계약을 고정 ---
// (현재 미테스트라 인자 순서가 틀려도 green 으로 통과하던 부분. 키 위치만 단언해 SDK 표면 변경에는
//  의도적으로 깨지게 — 그게 회귀 탐지의 목적.)

interface QuoteRuntime
{
    swapper: { swap: jest.Mock };
    tokens: Record<string, { address: string }>;
    btcLnToken: unknown;
    exactOut: string;
    exactIn: string;
}

function quoteRuntime(swapFn: jest.Mock): QuoteRuntime
{
    return {
        swapper: { swap: swapFn },
        tokens: { USDC: { address: "usdc-atomiq" }, SOL: { address: "sol-atomiq" } },
        btcLnToken: { _t: "btcln" },
        exactOut: "EXACT_OUT",
        exactIn: "EXACT_IN",
    };
}

function fakeQuoteSwap(): unknown
{
    return {
        getInput: () => ({ rawAmount: 5_000_000n }),
        getInputWithoutFee: () => ({ rawAmount: 4_970_000n }),
        getFee: () => ({ amountInSrcToken: { rawAmount: 30_000n } }),
        getOutput: () => ({ rawAmount: 7_400n }),
        getQuoteExpiry: () => 1_700_000_000_000,
    };
}

function withRuntime(swapFn: jest.Mock): AtomiqProvider
{
    return new AtomiqProvider(async () => quoteRuntime(swapFn) as never);
}

describe("AtomiqProvider.quote (positional-arg contract)", () =>
{
    it("bolt11: swap(token, btcLn, undefined, EXACT_OUT, srcAddress, paymentRequest) → LightningQuote", async () =>
    {
        const swapFn = jest.fn(async () => fakeQuoteSwap());
        const dest = { kind: "bolt11", parsed: { paymentRequest: "lnbc2500u1pvjluez", description: "Coffee" } } as unknown as LightningDestination;
        const q = await withRuntime(swapFn).quote(USDC, dest, "OWNER_ADDR");

        const [tokenArg, btcLnArg, amountArg, exactArg, addrArg, prArg] = (swapFn.mock.calls[0] ?? []) as unknown[];
        expect(tokenArg).toEqual({ address: "usdc-atomiq" });
        expect(btcLnArg).toEqual({ _t: "btcln" });
        expect(amountArg).toBeUndefined();
        expect(exactArg).toBe("EXACT_OUT");
        expect(addrArg).toBe("OWNER_ADDR");
        expect(prArg).toBe("lnbc2500u1pvjluez");

        expect(q.providerId).toBe("atomiq");
        expect(q.inputBase).toBe(5_000_000n);
        expect(q.inputWithoutFeeBase).toBe(4_970_000n);
        expect(q.feeBase).toBe(30_000n);
        expect(q.outputSats).toBe(7_400n);
        expect(q.quoteExpiresAt).toBe(1_700_000_000_000);
        expect(q.destinationLabel).toBe("Coffee");
        expect(q.ref).toBeDefined();
    });

    it("lnurl/address: passes explicit amountSats + destination string (EXACT_OUT)", async () =>
    {
        const swapFn = jest.fn(async () => fakeQuoteSwap());
        const dest = { kind: "lnurlOrAddress", destination: "jack@strike.me", amountSats: 7_400n } as unknown as LightningDestination;
        const q = await withRuntime(swapFn).quote(USDC, dest, "OWNER_ADDR");

        const [, , amountArg, exactArg, addrArg, destArg] = (swapFn.mock.calls[0] ?? []) as unknown[];
        expect(amountArg).toBe(7_400n);
        expect(exactArg).toBe("EXACT_OUT");
        expect(addrArg).toBe("OWNER_ADDR");
        expect(destArg).toBe("jack@strike.me");
        expect(q.destinationLabel).toBe("jack@strike.me");
    });

    it("falls back to a truncated label when bolt11 has no description", async () =>
    {
        const swapFn = jest.fn(async () => fakeQuoteSwap());
        const pr = "lnbc2500u1pvjluezABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const dest = { kind: "bolt11", parsed: { paymentRequest: pr, description: "" } } as unknown as LightningDestination;
        const q = await withRuntime(swapFn).quote(USDC, dest, "OWNER_ADDR");
        expect(q.destinationLabel).toBe(pr.slice(0, 24) + "…");
    });

    it("rejects an unsupported source token without touching the swapper", async () =>
    {
        const swapFn = jest.fn();
        const fakeToken = { ...USDC, symbol: "WBTC" };
        const dest = { kind: "lnurlOrAddress", destination: "x", amountSats: 1n } as unknown as LightningDestination;
        await expect(withRuntime(swapFn).quote(fakeToken, dest, "A")).rejects.toThrow(/Unsupported source token/);
        expect(swapFn).not.toHaveBeenCalled();
    });

    it("converts an SDK amount-out-of-bounds error to LightningAmountError", async () =>
    {
        const swapFn = jest.fn(async () => { throw { min: 1000, max: 1000000, message: "Swap amount too low" }; });
        const dest = { kind: "lnurlOrAddress", destination: "jack@strike.me", amountSats: 1n } as unknown as LightningDestination;
        await expect(withRuntime(swapFn).quote(USDC, dest, "A"))
            .rejects.toMatchObject({ name: "LightningAmountError", tooLow: true });
    });
});

describe("AtomiqProvider.createReceive (positional-arg contract)", () =>
{
    it("swap(btcLn, dstToken, amountSats, EXACT_IN, undefined, dstAddress) → LightningReceive", async () =>
    {
        const fakeReceiveSwap = { getAddress: () => "lnbc-invoice", getOutput: () => ({ rawAmount: 3_000n }) };
        const swapFn = jest.fn(async () => fakeReceiveSwap);
        const r = await withRuntime(swapFn).createReceive(USDC, 5_000n, "DST_ADDR");

        const [btcLnArg, dstArg, amountArg, exactArg, srcArg, dstAddrArg] = (swapFn.mock.calls[0] ?? []) as unknown[];
        expect(btcLnArg).toEqual({ _t: "btcln" });
        expect(dstArg).toEqual({ address: "usdc-atomiq" });
        expect(amountArg).toBe(5_000n);
        expect(exactArg).toBe("EXACT_IN");
        expect(srcArg).toBeUndefined();
        expect(dstAddrArg).toBe("DST_ADDR");

        expect(r).toEqual({
            providerId: "atomiq",
            invoice: "lnbc-invoice",
            amountSats: 5_000n,
            expectedOutBase: 3_000n,
            dstToken: USDC,
            ref: fakeReceiveSwap,
        });
    });

    it("rejects an unsupported receive token without touching the swapper", async () =>
    {
        const swapFn = jest.fn();
        const fakeToken = { ...USDC, symbol: "WBTC" };
        await expect(withRuntime(swapFn).createReceive(fakeToken, 1n, "D")).rejects.toThrow(/Unsupported receive token/);
        expect(swapFn).not.toHaveBeenCalled();
    });
});
