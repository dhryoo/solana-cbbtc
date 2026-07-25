import { type UseMutationResult } from "@tanstack/react-query";

import { useLendingTxMutation, type LendingTxResult } from "@/hooks/useLendingTxMutation";
import { buildBorrowTransaction } from "@/services/KaminoTxBuilder";
import type { TxStep } from "@/utils/txProgress";

export interface BorrowInput
{
    usdcAmountBase: bigint;
    onStep?: (step: TxStep) => void;
}

export type BorrowResult = LendingTxResult;

/** USDC 차입 mutation. build → simulate(서명 전 게이트) → MWA 서명·전송. */
export function useBorrowLending(): UseMutationResult<BorrowResult, Error, BorrowInput>
{
    return useLendingTxMutation<BorrowInput>(
        "borrow",
        (connection, owner, { usdcAmountBase }) => buildBorrowTransaction(connection, owner, usdcAmountBase),
    );
}
