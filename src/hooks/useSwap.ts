import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import type { TokenInfo } from "@/constants/tokens";
import { useWallet } from "@/hooks/useWallet";
import { useConnection } from "@/providers/ConnectionProvider";
import { useNotifications } from "@/providers/NotificationProvider";
import { waitForConfirmation } from "@/services/confirmTransaction";
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
    const connection = useConnection();
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

            // 온체인 확정 대기 — 확정 전에 성공 처리하면 슬리피지 초과·blockhash 만료 등으로
            // 온체인 실패한 swap 을 성공 모달·알림으로 오표시한다(자금 미이동). status.err → throw,
            // 미확정 예산 초과 → confirm_timeout(호출부가 "내역 확인" 안내로 매핑).
            await waitForConfirmation(connection, first);

            return { signature: first };
        },
        onSuccess: (result, variables) =>
        {
            // 새로고침은 백그라운드(fire-and-forget). 성공 모달이 RPC refetch 지연에 막히지 않도록.
            void queryClient.invalidateQueries({ queryKey: ["balance"] });
            void queryClient.invalidateQueries({ queryKey: ["quote"] });
            void queryClient.invalidateQueries({ queryKey: ["history"] });

            // 알림 전송 (사용자가 설정에서 켜둔 경우에만 실제 발송)
            const inputAmount = formatRawAmount(
                variables.quote.inAmount,
                variables.inputToken.decimals,
            );
            const outputAmount = formatRawAmount(
                variables.quote.outAmount,
                variables.outputToken.decimals,
            );
            void notifications.notifySwapSuccess({
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
