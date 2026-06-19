import { refundEachSwap } from "./AtomiqProvider";

// 한 건 실패가 나머지 환불을 막지 않고 성공 개수를 보존하는지 검증 (T1 버그 수정).
function swap(behavior: "ok" | "fail"): { refund: jest.Mock }
{
    return {
        refund: jest.fn().mockImplementation(async () =>
        {
            if (behavior === "fail")
            {
                throw new Error("user declined signature");
            }
            return "tx";
        }),
    };
}

describe("refundEachSwap", () =>
{
    it("refunds all when every swap succeeds", async () =>
    {
        const swaps = [swap("ok"), swap("ok"), swap("ok")];
        const done = await refundEachSwap(swaps, {});
        expect(done).toBe(3);
        for (const s of swaps)
        {
            expect(s.refund).toHaveBeenCalledTimes(1);
        }
    });

    it("a mid-loop failure does NOT abort the rest; count reflects successes", async () =>
    {
        const swaps = [swap("ok"), swap("fail"), swap("ok"), swap("ok")];
        const done = await refundEachSwap(swaps, {});
        // 2번째 실패해도 3·4번째는 시도되어야 함 → 성공 3건
        expect(done).toBe(3);
        // 모든 swap 의 refund 가 호출됐는지 (실패 건 포함)
        for (const s of swaps)
        {
            expect(s.refund).toHaveBeenCalledTimes(1);
        }
    });

    it("returns 0 when all fail (but attempts every one)", async () =>
    {
        const swaps = [swap("fail"), swap("fail")];
        const done = await refundEachSwap(swaps, {});
        expect(done).toBe(0);
        expect(swaps[0]!.refund).toHaveBeenCalledTimes(1);
        expect(swaps[1]!.refund).toHaveBeenCalledTimes(1);
    });

    it("empty list returns 0", async () =>
    {
        expect(await refundEachSwap([], {})).toBe(0);
    });
});
