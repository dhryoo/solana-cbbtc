import { Buffer } from "buffer";

import { anySignal, patchedSubarray, patchedThrowIfAborted, timeoutSignal } from "./hermesPolyfills";

// device-only(Hermes) 패치들을 순수 함수로 직접 검증 — Node 에선 native 가 있어 polyfills.ts 의
// 설치 가드가 실행되지 않으므로, 함수 자체를 테스트해 회귀를 CI 로 잡는다.

describe("patchedSubarray", () =>
{
    it("returns a Buffer (with readUIntLE), not a bare Uint8Array", () =>
    {
        const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
        const sub = patchedSubarray.call(buf, 1, 3);
        expect(Buffer.isBuffer(sub)).toBe(true);
        expect(typeof sub.readUIntLE).toBe("function");
        // [0x02, 0x03] little-endian = 0x0302
        expect(sub.readUIntLE(0, 2)).toBe(0x0302);
        expect(Array.from(sub)).toEqual([0x02, 0x03]);
    });
});

describe("patchedThrowIfAborted", () =>
{
    it("does nothing when not aborted", () =>
    {
        expect(() => patchedThrowIfAborted.call({ aborted: false })).not.toThrow();
    });

    it("throws the reason verbatim when it is an Error", () =>
    {
        const reason = new Error("boom");
        expect(() => patchedThrowIfAborted.call({ aborted: true, reason })).toThrow(reason);
    });

    it("throws an AbortError-named Error when reason is not an Error", () =>
    {
        try
        {
            patchedThrowIfAborted.call({ aborted: true, reason: "stop" });
            fail("should have thrown");
        }
        catch (e)
        {
            expect((e as Error).name).toBe("AbortError");
            expect((e as Error).message).toBe("stop");
        }
    });

    it("defaults the message to 'Aborted' when reason is undefined", () =>
    {
        try
        {
            patchedThrowIfAborted.call({ aborted: true });
            fail("should have thrown");
        }
        catch (e)
        {
            expect((e as Error).name).toBe("AbortError");
            expect((e as Error).message).toBe("Aborted");
        }
    });
});

describe("timeoutSignal", () =>
{
    it("returns a non-aborted signal that aborts with TimeoutError after ms", () =>
    {
        jest.useFakeTimers();
        try
        {
            const sig = timeoutSignal(1000);
            expect(sig.aborted).toBe(false);
            jest.advanceTimersByTime(1000);
            expect(sig.aborted).toBe(true);
            expect((sig.reason as Error).name).toBe("TimeoutError");
        }
        finally
        {
            jest.useRealTimers();
        }
    });
});

describe("anySignal", () =>
{
    it("is already aborted when an input signal is already aborted", () =>
    {
        const c = new AbortController();
        c.abort(new Error("pre"));
        const sig = anySignal([c.signal]);
        expect(sig.aborted).toBe(true);
    });

    it("aborts when one of the inputs later aborts", () =>
    {
        const a = new AbortController();
        const b = new AbortController();
        const sig = anySignal([a.signal, b.signal]);
        expect(sig.aborted).toBe(false);
        b.abort(new Error("later"));
        expect(sig.aborted).toBe(true);
    });

    it("does not abort while no input has aborted", () =>
    {
        const a = new AbortController();
        const sig = anySignal([a.signal]);
        expect(sig.aborted).toBe(false);
    });
});
