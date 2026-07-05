import {
    healthFactor,
    liquidationPriceFromCollateral,
    riskZone,
    borrowAprFromCurve,
    supplyAprFromCurve,
    type CurvePoint,
} from "./lendingMath";

// Kamino cbBTC 리저브의 실제 borrow rate curve (M8.4 mainnet 실측, 2026-05-21).
// utilizationRateBps / borrowRateBps (10000 = 100%).
const CBBTC_CURVE: CurvePoint[] = [
    { utilizationRateBps: 0, borrowRateBps: 1 },
    { utilizationRateBps: 7000, borrowRateBps: 300 },
    { utilizationRateBps: 7500, borrowRateBps: 519 },
    { utilizationRateBps: 8000, borrowRateBps: 900 },
    { utilizationRateBps: 8500, borrowRateBps: 1558 },
    { utilizationRateBps: 9000, borrowRateBps: 2700 },
    { utilizationRateBps: 9500, borrowRateBps: 4676 },
    { utilizationRateBps: 10000, borrowRateBps: 8100 },
];

describe("healthFactor", () =>
{
    it("차입이 없으면(currentLtv=0) null", () =>
    {
        expect(healthFactor(0, 0.8)).toBeNull();
    });

    it("liquidationLtv / currentLtv 비율을 반환", () =>
    {
        expect(healthFactor(0.5, 0.8)).toBeCloseTo(1.6, 5);
    });

    it("청산선(currentLtv == liquidationLtv)에서 1.0", () =>
    {
        expect(healthFactor(0.8, 0.8)).toBeCloseTo(1.0, 5);
    });

    it("음수 currentLtv 도 차입 없음으로 간주 → null", () =>
    {
        expect(healthFactor(-0.1, 0.8)).toBeNull();
    });
});

describe("liquidationPriceFromCollateral", () =>
{
    it("차입이 없으면(부채 0) null", () =>
    {
        expect(liquidationPriceFromCollateral(0, 1, 0.8)).toBeNull();
    });

    it("부채 / (담보수량 × 청산임계)", () =>
    {
        // 담보 0.01 cbBTC, 부채 $400, 청산임계 0.8 → $400 / (0.01 × 0.8) = $50,000
        expect(liquidationPriceFromCollateral(400, 0.01, 0.8)).toBeCloseTo(50_000, 2);
    });

    it("가격 드리프트와 무관 — 담보수량·부채만으로 결정", () =>
    {
        // 담보 0.012987 cbBTC(= $1000 @ $77k), 부채 $400, 임계 0.8 → ≈ $38,500
        expect(liquidationPriceFromCollateral(400, 1000 / 77_000, 0.8)).toBeCloseTo(38_500, 0);
    });

    it("담보수량이 0 이거나 임계가 0 이면 null (0 나눗셈 가드)", () =>
    {
        expect(liquidationPriceFromCollateral(400, 0, 0.8)).toBeNull();
        expect(liquidationPriceFromCollateral(400, 0.01, 0)).toBeNull();
    });
});

describe("riskZone", () =>
{
    it("차입 없음(null) → none", () =>
    {
        expect(riskZone(null)).toBe("none");
    });

    it("hf >= 1.5 → safe", () =>
    {
        expect(riskZone(1.5)).toBe("safe");
        expect(riskZone(3.0)).toBe("safe");
    });

    it("1.15 <= hf < 1.5 → caution", () =>
    {
        expect(riskZone(1.15)).toBe("caution");
        expect(riskZone(1.49)).toBe("caution");
    });

    it("hf < 1.15 → danger", () =>
    {
        expect(riskZone(1.14)).toBe("danger");
        expect(riskZone(1.0)).toBe("danger");
    });
});

describe("borrowAprFromCurve", () =>
{
    it("첫 점 이하 utilization → 첫 점의 rate", () =>
    {
        // util 0 → 1 bps = 0.0001
        expect(borrowAprFromCurve(0, CBBTC_CURVE)).toBeCloseTo(0.0001, 6);
    });

    it("마지막 점 이상 → 마지막 점의 rate", () =>
    {
        // util 100% → 8100 bps = 0.81
        expect(borrowAprFromCurve(1, CBBTC_CURVE)).toBeCloseTo(0.81, 6);
        expect(borrowAprFromCurve(1.5, CBBTC_CURVE)).toBeCloseTo(0.81, 6);
    });

    it("구간 사이는 선형 보간", () =>
    {
        // util 75% 는 곡선의 점이므로 정확히 519 bps = 0.0519
        expect(borrowAprFromCurve(0.75, CBBTC_CURVE)).toBeCloseTo(0.0519, 6);
        // util 72.5% 는 (7000,300)~(7500,519) 중간 → (300+519)/2 = 409.5 bps
        expect(borrowAprFromCurve(0.725, CBBTC_CURVE)).toBeCloseTo(0.04095, 6);
    });

    it("M8.4 실측 utilization(3.49%) → ~0.159% borrow APR", () =>
    {
        // (0,1)~(7000,300) 구간: 1 + (349/7000)*(300-1) = 15.9 bps ≈ 0.00159
        expect(borrowAprFromCurve(0.0349, CBBTC_CURVE)).toBeCloseTo(0.00159, 4);
    });

    it("빈 곡선이면 0", () =>
    {
        expect(borrowAprFromCurve(0.5, [])).toBe(0);
    });

    it("정렬되지 않은 점도 처리", () =>
    {
        const shuffled: CurvePoint[] = [
            { utilizationRateBps: 10000, borrowRateBps: 8100 },
            { utilizationRateBps: 0, borrowRateBps: 1 },
            { utilizationRateBps: 7000, borrowRateBps: 300 },
        ];
        expect(borrowAprFromCurve(0, shuffled)).toBeCloseTo(0.0001, 6);
    });
});

describe("supplyAprFromCurve", () =>
{
    it("util × borrowApr × (1 − take)", () =>
    {
        // M8.4 실측: util 3.49%, take 20% → 0.0349 × 0.00159 × 0.8 ≈ 0.0000444 (≈0.0044%)
        expect(supplyAprFromCurve(0.0349, CBBTC_CURVE, 20)).toBeCloseTo(0.0000444, 6);
    });

    it("take 0% 이면 util × borrowApr 그대로", () =>
    {
        const borrow = borrowAprFromCurve(0.75, CBBTC_CURVE);
        expect(supplyAprFromCurve(0.75, CBBTC_CURVE, 0)).toBeCloseTo(0.75 * borrow, 6);
    });

    it("utilization 0 이면 supply APR 0", () =>
    {
        expect(supplyAprFromCurve(0, CBBTC_CURVE, 20)).toBeCloseTo(0, 8);
    });
});
