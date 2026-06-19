import { hasPreSwapShortfall, usdcTargetWithBuffer, USDC_BUFFER_BPS } from "./cbbtcPreSwap";

describe("usdcTargetWithBuffer", () =>
{
    it("adds the buffer bps over the needed amount (round up)", () =>
    {
        // 1.5% over 1_000_000 (1 USDC) = 1_015_000
        expect(usdcTargetWithBuffer(1_000_000n)).toBe(1_015_000n);
    });

    it("rounds up so the target is never below needed+buffer", () =>
    {
        // 648125 * 10150 / 10000 = 657846.875 → ceil 657847
        expect(usdcTargetWithBuffer(648_125n)).toBe(657_847n);
    });

    it("handles zero", () =>
    {
        expect(usdcTargetWithBuffer(0n)).toBe(0n);
    });

    it("buffer constant is 1.5%", () =>
    {
        expect(USDC_BUFFER_BPS).toBe(150);
    });

    it("is always >= input (strict for positive)", () =>
    {
        for (const v of [1n, 7n, 100n, 999_999n, 50_000_000n])
        {
            expect(usdcTargetWithBuffer(v)).toBeGreaterThan(v);
        }
    });
});

describe("hasPreSwapShortfall", () =>
{
    it("no shortfall when obtained USDC exactly covers the re-quote", () =>
    {
        // 버퍼 덕에 확보분이 필요분과 같거나 많은 정상 경로
        expect(hasPreSwapShortfall(1_000_000n, 1_015_000n)).toBe(false);
        expect(hasPreSwapShortfall(1_000_000n, 1_000_000n)).toBe(false);
    });

    it("shortfall when the re-quote needs more USDC than was obtained", () =>
    {
        // 시세가 버퍼(1.5%)보다 더 올라 재견적이 확보분을 초과 → escrow 전에 차단해야 함
        expect(hasPreSwapShortfall(1_020_000n, 1_015_000n)).toBe(true);
    });

    it("boundary: needed one base unit above obtained is a shortfall", () =>
    {
        expect(hasPreSwapShortfall(1_015_001n, 1_015_000n)).toBe(true);
    });
});
