import { type UseMutationResult } from "@tanstack/react-query";

import { useLendingTxMutation, type LendingTxResult } from "@/hooks/useLendingTxMutation";
import { buildWithdrawTransaction } from "@/services/KaminoTxBuilder";
import type { TxStep } from "@/utils/txProgress";

export interface WithdrawInput
{
    liquidityBase: bigint; // 부분 인출 시 cbBTC base. withdrawAll 이면 무시.
    withdrawAll: boolean;
    onStep?: (step: TxStep) => void;
}

export type WithdrawResult = LendingTxResult;

/** cbBTC 인출 mutation. build → simulate(서명 전 게이트) → MWA 서명·전송. */
export function useWithdrawLending(): UseMutationResult<WithdrawResult, Error, WithdrawInput>
{
    return useLendingTxMutation<WithdrawInput>(
        "withdraw",
        (connection, owner, { liquidityBase, withdrawAll }) =>
            buildWithdrawTransaction(connection, owner, { liquidityBase, withdrawAll }),
    );
}
