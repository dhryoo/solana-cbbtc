import { summarizeSimulationError } from "./useSupplyLending";

describe("summarizeSimulationError", () =>
{
    it("err 와 전체 로그를 포함", () =>
    {
        const msg = summarizeSimulationError(
            { InstructionError: [3, "Custom"] },
            ["log a", "log b", "log c", "log d"],
        );
        expect(msg).toContain("Simulation failed");
        expect(msg).toContain("InstructionError");
        // 전체 로그 포함 (디버깅용)
        expect(msg).toContain("log a");
        expect(msg).toContain("log d");
        expect(msg).toContain("--- logs ---");
    });

    it("로그가 없으면 err 만", () =>
    {
        const msg = summarizeSimulationError("BlockhashNotFound", null);
        expect(msg).toBe('Simulation failed: "BlockhashNotFound"');
    });
});
