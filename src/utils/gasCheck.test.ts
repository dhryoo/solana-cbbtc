import { FIRST_SUPPLY_GAS_THRESHOLD_LAMPORTS, isSolGasLow, LOW_SOL_GAS_THRESHOLD_LAMPORTS } from "./gasCheck";

describe("isSolGasLow", () =>
{
    it("returns false when balance is not yet loaded (undefined/null)", () =>
    {
        // 로딩 전엔 경고하지 않아야 한다 (UI 깜빡임 방지).
        expect(isSolGasLow(undefined)).toBe(false);
        expect(isSolGasLow(null)).toBe(false);
        expect(isSolGasLow(undefined, FIRST_SUPPLY_GAS_THRESHOLD_LAMPORTS)).toBe(false);
    });

    it("returns true when balance is below the default (repeat-action) threshold", () =>
    {
        expect(isSolGasLow(0n)).toBe(true);
        expect(isSolGasLow(LOW_SOL_GAS_THRESHOLD_LAMPORTS - 1n)).toBe(true);
    });

    it("returns false at or above the default threshold", () =>
    {
        expect(isSolGasLow(LOW_SOL_GAS_THRESHOLD_LAMPORTS)).toBe(false);
        expect(isSolGasLow(LOW_SOL_GAS_THRESHOLD_LAMPORTS + 1n)).toBe(false);
        expect(isSolGasLow(1_000_000_000n)).toBe(false); // 1 SOL
    });

    it("uses 0.01 SOL default and 0.045 SOL first-supply floors", () =>
    {
        expect(LOW_SOL_GAS_THRESHOLD_LAMPORTS).toBe(10_000_000n);
        expect(FIRST_SUPPLY_GAS_THRESHOLD_LAMPORTS).toBe(45_000_000n);
    });

    it("warns in the 0.01–0.045 window only when the first-supply threshold is used", () =>
    {
        const between = 25_000_000n; // 0.025 SOL — above default floor, below first-supply floor
        // 반복 작업이면 충분 → 경고 안 함
        expect(isSolGasLow(between)).toBe(false);
        // 첫 공급이면 obligation/metadata/farm rent 로 부족할 수 있음 → 경고
        expect(isSolGasLow(between, FIRST_SUPPLY_GAS_THRESHOLD_LAMPORTS)).toBe(true);
    });

    it("does not warn at or above the first-supply floor", () =>
    {
        expect(isSolGasLow(FIRST_SUPPLY_GAS_THRESHOLD_LAMPORTS, FIRST_SUPPLY_GAS_THRESHOLD_LAMPORTS)).toBe(false);
        expect(isSolGasLow(50_000_000n, FIRST_SUPPLY_GAS_THRESHOLD_LAMPORTS)).toBe(false);
    });
});
