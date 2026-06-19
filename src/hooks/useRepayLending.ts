import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { useWallet } from "@/hooks/useWallet";
import { summarizeSimulationError } from "@/hooks/useSupplyLending";
import { useConnection } from "@/providers/ConnectionProvider";
import { buildRepayTransaction } from "@/services/KaminoTxBuilder";
import { signAndSendTransactions } from "@/services/WalletService";
import { isOracleStaleError } from "@/utils/lendingErrors";
import type { TxStep } from "@/utils/txProgress";

export interface RepayInput
{
    usdcAmountBase: bigint; // 부분 상환 시 USDC base. repayAll 이면 무시.
    repayAll: boolean;
    allowOracleStale?: boolean;
    onStep?: (step: TxStep) => void;
}

export interface RepayResult
{
    signature: string;
}

/** USDC 상환 mutation. build → simulate(서명 전 게이트) → MWA 서명·전송. */
export function useRepayLending(): UseMutationResult<RepayResult, Error, RepayInput>
{
    const connection = useConnection();
    const { account } = useWallet();
    const queryClient = useQueryClient();

    return useMutation<RepayResult, Error, RepayInput>({
        mutationFn: async ({ usdcAmountBase, repayAll, allowOracleStale, onStep }) =>
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
            const tx = await buildRepayTransaction(connection, account.publicKey, { usdcAmountBase, repayAll });

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
                        // eslint-disable-next-line no-console
                        console.error("[repay] simulation failed", { err: sim.value.err, logs: sim.value.logs });
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
