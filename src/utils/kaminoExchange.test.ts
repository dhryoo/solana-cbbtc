import {
    collateralFromLiquidity,
    liquidityFromCollateral,
} from "./kaminoExchange";

describe("collateralFromLiquidity", () =>
{
    it("liquidity × cTokenSupply / totalLiquidity (floor)", () =>
    {
        // 환율 ~1.0004 (totalLiq 10004, cSupply 10000): 10000 liquidity → 9996 collateral
        expect(collateralFromLiquidity(10_000n, 10_004n, 10_000n)).toBe(9996n);
    });

    it("totalLiquidity 0 이면 0 (가드)", () =>
    {
        expect(collateralFromLiquidity(100n, 0n, 100n)).toBe(0n);
    });

    it("1:1 환율", () =>
    {
        expect(collateralFromLiquidity(500n, 1000n, 1000n)).toBe(500n);
    });
});

describe("liquidityFromCollateral", () =>
{
    it("collateral × totalLiquidity / cTokenSupply (floor)", () =>
    {
        expect(liquidityFromCollateral(9996n, 10_004n, 10_000n)).toBe(9999n);
    });

    it("cTokenSupply 0 이면 0 (가드)", () =>
    {
        expect(liquidityFromCollateral(100n, 1000n, 0n)).toBe(0n);
    });

    it("왕복(roundtrip) 근사 — collateral→liquidity→collateral 은 floor 로 ≤ 원본", () =>
    {
        const total = 10_004n;
        const supply = 10_000n;
        const liq = liquidityFromCollateral(9996n, total, supply);
        expect(collateralFromLiquidity(liq, total, supply)).toBeLessThanOrEqual(9996n);
    });
});
