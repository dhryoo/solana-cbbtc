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
