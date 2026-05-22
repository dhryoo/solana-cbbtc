import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { useWallet } from "@/hooks/useWallet";
import { summarizeSimulationError } from "@/hooks/useSupplyLending";
import { useConnection } from "@/providers/ConnectionProvider";
import { buildBorrowTransaction } from "@/services/KaminoTxBuilder";
import { signAndSendTransactions } from "@/services/WalletService";
import { isOracleStaleError } from "@/utils/lendingErrors";
import type { TxStep } from "@/utils/txProgress";

export interface BorrowInput
{
    usdcAmountBase: bigint;
    // 오라클 stale(6039/6009) 시뮬 실패를 무시하고 진행 (실제 전송은 지갑 RPC). 기본 false.
    allowOracleStale?: boolean;
    onStep?: (step: TxStep) => void;
}

export interface BorrowResult
{
    signature: string;
}

/** USDC 차입 mutation. build → simulate(서명 전 게이트) → MWA 서명·전송. */
export function useBorrowLending(): UseMutationResult<BorrowResult, Error, BorrowInput>
{
    const connection = useConnection();
    const { account } = useWallet();
    const queryClient = useQueryClient();

    return useMutation<BorrowResult, Error, BorrowInput>({
        mutationFn: async ({ usdcAmountBase, allowOracleStale, onStep }) =>
        {
            if (!account)
            {
                throw new Error("Wallet is not connected.");
            }
            const step = (s: TxStep): void =>
            {
                onStep?.(s);
                if (__DEV__)
                {
                    // eslint-disable-next-line no-console
                    console.log(`[borrow] ${s}`);
                }
            };

            step("preparing");
            const tx = await buildBorrowTransaction(connection, account.publicKey, usdcAmountBase);

            step("simulating");
            const sim = await connection.simulateTransaction(tx, {
                sigVerify: false,
                replaceRecentBlockhash: true,
            });
            if (sim.value.err)
            {
                const msg = summarizeSimulationError(sim.value.err, sim.value.logs);
                // 오라클 stale 은 외부 RPC 신선도 문제 — 사용자가 허용하면 지갑 RPC 로 전송 진행.
                if (!(allowOracleStale && isOracleStaleError(msg)))
                {
                    if (__DEV__)
                    {
                        // eslint-disable-next-line no-console
                        console.error("[borrow] simulation failed", { err: sim.value.err, logs: sim.value.logs });
                    }
                    throw new Error(msg);
                }
            }

            step("signing");
            const signatures = await signAndSendTransactions([tx], account.authToken);
            const first = signatures[0];
            if (!first)
            {
                throw new Error("No transaction signature was returned.");
            }
            step("sending");
            return { signature: first };
        },
        onSuccess: () =>
        {
            void queryClient.invalidateQueries({ queryKey: ["kamino"] });
            void queryClient.invalidateQueries({ queryKey: ["balance"] });
        },
    });
}
