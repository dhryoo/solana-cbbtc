import { Connection, PublicKey } from "@solana/web3.js";

// 저수준 codegen 디코더만 사용 (high-level classes/ 는 Orca WASM 으로 RN 번들 불가 — M9 GATE).
import { Reserve } from "@kamino-finance/klend-sdk/dist/@codegen/klend/accounts/Reserve";
import { Obligation } from "@kamino-finance/klend-sdk/dist/@codegen/klend/accounts/Obligation";

import {
    cbbtcReservePubkey,
    usdcReservePubkey,
    kaminoMainMarketPubkey,
    klendProgramPubkey,
} from "@/constants/lending";
import type { LendingMarketInfo, KaminoPosition } from "@/types/kamino";
import {
    borrowAprFromCurve,
    supplyAprFromCurve,
    healthFactor,
    liquidationPriceFromCollateral,
    riskZone,
    type CurvePoint,
} from "@/utils/lendingMath";
import { liquidityFromCollateral } from "@/utils/kaminoExchange";

// Kamino 의 scaled fraction 스케일 = 2^60 (Fraction.FRACTIONS = 60). M8.4 실측 검증.
const FRACTION_SCALE = 2 ** 60;

// --- codegen 디코드 결과의 구조적 타입 (런타임 SDK 타입에 직접 의존하지 않기 위해 최소 형태만) ---

interface BNLike
{
    toString(): string;
}

export interface ReserveLike
{
    liquidity: {
        availableAmount: BNLike;
        borrowedAmountSf: BNLike;
        marketPriceSf: BNLike;
        mintDecimals: BNLike;
    };
    collateral: {
        mintTotalSupply: BNLike;
    };
    config: {
        protocolTakeRatePct: number;
        borrowRateCurve: { points: { utilizationRateBps: number | BNLike; borrowRateBps: number | BNLike }[] };
    };
}

export interface ObligationLike
{
    depositedValueSf: BNLike;
    borrowedAssetsMarketValueSf: BNLike;
    borrowFactorAdjustedDebtValueSf: BNLike;
    allowedBorrowValueSf: BNLike;
    unhealthyBorrowValueSf: BNLike;
    deposits?: { depositReserve: BNLike; depositedAmount: BNLike }[];
}

// --- 순수 변환/계산 ---

/** BN-like(정수) → number. */
export function toNumber(v: BNLike): number
{
    return Number(v.toString());
}

/** scaled fraction(2^60) → number. */
export function sfToNumber(sf: BNLike): number
{
    return Number(sf.toString()) / FRACTION_SCALE;
}

/** utilization = borrowed / (available + borrowed). 둘 다 base unit. */
export function computeUtilization(availableBase: number, borrowedBase: number): number
{
    const total = availableBase + borrowedBase;
    return total <= 0 ? 0 : borrowedBase / total;
}

function curvePoints(reserve: ReserveLike): CurvePoint[]
{
    return reserve.config.borrowRateCurve.points.map((p) => ({
        utilizationRateBps: Number(typeof p.utilizationRateBps === "number" ? p.utilizationRateBps : p.utilizationRateBps.toString()),
        borrowRateBps: Number(typeof p.borrowRateBps === "number" ? p.borrowRateBps : p.borrowRateBps.toString()),
    }));
}

function reserveUtilization(reserve: ReserveLike): number
{
    const available = toNumber(reserve.liquidity.availableAmount);
    const borrowed = sfToNumber(reserve.liquidity.borrowedAmountSf);
    return computeUtilization(available, borrowed);
}

/** 두 reserve(cbBTC 담보, USDC 차입) → 마켓 표시 정보. */
export function mapReservesToMarketInfo(
    cbbtc: ReserveLike,
    usdc: ReserveLike,
    slot: number,
): LendingMarketInfo
{
    const cbbtcUtil = reserveUtilization(cbbtc);
    const usdcUtil = reserveUtilization(usdc);
    return {
        cbbtcUtilization: cbbtcUtil,
        cbbtcSupplyApr: supplyAprFromCurve(cbbtcUtil, curvePoints(cbbtc), cbbtc.config.protocolTakeRatePct),
        usdcBorrowApr: borrowAprFromCurve(usdcUtil, curvePoints(usdc)),
        cbbtcPriceUsd: sfToNumber(cbbtc.liquidity.marketPriceSf),
        refreshedAtSlot: slot,
    };
}

/** cbBTC 담보 수량(human units). obligation 의 cToken 예치량 × reserve 환율.
 *  청산가를 가격 드리프트 없이 계산하기 위해 필요. cbBTC 예치가 없으면 0. */
export function cbbtcCollateralAmount(
    obligation: ObligationLike,
    reserve: ReserveLike,
    cbbtcReserveKey: string,
): number
{
    const deposit = (obligation.deposits ?? []).find((d) => d.depositReserve.toString() === cbbtcReserveKey);
    if (!deposit)
    {
        return 0;
    }
    const collateralCToken = BigInt(deposit.depositedAmount.toString());
    const available = BigInt(reserve.liquidity.availableAmount.toString());
    const borrowedSf = BigInt(reserve.liquidity.borrowedAmountSf.toString());
    const totalLiquidity = available + (borrowedSf >> 60n);
    const cTokenSupply = BigInt(reserve.collateral.mintTotalSupply.toString());
    const liquidityBase = liquidityFromCollateral(collateralCToken, totalLiquidity, cTokenSupply);
    const decimals = Number(reserve.liquidity.mintDecimals.toString());
    return Number(liquidityBase) / 10 ** decimals;
}

/** Obligation(또는 없음) → 사용자 포지션 + 위험 지표.
 *  청산가는 cbBTC 단일 담보 가정 (우리 앱의 주 시나리오). 혼합 담보면 근사값.
 *  cbbtcCollateralAmount = 예치된 cbBTC 수량(human). 청산가를 fresh 가격이 아닌 수량으로 역산해
 *  가격 드리프트 오차를 없앤다(R02). */
export function mapObligationToPosition(
    obligation: ObligationLike | null,
    cbbtcCollateralAmount: number,
): KaminoPosition
{
    if (!obligation)
    {
        return emptyPosition();
    }

    const suppliedUsd = sfToNumber(obligation.depositedValueSf);
    const borrowedUsd = sfToNumber(obligation.borrowedAssetsMarketValueSf);
    const bfDebtUsd = sfToNumber(obligation.borrowFactorAdjustedDebtValueSf);
    const allowedBorrowUsd = sfToNumber(obligation.allowedBorrowValueSf);
    const unhealthyUsd = sfToNumber(obligation.unhealthyBorrowValueSf);

    const currentLtv = suppliedUsd > 0 ? bfDebtUsd / suppliedUsd : 0;
    const liquidationLtv = suppliedUsd > 0 ? unhealthyUsd / suppliedUsd : 0;
    const hf = healthFactor(currentLtv, liquidationLtv);
    // 추가로 차입 가능한 한도(USD). allowedBorrowValue(담보×maxLTV) − 현재 bf 조정 부채.
    // borrow factor ~1 인 USDC 기준 ≈ 차입 가능 USDC. 음수 방지.
    const maxBorrowableUsd = Math.max(0, allowedBorrowUsd - bfDebtUsd);

    return {
        hasPosition: suppliedUsd > 0 || borrowedUsd > 0,
        suppliedUsd,
        borrowedUsd,
        netValueUsd: suppliedUsd - borrowedUsd,
        currentLtv,
        liquidationLtv,
        healthFactor: hf,
        riskZone: riskZone(hf),
        cbbtcLiquidationPriceUsd: liquidationPriceFromCollateral(bfDebtUsd, cbbtcCollateralAmount, liquidationLtv),
        maxBorrowableUsd,
    };
}

function emptyPosition(): KaminoPosition
{
    return {
        hasPosition: false,
        suppliedUsd: 0,
        borrowedUsd: 0,
        netValueUsd: 0,
        currentLtv: 0,
        liquidationLtv: 0,
        healthFactor: null,
        riskZone: "none",
        cbbtcLiquidationPriceUsd: null,
        maxBorrowableUsd: 0,
    };
}

/** 사용자의 vanilla obligation PDA (web3.js v1). SDK 의 kit 기반 유도와 동일.
 *  seeds: [tag=0, id=0, owner, market, default, default]. */
export function deriveObligationPda(owner: PublicKey): PublicKey
{
    const market = kaminoMainMarketPubkey();
    const [pda] = PublicKey.findProgramAddressSync(
        [
            Buffer.from([0]),                  // tag (Vanilla)
            Buffer.from([0]),                  // id
            owner.toBuffer(),
            market.toBuffer(),
            PublicKey.default.toBuffer(),      // seed1
            PublicKey.default.toBuffer(),      // seed2
        ],
        klendProgramPubkey(),
    );
    return pda;
}

// --- I/O (RPC fetch + decode) ---

/** cbBTC + USDC reserve 를 읽어 마켓 정보 반환. */
export async function getMarketInfo(connection: Connection): Promise<LendingMarketInfo>
{
    const [slot, accounts] = await Promise.all([
        connection.getSlot(),
        connection.getMultipleAccountsInfo([cbbtcReservePubkey(), usdcReservePubkey()]),
    ]);
    const [cbbtcAcc, usdcAcc] = accounts;
    if (!cbbtcAcc || !usdcAcc)
    {
        throw new Error("Kamino reserve account not found (cbBTC/USDC)");
    }
    const cbbtc = Reserve.decode(cbbtcAcc.data) as unknown as ReserveLike;
    const usdc = Reserve.decode(usdcAcc.data) as unknown as ReserveLike;
    return mapReservesToMarketInfo(cbbtc, usdc, slot);
}

/** 사용자 포지션 반환. obligation 미존재 시 빈 포지션. cbBTC 가격은 reserve 에서. */
export async function getUserPosition(
    connection: Connection,
    owner: PublicKey,
): Promise<KaminoPosition>
{
    const obligationPda = deriveObligationPda(owner);
    const [obligationAcc, cbbtcAcc] = await connection.getMultipleAccountsInfo([
        obligationPda,
        cbbtcReservePubkey(),
    ]);
    if (!cbbtcAcc)
    {
        throw new Error("Kamino cbBTC reserve account not found");
    }
    const cbbtc = Reserve.decode(cbbtcAcc.data) as unknown as ReserveLike;

    if (!obligationAcc)
    {
        return mapObligationToPosition(null, 0);
    }
    const obligation = Obligation.decode(obligationAcc.data) as unknown as ObligationLike;
    // 청산가는 예치 cbBTC 수량으로 역산(가격 드리프트 무관). fresh reserve 가격을 곱하던 이전 방식은
    // obligation LTV(마지막 refresh)와 스냅샷이 어긋나 청산가를 잘못 표시했음(R02).
    const collateral = cbbtcCollateralAmount(obligation, cbbtc, cbbtcReservePubkey().toBase58());
    return mapObligationToPosition(obligation, collateral);
}
