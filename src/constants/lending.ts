import { PublicKey } from "@solana/web3.js";

import { HEALTH_SAFE_MIN, HEALTH_CAUTION_MIN } from "@/utils/lendingMath";

// Kamino lending 통합 상수.
//
// 위험 임계(HEALTH_*)의 단일 출처는 utils/lendingMath.ts. 여기서는 재노출만 한다
// (UI/consent 가 constants 한 곳에서 lending 정책을 import 하도록).

// Kamino K-Lend on-chain program (mainnet). @codegen/klend/programId 와 동일.
export const KLEND_PROGRAM_ID = "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD";

// Kamino Farms program — reserve 에 farm 이 붙은 경우 deposit/borrow 시 farm refresh 에 필요.
export const FARMS_PROGRAM_ID = "FarmsPZpWu9i7Kky8tPN37rs2TpmMrAZrC7S7vJa91Hr";

// Kamino main market (Solana mainnet). M8.4 에서 KaminoMarket.load 로 검증.
export const KAMINO_MAIN_MARKET = "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF";

// Reserve 주소 (main market). M8.4 에서 getReserveBySymbol 로 확인 (2026-05-21).
export const CBBTC_RESERVE = "37Jk2zkz23vkAYBT66HM2gaqJuNg2nYLsCreQAVt5MWK";
export const USDC_RESERVE = "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59";

export function klendProgramPubkey(): PublicKey
{
    return new PublicKey(KLEND_PROGRAM_ID);
}

export function farmsProgramPubkey(): PublicKey
{
    return new PublicKey(FARMS_PROGRAM_ID);
}

export function kaminoMainMarketPubkey(): PublicKey
{
    return new PublicKey(KAMINO_MAIN_MARKET);
}

export function cbbtcReservePubkey(): PublicKey
{
    return new PublicKey(CBBTC_RESERVE);
}

export function usdcReservePubkey(): PublicKey
{
    return new PublicKey(USDC_RESERVE);
}

// 보수적 LTV 정책 (D-6: 위험 강조). cbBTC 담보로 차입 시 적용.
export const RECOMMENDED_MAX_LTV = 0.5;  // 첫 안내 권장 상한
export const WARN_LTV = 0.6;             // 이 이상이면 명시적 경고 표시

// 렌딩 tx priority fee (compute unit price, microLamports/CU).
// swap 경로(JupiterService)는 Jupiter 가 서버에서 priority fee 를 넣어주지만, 렌딩 tx 는 이 앱이
// 직접 조립하므로 ComputeBudget instruction 을 직접 넣어야 한다. 없으면 0 microLamport 로 방송돼
// 혼잡 시 뒤로 밀리거나 드롭되고, signAndSendTransactions 는 재방송이 없어 waitForConfirmation 이
// 90초를 소진한 뒤 confirm_timeout 으로 실패한다.
// compute unit LIMIT 은 일부러 설정하지 않는다 — 렌딩 tx 는 Kamino scope refresh 로 CU 소모가 크고
// 시뮬레이션 없이 한계를 고정하면 CU 초과로 오히려 실패할 수 있다. LIMIT 미설정 시 기본 상한
// (200k×ix 수, 최대 1.4M)이 적용되며, 실제 priority fee = price × 그 한계 ≈ 0.0001~0.00014 SOL 로
// MIN_SOL_GAS_RESERVE_SOL(0.002) 안에서 충분히 보수적이다.
// TODO(후속): 훅의 simulateTransaction unitsConsumed 로 정확한 CU limit 을 붙이고 price 를 동적화.
export const LENDING_COMPUTE_UNIT_PRICE_MICROLAMPORTS = 100_000;

// cbBTC 최소 공급량 (base unit, decimals=8). = 0.000001 cbBTC.
// liquidity→collateral(cToken) 변환 시 환율(≈1.0004 underlying/cToken) 때문에 너무 작은
// 금액(1~2 unit)은 0 cToken 으로 내림되어 on-chain 6003(InvalidAmount) 발생.
// 100 unit 이면 현재 ~99 cToken 으로 충분한 여유 (환율 변동에도 안전).
export const MIN_CBBTC_SUPPLY_BASE = 100n;

// 위험 구간 health 임계 (재노출 — 단일 출처는 lendingMath).
export { HEALTH_SAFE_MIN, HEALTH_CAUTION_MIN };
