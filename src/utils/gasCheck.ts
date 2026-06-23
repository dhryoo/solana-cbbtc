// SOL 을 가스(네트워크 수수료 + 신규 계정 rent)로 쓰는 모든 온체인 작업의 공통 사전 점검.
//
// WHY: Swap·Lightning 받기는 이미 각자 SOL 사전 검사가 있었으나, Earn(공급/인출/차입/상환)과
// Lightning 보내기는 SOL 이 거의 0 이어도 시도 후 시뮬레이션/온체인에서야 실패했다.
// 그 실패가 `InstructionError:[n,{Custom:1}]`(System Program ResultWithNegativeLamports = SOL 부족)
// 같은 암호 같은 코드로 떠서 원인 파악이 어려웠다. 그래서 "가스로 쓸 SOL 이 부족할 수 있다"고
// 미리 안내하는 공용 임계치를 둔다.
//
// 이 검사는 하드 차단이 아니라 경고용이다 — Earn 은 서명 전 시뮬레이션이 실제 차단을 담당하고,
// 작업별 실제 비용은 크게 달라 단일 임계치로 하드 차단하면 오탐(정상 거래 차단)이 생긴다.
// 따라서 floor 미만이면 "부족할 수 있음"만 알린다.

// 반복 작업(이미 obligation 이 있는 공급/인출/차입/상환, Lightning 보내기)용 기본 floor.
// 수수료 + 단발 ATA rent 수준. 0.01 SOL — Lightning 받기 claim floor 와 통일.
export const LOW_SOL_GAS_THRESHOLD_LAMPORTS = 10_000_000n; // 0.01 SOL

// 첫 공급(obligation 미존재) floor. buildSupplyTransaction 는 신규 사용자면
// initUserMetadata + initObligation + initObligationFarmsForReserve + cbBTC ATA 를 함께 생성한다.
// rent-exempt 합계 ≈ obligation(~0.024) + userMetadata(~0.008) + farm(~0.007) + ATA(~0.002) + fees ≈ 0.04+.
// 0.045 로 보수적으로 잡아, 0.01~0.04 구간(경고는 안 뜨는데 시뮬레이션에선 실패하던 사각지대)을 덮는다.
export const FIRST_SUPPLY_GAS_THRESHOLD_LAMPORTS = 45_000_000n; // 0.045 SOL

/**
 * 가스로 쓸 SOL 이 부족할 가능성이 있는지.
 * 잔액이 아직 로딩되지 않았으면(undefined/null) 경고하지 않는다(false) — 로딩 깜빡임 방지.
 * threshold 는 작업별로 달리 줄 수 있다(기본=반복 작업 floor).
 */
export function isSolGasLow(
    solLamports: bigint | undefined | null,
    threshold: bigint = LOW_SOL_GAS_THRESHOLD_LAMPORTS,
): boolean
{
    if (solLamports === undefined || solLamports === null)
    {
        return false;
    }
    return solLamports < threshold;
}
