import type { PublicKey } from "@solana/web3.js";

import type { RiskZone } from "@/utils/lendingMath";

// Kamino lending 관련 글로벌 타입.
//
// 경계 원칙(M8 결정): klend-sdk 는 @solana/kit(web3.js 2.0) 타입을 쓰지만,
// 이 타입들은 모두 web3.js v1(PublicKey) 기준이다. v1 ↔ v2 변환은 KaminoService
// 내부에 캡슐화하고, 앱의 컴포넌트/훅/타입은 v1 만 본다.
//
// 금액은 base unit bigint (JupiterService/QuoteParams 와 동일 컨벤션).
// 비율(LTV, APR)은 0~1 fraction, 가격/가치는 USD number (위험표시용, 정산액 아님).

/** 마켓 단위 lending 정보 (Earn 화면 표시용). */
export interface LendingMarketInfo
{
    cbbtcUtilization: number;   // 0~1
    cbbtcSupplyApr: number;     // 0~1 (supply APY 근사)
    usdcBorrowApr: number;      // 0~1
    cbbtcPriceUsd: number;
    refreshedAtSlot: number;
}

/** 사용자 포지션 (예치 + 차입 합산, 위험 지표 포함). */
export interface KaminoPosition
{
    hasPosition: boolean;
    suppliedUsd: number;
    suppliedCbbtc: number;                // 예치된 cbBTC 수량(human) — cToken×환율, 가격 무관
    borrowedUsd: number;
    netValueUsd: number;
    currentLtv: number;                   // 0~1
    liquidationLtv: number;               // 0~1
    healthFactor: number | null;          // 차입 없으면 null
    riskZone: RiskZone;
    cbbtcLiquidationPriceUsd: number | null;
    maxBorrowableUsd: number;             // 추가 차입 가능 한도 (USD ≈ USDC)
}

/** 공급 시 예상 수익 견적 (LendingQuoteService). */
export interface SupplyQuote
{
    amountBase: bigint;
    estimatedSupplyApr: number;   // 0~1
    estimatedAnnualYieldUsd: number;
}

// --- 트랜잭션 빌드 파라미터 (owner 는 v1 PublicKey, 서비스 경계에서 변환) ---

export interface SupplyParams
{
    amountBase: bigint;
    owner: PublicKey;
}

export interface WithdrawParams
{
    amountBase: bigint;
    owner: PublicKey;
}

export interface BorrowParams
{
    amountBase: bigint;
    owner: PublicKey;
}

export interface RepayParams
{
    amountBase: bigint;
    owner: PublicKey;
}
