import {
    collateralFromLiquidity,
    liquidityFromCollateral,
    reserveTotalLiquidity,
} from "./kaminoExchange";

describe("reserveTotalLiquidity", () =>
{
    const SF = 1n << 60n; // 1.0 in scaled-fraction units

    it("available + borrowed(Sf>>60) when there are no fees", () =>
    {
        expect(reserveTotalLiquidity(1000n, 5000n * SF)).toBe(6000n);
    });

    it("subtracts unsettled protocol/referrer/pending fees (Kamino getTotalSupply)", () =>
    {
        // 1000 + (5000 - 100 - 50 - 25) = 5825
        expect(reserveTotalLiquidity(1000n, 5000n * SF, 100n * SF, 50n * SF, 25n * SF)).toBe(5825n);
    });

    it("subtracts in Sf space then floors once (not floor-each)", () =>
    {
        // borrowed 1.5, proto 0.5, referrer 0.5 → net 0.5 → floor 0.  (floor-each would give 1)
        expect(reserveTotalLiquidity(0n, 3n * (SF / 2n), SF / 2n, SF / 2n)).toBe(0n);
    });

    it("clamps to 0 when fees would drive the total negative", () =>
    {
        expect(reserveTotalLiquidity(0n, 0n, 100n * SF)).toBe(0n);
    });
});

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
