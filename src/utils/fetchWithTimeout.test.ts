import { fetchWithTimeout } from "./fetchWithTimeout";

describe("fetchWithTimeout", () =>
{
    afterEach(() =>
    {
        jest.clearAllTimers();
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it("성공 시 Response 를 반환하고 타이머를 정리한다", async () =>
    {
        const res = { ok: true } as Response;
        const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(res);
        const clearSpy = jest.spyOn(global, "clearTimeout");

        await expect(fetchWithTimeout("https://x")).resolves.toBe(res);
        // signal 이 주입돼 전달됐는지
        const init = fetchSpy.mock.calls[0]?.[1];
        expect(init?.signal).toBeInstanceOf(AbortSignal);
        expect(clearSpy).toHaveBeenCalled();
    });

    it("timeoutMs 초과 시 abort 하고 fetch_timeout 으로 throw", async () =>
    {
        jest.useFakeTimers();
        // signal.aborted 가 되면 reject 되는 fetch 흉내
        jest.spyOn(global, "fetch").mockImplementation((_input, init) =>
            new Promise((_resolve, reject) =>
            {
                const signal = (init as RequestInit | undefined)?.signal;
                signal?.addEventListener("abort", () => reject(new Error("aborted")));
            }));

        const p = fetchWithTimeout("https://x", undefined, 5_000);
        p.catch(() => undefined); // advance 동안 unhandled rejection 방지
        await jest.advanceTimersByTimeAsync(5_000);
        await expect(p).rejects.toThrow("fetch_timeout");
    });

    it("타임아웃이 아닌 실패는 원래 에러를 전파한다", async () =>
    {
        jest.spyOn(global, "fetch").mockRejectedValue(new TypeError("Network request failed"));
        await expect(fetchWithTimeout("https://x")).rejects.toThrow("Network request failed");
    });
});
