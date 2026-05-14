import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { useWallet } from "@/hooks/useWallet";
import { getSwapTransaction } from "@/services/JupiterService";
import { signAndSendTransactions } from "@/services/WalletService";
import type { QuoteResponse } from "@/types/jupiter";

export interface SwapMutationInput
{
    quote: QuoteResponse;
}

export interface SwapMutationResult
{
    signature: string;
}

export function useSwap(): UseMutationResult<SwapMutationResult, Error, SwapMutationInput>
{
    const { account } = useWallet();
    const queryClient = useQueryClient();

    return useMutation<SwapMutationResult, Error, SwapMutationInput>({
        mutationFn: async ({ quote }) =>
        {
            if (!account)
            {
                throw new Error("지갑이 연결되어 있지 않습니다.");
            }

            const { transaction } = await getSwapTransaction({
                quote,
                userPublicKey: account.publicKey,
            });

            const signatures = await signAndSendTransactions(
                [transaction],
                account.authToken,
            );

            const first = signatures[0];
            if (!first)
            {
                throw new Error("트랜잭션 시그니처를 받지 못했습니다.");
            }

            return { signature: first };
        },
        onSuccess: async () =>
        {
            // 잔액 캐시 즉시 무효화 — 새 swap 후 사용자가 자산 탭으로 가면 갱신된 잔액 표시
            await queryClient.invalidateQueries({ queryKey: ["balance"] });
            await queryClient.invalidateQueries({ queryKey: ["quote"] });
        },
    });
}
