// Lending 위험 지표 / APR 순수 계산 함수.
//
// Kamino SDK(KaminoObligation/KaminoReserve)는 health factor 단일값과
// 포지션별 청산가를 제공하지 않고, totalSupplyAPY()/totalBorrowAPY() 는
// cbBTC 리저브에서 "Invalid borrow rate curve" 로 throw 하는 케이스가 있다
// (M8.4 mainnet 실측, 2026-05-21). 그래서 위험 지표와 APR 을 여기서 직접 계산한다.
//
// 비율(LTV, APR)은 0~1 fraction, 가격은 USD. 토큰 정산 금액이 아니므로 number 로 충분.

/** 위험 구간 — UI zone 색상(D-6: 위험 강조)용. */
export type RiskZone = "none" | "safe" | "caution" | "danger";

// Health factor 구간 경계 (단일 출처). constants/lending.ts 가 이 값을 재사용한다.
export const HEALTH_SAFE_MIN = 1.5;     // 이 이상 안전
export const HEALTH_CAUTION_MIN = 1.15; // 이 이상 주의, 미만 위험

/** Borrow rate curve 의 한 점. utilizationRateBps / borrowRateBps (10000 = 100%). */
export interface CurvePoint
{
    utilizationRateBps: number;
    borrowRateBps: number;
}

/**
 * Health factor = 청산임계LTV / 현재LTV.
 * - > 1 안전(클수록 여유), = 1 청산선
 * - 차입이 없으면(currentLtv <= 0) 청산 위험 없음 → null
 */
export function healthFactor(currentLtv: number, liquidationLtv: number): number | null
{
    if (currentLtv <= 0)
    {
        return null;
    }
    return liquidationLtv / currentLtv;
}

/**
 * 담보 자산의 청산가 — 담보 **수량**과 부채로 직접 역산(가격 비의존).
 *   청산가 = 부채USD / (담보수량 × 청산임계LTV)
 * 담보 가격이 이 값까지 떨어지면 담보가치×임계 = 부채 가 되어 청산된다.
 *
 * WHY 수량 기반: LTV 비율 기반 공식(현재가 × 현재LTV/임계)은 현재LTV 와 현재가가 같은 스냅샷일
 * 때만 맞다. obligation 집계(LTV)는 마지막 refresh 시점 값이라, 그 뒤 움직인 fresh reserve 가격을
 * 곱하면 가격 변동분만큼 청산가가 어긋난다(BTC 하락 시 청산가를 낮게 표시 → 위험 과소평가). 수량·부채는
 * 사용자 거래 전까지 불변이라 이 공식은 가격 드리프트와 무관하게 정확하다.
 * 차입이 없거나 담보수량/임계가 0 이면 null.
 */
export function liquidationPriceFromCollateral(
    debtUsd: number,
    collateralAmount: number,
    liquidationLtv: number,
): number | null
{
    if (debtUsd <= 0 || collateralAmount <= 0 || liquidationLtv <= 0)
    {
        return null;
    }
    return debtUsd / (collateralAmount * liquidationLtv);
}

/** Health factor → 위험 구간. null(차입 없음)은 none. */
export function riskZone(hf: number | null): RiskZone
{
    if (hf === null)
    {
        return "none";
    }
    if (hf >= HEALTH_SAFE_MIN)
    {
        return "safe";
    }
    if (hf >= HEALTH_CAUTION_MIN)
    {
        return "caution";
    }
    return "danger";
}

/**
 * Borrow rate curve 선형 보간 → borrow APR (0~1 fraction).
 * util: 0~1 fraction. 경계 밖이면 끝점 rate 로 clamp.
 */
export function borrowAprFromCurve(util: number, points: CurvePoint[]): number
{
    if (points.length === 0)
    {
        return 0;
    }

    const uBps = util * 10000;
    const sorted = [...points].sort((a, b) => a.utilizationRateBps - b.utilizationRateBps);

    const first = sorted[0]!;
    if (uBps <= first.utilizationRateBps)
    {
        return first.borrowRateBps / 10000;
    }
    const last = sorted[sorted.length - 1]!;
    if (uBps >= last.utilizationRateBps)
    {
        return last.borrowRateBps / 10000;
    }

    for (let i = 0; i < sorted.length - 1; i++)
    {
        const lo = sorted[i]!;
        const hi = sorted[i + 1]!;
        if (uBps >= lo.utilizationRateBps && uBps <= hi.utilizationRateBps)
        {
            const span = hi.utilizationRateBps - lo.utilizationRateBps;
            // span === 0 은 중복 utilization 점에 대한 0 나눗셈 방어 (정상 곡선에선 도달 안 함).
            /* istanbul ignore next -- defensive: 중복 점 가드 */
            const frac = span === 0 ? 0 : (uBps - lo.utilizationRateBps) / span;
            const rateBps = lo.borrowRateBps + frac * (hi.borrowRateBps - lo.borrowRateBps);
            return rateBps / 10000;
        }
    }
    /* istanbul ignore next -- 도달 불가: 위 clamp 가 [first,last] 밖을, 루프가 그 안을 모두 커버 */
    return 0;
}

/**
 * Supply APR = utilization × borrowApr × (1 − protocolTakeRate).
 * protocolTakeRatePct 는 퍼센트(예: 20). 반환 0~1 fraction.
 */
export function supplyAprFromCurve(
    util: number,
    points: CurvePoint[],
    protocolTakeRatePct: number,
): number
{
    const borrowApr = borrowAprFromCurve(util, points);
    const keepRate = 1 - protocolTakeRatePct / 100;
    return util * borrowApr * keepRate;
}
