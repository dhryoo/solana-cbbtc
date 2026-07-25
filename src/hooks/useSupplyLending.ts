import { type UseMutationResult } from "@tanstack/react-query";

import { useLendingTxMutation, type LendingTxResult } from "@/hooks/useLendingTxMutation";
import { buildSupplyTransaction } from "@/services/KaminoTxBuilder";
import type { TxStep } from "@/utils/txProgress";

// summarizeSimulationError 는 공용 헬퍼로 이동했지만, 기존 import 경로 호환을 위해 재노출.
export { summarizeSimulationError } from "@/hooks/useLendingTxMutation";

export interface SupplyInput
{
    amountBase: bigint;
    // 진행 단계 콜백 (UI stepper 연동). done 은 화면 onSuccess 에서 표시.
    onStep?: (step: TxStep) => void;
}

export type SupplyResult = LendingTxResult;

/**
 * cbBTC 공급 mutation. build → simulate(서명 전 게이트) → MWA 서명·전송.
 * 실자금 보호를 위해 시뮬레이션이 실패하면 서명하지 않고 에러를 던진다.
 */
export function useSupplyLending(): UseMutationResult<SupplyResult, Error, SupplyInput>
{
    return useLendingTxMutation<SupplyInput>(
        "supply",
        (connection, owner, { amountBase }) => buildSupplyTransaction(connection, owner, amountBase),
    );
}
