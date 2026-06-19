import { makeFailoverFetch } from "./ConnectionProvider";

function res(status: number): Response
{
    return { status } as unknown as Response;
}

describe("makeFailoverFetch", () =>
{
    it("uses the first endpoint when it succeeds", async () =>
    {
        const seen: string[] = [];
        const base = jest.fn(async (url: unknown) => { seen.push(String(url)); return res(200); });
        const ff = makeFailoverFetch(["A", "B", "C"], base as unknown as typeof fetch);

        const r = await ff("ignored", { method: "POST" });
        expect(r.status).toBe(200);
        expect(seen).toEqual(["A"]);
    });

    it("fails over to the next endpoint on 429, then sticks to it", async () =>
    {
        const seen: string[] = [];
        const base = jest.fn(async (url: unknown) =>
        {
            seen.push(String(url));
            return seen.length === 1 ? res(429) : res(200);
        });
        const ff = makeFailoverFetch(["A", "B", "C"], base as unknown as typeof fetch);

        const r1 = await ff("x", {});
        expect(r1.status).toBe(200);
        expect(seen).toEqual(["A", "B"]); // A rate-limited → B ok

        // sticky: 다음 호출은 마지막 성공한 B 부터 시작
        const r2 = await ff("x", {});
        expect(r2.status).toBe(200);
        expect(seen[2]).toBe("B");
    });

    it("fails over on 5xx", async () =>
    {
        const base = jest.fn()
            .mockResolvedValueOnce(res(503))
            .mockResolvedValueOnce(res(200));
        const ff = makeFailoverFetch(["A", "B"], base as unknown as typeof fetch);

        const r = await ff("x", {});
        expect(r.status).toBe(200);
        expect(base).toHaveBeenCalledTimes(2);
    });

    it("fails over on a network throw", async () =>
    {
        let n = 0;
        const base = jest.fn(async () =>
        {
            n += 1;
            if (n === 1) throw new Error("ECONNRESET");
            return res(200);
        });
        const ff = makeFailoverFetch(["A", "B"], base as unknown as typeof fetch);

        const r = await ff("x", {});
        expect(r.status).toBe(200);
        expect(base).toHaveBeenCalledTimes(2);
    });

    it("throws the last error when every endpoint fails", async () =>
    {
        const base = jest.fn(async () => res(502));
        const ff = makeFailoverFetch(["A", "B"], base as unknown as typeof fetch);

        await expect(ff("x", {})).rejects.toThrow(/502|failed/);
        expect(base).toHaveBeenCalledTimes(2); // 한 바퀴 모두 시도
    });
});
