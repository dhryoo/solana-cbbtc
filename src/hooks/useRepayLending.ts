import { type UseMutationResult } from "@tanstack/react-query";

import { useLendingTxMutation, type LendingTxResult } from "@/hooks/useLendingTxMutation";
import { buildRepayTransaction } from "@/services/KaminoTxBuilder";
import type { TxStep } from "@/utils/txProgress";

export interface RepayInput
{
    usdcAmountBase: bigint; // 부분 상환 시 USDC base. repayAll 이면 무시.
    repayAll: boolean;
    onStep?: (step: TxStep) => void;
}

export type RepayResult = LendingTxResult;

/** USDC 상환 mutation. build → simulate(서명 전 게이트) → MWA 서명·전송. */
export function useRepayLending(): UseMutationResult<RepayResult, Error, RepayInput>
{
    return useLendingTxMutation<RepayInput>(
        "repay",
        (connection, owner, { usdcAmountBase, repayAll }) =>
            buildRepayTransaction(connection, owner, { usdcAmountBase, repayAll }),
    );
}
