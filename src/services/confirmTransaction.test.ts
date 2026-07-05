import type { Connection } from "@solana/web3.js";

import { waitForConfirmation } from "./confirmTransaction";

// getSignatureStatuses 만 쓰는 폴링이라, 그 메서드만 가진 최소 mock 으로 분기별 검증.
function mockConnection(
    responder: () => { value: Array<{ confirmationStatus?: string; err?: unknown } | null> },
): { connection: Connection; calls: () => number }
{
    let count = 0;
    const getSignatureStatuses = jest.fn(async () =>
    {
        count += 1;
        return responder();
    });
    return { connection: { getSignatureStatuses } as unknown as Connection, calls: () => count };
}

describe("waitForConfirmation (getSignatureStatuses polling)", () =>
{
    afterEach(() =>
    {
        // 남은 fake 타이머를 비우고 real 로 복귀 — "Jest did not exit" 경고(열린 핸들) 방지
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    it("resolves on the first poll when already confirmed (no timers needed)", async () =>
    {
        const { connection, calls } = mockConnection(() => ({ value: [{ confirmationStatus: "confirmed", err: null }] }));
        await expect(waitForConfirmation(connection, "sig")).resolves.toBeUndefined();
        expect(calls()).toBe(1);
    });

    it("treats finalized as confirmed", async () =>
    {
        const { connection } = mockConnection(() => ({ value: [{ confirmationStatus: "finalized", err: null }] }));
        await expect(waitForConfirmation(connection, "sig")).resolves.toBeUndefined();
    });

    it("keeps polling through null / processed until confirmed", async () =>
    {
        jest.useFakeTimers();
        const seq = [
            { value: [null] },
            { value: [{ confirmationStatus: "processed", err: null }] },
            { value: [{ confirmationStatus: "confirmed", err: null }] },
        ];
        let i = 0;
        const getSignatureStatuses = jest.fn(async () => seq[Math.min(i++, seq.length - 1)]);
        const connection = { getSignatureStatuses } as unknown as Connection;

        const p = waitForConfirmation(connection, "sig");
        await jest.advanceTimersByTimeAsync(2_000 * 3);
        await expect(p).resolves.toBeUndefined();
        // null → processed(미확정) → confirmed: 최소 3회 폴링
        expect(getSignatureStatuses).toHaveBeenCalledTimes(3);
    });

    it("throws when the signature status carries an on-chain error", async () =>
    {
        const { connection } = mockConnection(() => ({ value: [{ confirmationStatus: "confirmed", err: { InstructionError: [0, "Custom"] } }] }));
        await expect(waitForConfirmation(connection, "sig")).rejects.toThrow(/failed on-chain/);
    });

    it("throws confirm_timeout when never confirmed within the budget", async () =>
    {
        jest.useFakeTimers();
        const { connection } = mockConnection(() => ({ value: [null] }));
        const p = waitForConfirmation(connection, "sig");
        p.catch(() => undefined); // advance 동안 unhandled rejection 방지
        await jest.advanceTimersByTimeAsync(95_000);
        await expect(p).rejects.toThrow("confirm_timeout");
    });

    it("throws user_cancelled immediately when the signal is already aborted (no RPC call)", async () =>
    {
        const controller = new AbortController();
        controller.abort();
        const { connection, calls } = mockConnection(() => ({ value: [null] }));
        await expect(waitForConfirmation(connection, "sig", controller.signal)).rejects.toThrow("user_cancelled");
        expect(calls()).toBe(0);
    });

    it("throws user_cancelled when aborted mid-wait", async () =>
    {
        jest.useFakeTimers();
        const controller = new AbortController();
        const { connection } = mockConnection(() => ({ value: [null] }));
        const p = waitForConfirmation(connection, "sig", controller.signal);
        p.catch(() => undefined);
        await jest.advanceTimersByTimeAsync(1_000); // 첫 sleep 도중
        controller.abort();
        await jest.advanceTimersByTimeAsync(1);
        await expect(p).rejects.toThrow("user_cancelled");
    });
});
