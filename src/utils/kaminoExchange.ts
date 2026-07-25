// Kamino collateral(cToken) ↔ liquidity(underlying) 환율 변환 (bigint, floor).
//   collateral = liquidity × cTokenSupply / totalLiquidity
//   liquidity  = collateral × totalLiquidity / cTokenSupply
// totalLiquidity = reserve.liquidity.availableAmount + borrowedAmount(=borrowedAmountSf >> 60).
// cTokenSupply  = reserve.collateral.mintTotalSupply.

export function collateralFromLiquidity(
    liquidityBase: bigint,
    totalLiquidityBase: bigint,
    cTokenSupply: bigint,
): bigint
{
    if (totalLiquidityBase <= 0n)
    {
        return 0n;
    }
    return (liquidityBase * cTokenSupply) / totalLiquidityBase;
}

export function liquidityFromCollateral(
    collateralBase: bigint,
    totalLiquidityBase: bigint,
    cTokenSupply: bigint,
): bigint
{
    if (cTokenSupply <= 0n)
    {
        return 0n;
    }
    return (collateralBase * totalLiquidityBase) / cTokenSupply;
}

/**
 * reserve 의 총 공급 유동성(base unit). Kamino 의 getTotalSupply 와 동일하게 미정산 수수료를 뺀다:
 *   total = availableAmount + borrowed − accumulatedProtocolFees − accumulatedReferrerFees − pendingReferrerFees
 * availableAmount 는 base u64, 나머지는 Sf(60-bit scaled fraction) 이므로 Sf 공간에서 먼저 빼고
 * 한 번만 floor(>>60)해 fraction 손실을 줄인다. 수수료를 빼지 않으면 환율 분모가 과대평가돼
 * 부분 인출이 cToken 을 너무 적게 소각(사용자가 요청보다 적게 수령)한다 (R31).
 * 이론상 total 이 음수가 되면 0 으로 clamp.
 */
export function reserveTotalLiquidity(
    availableBase: bigint,
    borrowedSf: bigint,
    accumulatedProtocolFeesSf: bigint = 0n,
    accumulatedReferrerFeesSf: bigint = 0n,
    pendingReferrerFeesSf: bigint = 0n,
): bigint
{
    const netBorrowedSf = borrowedSf - accumulatedProtocolFeesSf - accumulatedReferrerFeesSf - pendingReferrerFeesSf;
    const total = availableBase + (netBorrowedSf >> 60n);
    return total > 0n ? total : 0n;
}
