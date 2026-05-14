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

// 에러 메시지는 i18n 키. toFriendlySwapError에서 분기 처리.
class WalletNotConnectedError extends Error
{
    constructor()
    {
        super("Wallet is not connected.");
        this.name = "WalletNotConnectedError";
    }
}

class MissingSignatureError extends Error
{
    constructor()
    {
        super("No transaction signature was returned.");
        this.name = "MissingSignatureError";
    }
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
                throw new WalletNotConnectedError();
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
                throw new MissingSignatureError();
            }

            return { signature: first };
        },
        onSuccess: async () =>
        {
            await queryClient.invalidateQueries({ queryKey: ["balance"] });
            await queryClient.invalidateQueries({ queryKey: ["quote"] });
        },
    });
}
