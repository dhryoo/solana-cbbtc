import { PublicKey } from "@solana/web3.js";

// 저수준 codegen 디코더는 mock (실제 borsh 바이트 대신 우리가 만든 필드 객체 반환).
jest.mock(
    "@kamino-finance/klend-sdk/dist/@codegen/klend/accounts/Reserve",
    () => ({ Reserve: { decode: jest.fn() } }),
);
jest.mock(
    "@kamino-finance/klend-sdk/dist/@codegen/klend/accounts/Obligation",
    () => ({ Obligation: { decode: jest.fn() } }),
);

import { Reserve } from "@kamino-finance/klend-sdk/dist/@codegen/klend/accounts/Reserve";
import { Obligation } from "@kamino-finance/klend-sdk/dist/@codegen/klend/accounts/Obligation";

import {
    toNumber,
    sfToNumber,
    computeUtilization,
    mapReservesToMarketInfo,
    mapObligationToPosition,
    cbbtcCollateralAmount,
    deriveObligationPda,
    getMarketInfo,
    getUserPosition,
    type ReserveLike,
    type ObligationLike,
} from "./KaminoService";

// cbBTC main-market reserve (constants/lending 과 동일). obligation deposit 매칭용.
const CBBTC_RESERVE = "37Jk2zkz23vkAYBT66HM2gaqJuNg2nYLsCreQAVt5MWK";

// 테스트 간 mock 상태 격리 (codegen decoder 를 virtual mock 하므로 순서 의존 방지).
beforeEach(() => jest.clearAllMocks());

const SCALE = 2 ** 60;

// 사람이 읽는 값 → scaled fraction(2^60) BN-like 문자열.
function toSf(value: number): { toString(): string }
{
    // 큰 정수 정확도를 위해 BigInt 사용 (정수 부분만 — 테스트값은 정수 USD/토큰).
    return { toString: () => (BigInt(value) * (BigInt(2) ** BigInt(60))).toString() };
}

function bnLike(value: number): { toString(): string }
{
    return { toString: () => String(value) };
}

// base58 문자열을 toString() 으로 돌려주는 BN-like (depositReserve 매칭용).
function bnLike58(s: string): { toString(): string }
{
    return { toString: () => s };
}

const CURVE = [
    { utilizationRateBps: 0, borrowRateBps: 1 },
    { utilizationRateBps: 7000, borrowRateBps: 300 },
    { utilizationRateBps: 10000, borrowRateBps: 8100 },
];

function mockCbbtcReserve(): ReserveLike
{
    return {
        liquidity: {
            availableAmount: bnLike(9_000_000),
            borrowedAmountSf: toSf(1_000_000), // borrowed 1M → util 1M/10M = 0.1
            marketPriceSf: toSf(77_000),       // $77,000
            mintDecimals: bnLike(8),
        },
        // totalLiquidity(10M) == cTokenSupply(10M) → cToken 환율 1:1 (테스트 단순화).
        collateral: {
            mintTotalSupply: bnLike(10_000_000),
        },
        config: {
            protocolTakeRatePct: 20,
            borrowRateCurve: { points: CURVE },
        },
    };
}

function mockUsdcReserve(): ReserveLike
{
    return {
        liquidity: {
            availableAmount: bnLike(500),
            borrowedAmountSf: toSf(500),     // util 0.5
            marketPriceSf: toSf(1),
            mintDecimals: bnLike(6),
        },
        collateral: {
            mintTotalSupply: bnLike(1000),
        },
        config: {
            protocolTakeRatePct: 0,
            // 선형 0→10%: util 0.5 → 5%
            borrowRateCurve: { points: [
                { utilizationRateBps: 0, borrowRateBps: 0 },
                { utilizationRateBps: 10000, borrowRateBps: 1000 },
            ] },
        },
    };
}

describe("toNumber / sfToNumber", () =>
{
    it("toNumber 는 BN-like 를 number 로", () =>
    {
        expect(toNumber(bnLike(12345))).toBe(12345);
    });

    it("sfToNumber 는 2^60 으로 나눈다", () =>
    {
        expect(sfToNumber(toSf(0))).toBeCloseTo(0, 8);
        expect(sfToNumber(toSf(1))).toBeCloseTo(1, 8);
        expect(sfToNumber(toSf(5))).toBeCloseTo(5, 8);
        expect(sfToNumber({ toString: () => String(SCALE * 42) })).toBeCloseTo(42, 8);
    });
});

describe("computeUtilization", () =>
{
    it("borrowed / (available + borrowed)", () =>
    {
        expect(computeUtilization(900, 100)).toBeCloseTo(0.1, 8);
    });

    it("공급이 전혀 없으면 0 (0 나눗셈 가드)", () =>
    {
        expect(computeUtilization(0, 0)).toBe(0);
    });
});

describe("mapReservesToMarketInfo", () =>
{
    it("utilization / supply APR / borrow APR / price 매핑", () =>
    {
        const info = mapReservesToMarketInfo(mockCbbtcReserve(), mockUsdcReserve(), 123);
        expect(info.cbbtcUtilization).toBeCloseTo(0.1, 6);
        expect(info.cbbtcPriceUsd).toBeCloseTo(77_000, 1);
        // util 0.1 → borrow = (1 + (1000/7000)*(300-1))/10000 = 0.0043714; supply = util*borrow*(1-take)
        const expectedBorrow = (1 + (1000 / 7000) * (300 - 1)) / 10000;
        expect(info.cbbtcSupplyApr).toBeCloseTo(0.1 * expectedBorrow * 0.8, 7);
        expect(info.usdcBorrowApr).toBeCloseTo(0.05, 5);
        expect(info.refreshedAtSlot).toBe(123);
    });

    it("curve point 가 BN-like(toString) 여도 매핑", () =>
    {
        const cbbtc = mockCbbtcReserve();
        cbbtc.config.borrowRateCurve = { points: [
            { utilizationRateBps: bnLike(0), borrowRateBps: bnLike(1) },
            { utilizationRateBps: bnLike(10000), borrowRateBps: bnLike(8100) },
        ] };
        const info = mapReservesToMarketInfo(cbbtc, mockUsdcReserve(), 1);
        expect(info.cbbtcUtilization).toBeCloseTo(0.1, 6);
        expect(Number.isFinite(info.cbbtcSupplyApr)).toBe(true);
    });
});

describe("mapObligationToPosition", () =>
{
    it("포지션 없음(null) → 빈 포지션", () =>
    {
        const p = mapObligationToPosition(null, 0);
        expect(p.hasPosition).toBe(false);
        expect(p.suppliedUsd).toBe(0);
        expect(p.borrowedUsd).toBe(0);
        expect(p.healthFactor).toBeNull();
        expect(p.riskZone).toBe("none");
        expect(p.cbbtcLiquidationPriceUsd).toBeNull();
    });

    it("활성 포지션 → LTV/health/청산가 계산", () =>
    {
        const ob: ObligationLike = {
            depositedValueSf: toSf(1000),
            borrowedAssetsMarketValueSf: toSf(400),
            borrowFactorAdjustedDebtValueSf: toSf(400),
            allowedBorrowValueSf: toSf(650),
            unhealthyBorrowValueSf: toSf(800),
        };
        // 담보 0.01 cbBTC(≈ $1000 @ $100k). 청산가 = 부채400 / (0.01 × 임계0.8) = $50,000.
        const p = mapObligationToPosition(ob, 0.01);
        expect(p.hasPosition).toBe(true);
        expect(p.suppliedUsd).toBeCloseTo(1000, 2);
        expect(p.suppliedCbbtc).toBeCloseTo(0.01, 10); // 전달된 담보 수량 그대로
        expect(p.borrowedUsd).toBeCloseTo(400, 2);
        expect(p.netValueUsd).toBeCloseTo(600, 2);
        expect(p.currentLtv).toBeCloseTo(0.4, 5);
        expect(p.liquidationLtv).toBeCloseTo(0.8, 5);
        expect(p.healthFactor).toBeCloseTo(2.0, 5);
        expect(p.riskZone).toBe("safe");
        expect(p.cbbtcLiquidationPriceUsd).toBeCloseTo(50_000, 2);
        expect(p.maxBorrowableUsd).toBeCloseTo(250, 2); // allowed 650 − debt 400
    });

    it("예치만 있고 차입 없음 → health null, 청산가 null", () =>
    {
        const ob: ObligationLike = {
            depositedValueSf: toSf(1000),
            borrowedAssetsMarketValueSf: toSf(0),
            borrowFactorAdjustedDebtValueSf: toSf(0),
            allowedBorrowValueSf: toSf(650),
            unhealthyBorrowValueSf: toSf(800),
        };
        const p = mapObligationToPosition(ob, 0.01);
        expect(p.hasPosition).toBe(true);
        expect(p.healthFactor).toBeNull();
        expect(p.riskZone).toBe("none");
        expect(p.cbbtcLiquidationPriceUsd).toBeNull(); // 부채 0 → 청산가 없음
        expect(p.maxBorrowableUsd).toBeCloseTo(650, 2); // 차입 없음 → allowed 전액
    });
});

describe("cbbtcCollateralAmount", () =>
{
    it("cbBTC 예치가 없으면 0", () =>
    {
        const ob: ObligationLike = {
            depositedValueSf: toSf(0),
            borrowedAssetsMarketValueSf: toSf(0),
            borrowFactorAdjustedDebtValueSf: toSf(0),
            allowedBorrowValueSf: toSf(0),
            unhealthyBorrowValueSf: toSf(0),
            deposits: [],
        };
        expect(cbbtcCollateralAmount(ob, mockCbbtcReserve(), CBBTC_RESERVE)).toBe(0);
    });

    it("cToken 예치량 × 환율(1:1) / 10^8 = cbBTC 수량", () =>
    {
        const ob: ObligationLike = {
            depositedValueSf: toSf(0),
            borrowedAssetsMarketValueSf: toSf(0),
            borrowFactorAdjustedDebtValueSf: toSf(0),
            allowedBorrowValueSf: toSf(0),
            unhealthyBorrowValueSf: toSf(0),
            deposits: [{ depositReserve: bnLike58(CBBTC_RESERVE), depositedAmount: bnLike(1_000_000) }],
        };
        // 환율 1 (total 10M == supply 10M), decimals 8 → 1,000,000 / 1e8 = 0.01
        expect(cbbtcCollateralAmount(ob, mockCbbtcReserve(), CBBTC_RESERVE)).toBeCloseTo(0.01, 10);
    });

    it("cToken 환율이 1 이 아니면(이자 누적) 환율을 반영", () =>
    {
        // totalLiquidity 20M, cTokenSupply 10M → 환율 2. 500k cToken → 1M cbBTC base → 0.01 cbBTC.
        const reserve = mockCbbtcReserve();
        reserve.liquidity.availableAmount = bnLike(19_000_000);
        reserve.liquidity.borrowedAmountSf = toSf(1_000_000);
        reserve.collateral.mintTotalSupply = bnLike(10_000_000);
        const ob: ObligationLike = {
            depositedValueSf: toSf(0),
            borrowedAssetsMarketValueSf: toSf(0),
            borrowFactorAdjustedDebtValueSf: toSf(0),
            allowedBorrowValueSf: toSf(0),
            unhealthyBorrowValueSf: toSf(0),
            deposits: [{ depositReserve: bnLike58(CBBTC_RESERVE), depositedAmount: bnLike(500_000) }],
        };
        expect(cbbtcCollateralAmount(ob, reserve, CBBTC_RESERVE)).toBeCloseTo(0.01, 10);
    });
});

describe("deriveObligationPda", () =>
{
    it("SDK(kit) 유도와 동일한 PDA (cross-check)", () =>
    {
        // scratch 에서 SDK VanillaObligation.toPda 로 계산한 기준값
        const owner = new PublicKey("So11111111111111111111111111111111111111112");
        const pda = deriveObligationPda(owner);
        expect(pda.toBase58()).toBe("BqAVQC4SHR2UbU2Wwh45465Ez1YZ7SoC5niBLioBCgQq");
    });
});

describe("getMarketInfo", () =>
{
    it("두 reserve 를 fetch+decode 해서 매핑", async () =>
    {
        (Reserve.decode as jest.Mock)
            .mockReturnValueOnce(mockCbbtcReserve())
            .mockReturnValueOnce(mockUsdcReserve());
        const connection = {
            getSlot: jest.fn().mockResolvedValue(456),
            getMultipleAccountsInfo: jest.fn().mockResolvedValue([
                { data: Buffer.from([1]) },
                { data: Buffer.from([2]) },
            ]),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const info = await getMarketInfo(connection as any);
        expect(info.cbbtcUtilization).toBeCloseTo(0.1, 6);
        expect(info.refreshedAtSlot).toBe(456);
    });

    it("reserve 계정이 없으면 에러", async () =>
    {
        const connection = {
            getSlot: jest.fn().mockResolvedValue(1),
            getMultipleAccountsInfo: jest.fn().mockResolvedValue([null, null]),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await expect(getMarketInfo(connection as any)).rejects.toThrow();
    });
});

describe("getUserPosition", () =>
{
    afterEach(() => jest.clearAllMocks());

    it("obligation 없음 → 빈 포지션", async () =>
    {
        (Reserve.decode as jest.Mock).mockReturnValueOnce(mockCbbtcReserve());
        const owner = new PublicKey("So11111111111111111111111111111111111111112");
        const connection = {
            getMultipleAccountsInfo: jest.fn().mockResolvedValue([
                null,                       // obligation 없음
                { data: Buffer.from([1]) }, // cbbtc reserve (price)
            ]),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = await getUserPosition(connection as any, owner);
        expect(p.hasPosition).toBe(false);
    });

    it("활성 obligation → 포지션 매핑", async () =>
    {
        (Obligation.decode as jest.Mock).mockReturnValueOnce({
            depositedValueSf: toSf(1000),
            borrowedAssetsMarketValueSf: toSf(400),
            borrowFactorAdjustedDebtValueSf: toSf(400),
            allowedBorrowValueSf: toSf(650),
            unhealthyBorrowValueSf: toSf(800),
            // cbBTC 예치 1,000,000 cToken × 환율 1 / 10^8 = 0.01 cbBTC.
            deposits: [{ depositReserve: bnLike58(CBBTC_RESERVE), depositedAmount: bnLike(1_000_000) }],
        });
        (Reserve.decode as jest.Mock).mockReturnValueOnce(mockCbbtcReserve());
        const owner = new PublicKey("So11111111111111111111111111111111111111112");
        const connection = {
            getMultipleAccountsInfo: jest.fn().mockResolvedValue([
                { data: Buffer.from([9]) }, // obligation
                { data: Buffer.from([1]) }, // cbbtc reserve
            ]),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = await getUserPosition(connection as any, owner);
        expect(p.hasPosition).toBe(true);
        expect(p.currentLtv).toBeCloseTo(0.4, 5);
        // 청산가 = 부채400 / (0.01 cbBTC × 임계0.8) = $50,000 (fresh 가격 무관).
        expect(p.cbbtcLiquidationPriceUsd).toBeCloseTo(50_000, 1);
    });

    it("cbBTC reserve 계정이 없으면 에러", async () =>
    {
        const owner = new PublicKey("So11111111111111111111111111111111111111112");
        const connection = {
            getMultipleAccountsInfo: jest.fn().mockResolvedValue([null, null]),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await expect(getUserPosition(connection as any, owner)).rejects.toThrow();
    });
});
