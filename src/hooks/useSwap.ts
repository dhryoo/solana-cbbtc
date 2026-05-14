import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import type { TokenInfo } from "@/constants/tokens";
import { useWallet } from "@/hooks/useWallet";
import { useNotifications } from "@/providers/NotificationProvider";
import { getSwapTransaction } from "@/services/JupiterService";
import { signAndSendTransactions } from "@/services/WalletService";
import type { QuoteResponse } from "@/types/jupiter";
import { formatRawAmount } from "@/utils/format";

export interface SwapMutationInput
{
    quote: QuoteResponse;
    // 알림 본문 구성에 필요. swap 실행 자체에는 영향 없음.
    inputToken: TokenInfo;
    outputToken: TokenInfo;
}

export interface SwapMutationResult
{
    signature: string;
}

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
    const { t } = useTranslation();
    const { account } = useWallet();
    const queryClient = useQueryClient();
    const notifications = useNotifications();

    return useMutation<SwapMutationResult, Error, SwapMutationInput, SwapMutationInput>({
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
        onSuccess: async (result, variables) =>
        {
            await queryClient.invalidateQueries({ queryKey: ["balance"] });
            await queryClient.invalidateQueries({ queryKey: ["quote"] });

            // 알림 전송 (사용자가 설정에서 켜둔 경우에만 실제 발송)
            const inputAmount = formatRawAmount(
                variables.quote.inAmount,
                variables.inputToken.decimals,
            );
            const outputAmount = formatRawAmount(
                variables.quote.outAmount,
                variables.outputToken.decimals,
            );
            await notifications.notifySwapSuccess({
                title: t("notifications.swapSuccessTitle"),
                body: t("notifications.swapSuccessBody", {
                    inputAmount,
                    inputSymbol: variables.inputToken.symbol,
                    outputAmount,
                    outputSymbol: variables.outputToken.symbol,
                }),
                signature: result.signature,
            });
        },
    });
}
