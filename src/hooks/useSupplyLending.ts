import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { useWallet } from "@/hooks/useWallet";
import { useConnection } from "@/providers/ConnectionProvider";
import { buildSupplyTransaction } from "@/services/KaminoTxBuilder";
import { signAndSendTransactions } from "@/services/WalletService";
import type { TxStep } from "@/utils/txProgress";

export interface SupplyInput
{
    amountBase: bigint;
    // 진행 단계 콜백 (UI stepper 연동). done 은 화면 onSuccess 에서 표시.
    onStep?: (step: TxStep) => void;
}

export interface SupplyResult
{
    signature: string;
}

// 시뮬레이션 결과 err/logs 를 사람이 읽을(복사 가능한) 메시지로. 디버깅을 위해 전체 로그 포함.
export function summarizeSimulationError(err: unknown, logs: readonly string[] | null): string
{
    const all = (logs ?? []).join("\n");
    const base = `Simulation failed: ${JSON.stringify(err)}`;
    return all ? `${base}\n--- logs ---\n${all}` : base;
}

/**
 * cbBTC 공급 mutation. build → **simulate(서명 전 게이트)** → MWA 서명·전송.
 * 실자금 보호를 위해 시뮬레이션이 실패하면 서명하지 않고 에러를 던진다.
 */
export function useSupplyLending(): UseMutationResult<SupplyResult, Error, SupplyInput>
{
    const connection = useConnection();
    const { account } = useWallet();
    const queryClient = useQueryClient();

    return useMutation<SupplyResult, Error, SupplyInput>({
        mutationFn: async ({ amountBase, onStep }) =>
        {
            if (!account)
            {
                throw new Error("Wallet is not connected.");
            }

            // 진행 단계 콜백 (UI stepper 연동).
            const step = (s: TxStep): void =>
            {
                onStep?.(s);
            };

            step("preparing");
            const tx = await buildSupplyTransaction(connection, account.publicKey, amountBase);

            // 서명 전 시뮬레이션 — 계정/로직 오류를 실자금 서명 없이 차단.
            step("simulating");
            const sim = await connection.simulateTransaction(tx, {
                sigVerify: false,
                replaceRecentBlockhash: true,
            });
            if (sim.value.err)
            {
                if (__DEV__)
                {
                    // 사전 시뮬레이션 실패는 잔액 부족 등 '예상된 사용자 사유'가 많고 UI 안내로 처리된다 →
                    // 빨간 error 가 아니라 warn 으로 (release 엔 __DEV__ 라 어차피 안 찍힘).
                    // eslint-disable-next-line no-console
                    console.warn("[supply] simulation failed", {
                        err: sim.value.err,
                        logs: sim.value.logs,
                        unitsConsumed: sim.value.unitsConsumed,
                    });
                }
                throw new Error(summarizeSimulationError(sim.value.err, sim.value.logs));
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
            // 새로고침은 백그라운드(fire-and-forget). UI 완료 표시가 RPC refetch 지연에 막히지 않도록.
            void queryClient.invalidateQueries({ queryKey: ["kamino"] });
            void queryClient.invalidateQueries({ queryKey: ["balance"] });
            void queryClient.invalidateQueries({ queryKey: ["history"] });
        },
    });
}
