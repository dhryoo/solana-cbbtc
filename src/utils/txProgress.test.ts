import { TX_STEPS, stepVisual, stepProgressRatio } from "./txProgress";

describe("TX_STEPS", () =>
{
    it("5단계 순서", () =>
    {
        expect(TX_STEPS).toEqual(["preparing", "simulating", "signing", "sending", "done"]);
    });
});

describe("stepVisual", () =>
{
    it("running 중: 이전=done, 현재=active, 이후=pending", () =>
    {
        expect(stepVisual("preparing", "signing", "running")).toBe("done");
        expect(stepVisual("simulating", "signing", "running")).toBe("done");
        expect(stepVisual("signing", "signing", "running")).toBe("active");
        expect(stepVisual("sending", "signing", "running")).toBe("pending");
        expect(stepVisual("done", "signing", "running")).toBe("pending");
    });

    it("success: 모든 단계 done", () =>
    {
        for (const s of TX_STEPS)
        {
            expect(stepVisual(s, "done", "success")).toBe("done");
        }
    });

    it("error: 실패한(현재) 단계는 error, 이전은 done, 이후는 pending", () =>
    {
        expect(stepVisual("preparing", "simulating", "error")).toBe("done");
        expect(stepVisual("simulating", "simulating", "error")).toBe("error");
        expect(stepVisual("signing", "simulating", "error")).toBe("pending");
    });
});

describe("stepProgressRatio", () =>
{
    it("현재 단계 인덱스 / 마지막 인덱스", () =>
    {
        expect(stepProgressRatio("preparing")).toBeCloseTo(0, 5);
        expect(stepProgressRatio("signing")).toBeCloseTo(2 / 4, 5);
        expect(stepProgressRatio("done")).toBeCloseTo(1, 5);
    });
});
