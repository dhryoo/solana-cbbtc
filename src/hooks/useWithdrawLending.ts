import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { useWallet } from "@/hooks/useWallet";
import { summarizeSimulationError } from "@/hooks/useSupplyLending";
import { useConnection } from "@/providers/ConnectionProvider";
import { buildWithdrawTransaction } from "@/services/KaminoTxBuilder";
import { signAndSendTransactions } from "@/services/WalletService";
import { isOracleStaleError } from "@/utils/lendingErrors";
import type { TxStep } from "@/utils/txProgress";

export interface WithdrawInput
{
    liquidityBase: bigint; // 부분 인출 시 cbBTC base. withdrawAll 이면 무시.
    withdrawAll: boolean;
    allowOracleStale?: boolean;
    onStep?: (step: TxStep) => void;
}

export interface WithdrawResult
{
    signature: string;
}

/** cbBTC 인출 mutation. build → simulate(서명 전 게이트) → MWA 서명·전송. */
export function useWithdrawLending(): UseMutationResult<WithdrawResult, Error, WithdrawInput>
{
    const connection = useConnection();
    const { account } = useWallet();
    const queryClient = useQueryClient();

    return useMutation<WithdrawResult, Error, WithdrawInput>({
        mutationFn: async ({ liquidityBase, withdrawAll, allowOracleStale, onStep }) =>
        {
            if (!account)
            {
                throw new Error("Wallet is not connected.");
            }
            const step = (s: TxStep): void =>
            {
                onStep?.(s);
            };

            step("preparing");
            const tx = await buildWithdrawTransaction(connection, account.publicKey, { liquidityBase, withdrawAll });

            step("simulating");
            const sim = await connection.simulateTransaction(tx, {
                sigVerify: false,
                replaceRecentBlockhash: true,
            });
            if (sim.value.err)
            {
                const msg = summarizeSimulationError(sim.value.err, sim.value.logs);
                if (!(allowOracleStale && isOracleStaleError(msg)))
                {
                    if (__DEV__)
                    {
                        // 사전 시뮬레이션 실패는 잔액 부족 등 '예상된 사용자 사유'가 많고 UI 안내로 처리된다 →
                        // 빨간 error 가 아니라 warn 으로 (release 엔 __DEV__ 라 어차피 안 찍힘).
                        // eslint-disable-next-line no-console
                        console.warn("[withdraw] simulation failed", { err: sim.value.err, logs: sim.value.logs });
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
            void queryClient.invalidateQueries({ queryKey: ["history"] });
        },
    });
}
