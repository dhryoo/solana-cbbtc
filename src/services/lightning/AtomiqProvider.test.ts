import { AtomiqProvider } from "./AtomiqProvider";
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
        expect(swap.waitForPayment).toHaveBeenCalledWith(controller.signal);
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
        expect(swap.waitForPayment).toHaveBeenCalledWith(controller.signal);
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
            .rejects.toThrow("receive_invoice_expired");
        expect(swap.commitAndClaim).not.toHaveBeenCalled();
    });
});
