import { AtomiqProvider, waitForPaymentResilient } from "./AtomiqProvider";
import { LN_SENTINEL } from "./sentinels";
import type { LightningQuote, LightningReceive, SolanaSigningDelegate } from "./types";

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
