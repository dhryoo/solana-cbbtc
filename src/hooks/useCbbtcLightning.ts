import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { USDC } from "@/constants/tokens";
import { useWallet } from "@/hooks/useWallet";
import { useConnection } from "@/providers/ConnectionProvider";
import { getSwapTransaction } from "@/services/JupiterService";
import { getLightningService } from "@/services/lightning/LightningService";
import { quoteCbbtcToUsdc, usdcTargetWithBuffer, type CbbtcSwapQuote } from "@/services/lightning/cbbtcPreSwap";
import type { LightningPayOutcome, LightningPayPhase, LightningQuote } from "@/services/lightning/types";
import { signAndSendTransactions } from "@/services/WalletService";

// M17.5 — cbBTC 로 LN 결제. cbBTC→USDC(Jupiter, 서명1) → 확정 → USDC→LN(Atomiq, 서명2).
// 견적/결제 모두 USDC 경로(useLightning)를 재사용하되, 앞에 Jupiter 선행 swap 을 끼운다.

// cbBTC swap 의 Jupiter slippage (입력 cbBTC 측 여유). ExactOut 이라 출력 USDC 는 고정.
const JUPITER_SLIPPAGE_BPS = 50;

// Jupiter swap 확정 대기 한도(ms). 초과 시 "USDC 로 바뀌었으니 USDC 로 재시도" 안내.
const CONFIRM_TIMEOUT_MS = 90_000;

// cbBTC 결제 진행 단계 (USDC/SOL 직결제의 LightningPayPhase 앞에 2단계 추가)
export type CbbtcPayPhase = "swapping" | "confirming" | LightningPayPhase;

export interface CbbtcLightningQuote
{
    /** Atomiq USDC 견적 (preview — 실제 결제 시 재견적) */
    atomiqPreview: LightningQuote;
    /** Jupiter cbBTC→USDC ExactOut 견적 */
    swap: CbbtcSwapQuote;
    /** swap 으로 확보할 USDC (버퍼 포함) */
    usdcTargetBase: bigint;
}

export interface CbbtcQuoteInput
{
    rawInput: string;
    amountSats: bigint | null;
}

export function useCbbtcLightningQuote(): UseMutationResult<CbbtcLightningQuote, Error, CbbtcQuoteInput>
{
    const { account } = useWallet();

    return useMutation<CbbtcLightningQuote, Error, CbbtcQuoteInput>({
        mutationFn: async ({ rawInput, amountSats }) =>
        {
            if (!account)
            {
                throw new Error("Wallet is not connected.");
            }
            const srcAddress = account.publicKey.toBase58();
            // 1) Atomiq 를 USDC 소스로 견적 → 필요한 USDC 산출
            const atomiqPreview = await getLightningService().getQuote({
                rawInput,
                amountSats,
                srcToken: USDC,
                srcAddress,
            });
            // 2) 버퍼 얹은 USDC 목표로 cbBTC→USDC ExactOut 견적
            const usdcTargetBase = usdcTargetWithBuffer(atomiqPreview.inputBase);
            const swap = await quoteCbbtcToUsdc(usdcTargetBase, JUPITER_SLIPPAGE_BPS);
            return { atomiqPreview, swap, usdcTargetBase };
        },
    });
}

export interface CbbtcPayInput
{
    rawInput: string;
    amountSats: bigint | null;
    swap: CbbtcSwapQuote;
    onPhase: (phase: CbbtcPayPhase) => void;
}

export interface CbbtcPayResult
{
    swapSignature: string;
    outcome: LightningPayOutcome;
}

/** Jupiter swap 후 USDC 가 도착(=확정)할 때까지 대기. 초과 시 throw. */
async function waitForConfirmation(
    connection: ReturnType<typeof useConnection>,
    signature: string,
): Promise<void>
{
    const result = await Promise.race([
        connection.confirmTransaction(signature, "confirmed"),
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("swap_confirm_timeout")), CONFIRM_TIMEOUT_MS)),
    ]);
    // confirmTransaction 은 value.err 로 실패를 알림
    if (typeof result === "object" && result !== null && "value" in result)
    {
        const err = (result as { value?: { err?: unknown } }).value?.err;
        if (err)
        {
            throw new Error(`swap failed on-chain: ${JSON.stringify(err)}`);
        }
    }
}

export function useCbbtcLightningPay(): UseMutationResult<CbbtcPayResult, Error, CbbtcPayInput>
{
    const { account } = useWallet();
    const connection = useConnection();
    const queryClient = useQueryClient();

    return useMutation<CbbtcPayResult, Error, CbbtcPayInput>({
        mutationFn: async ({ rawInput, amountSats, swap, onPhase }) =>
        {
            if (!account)
            {
                throw new Error("Wallet is not connected.");
            }

            // 1) cbBTC → USDC (Jupiter, 서명1 — 지갑이 broadcast)
            onPhase("swapping");
            const { transaction } = await getSwapTransaction({
                quote: swap.jupiterQuote,
                userPublicKey: account.publicKey,
            });
            const swapSigs = await signAndSendTransactions([transaction], account.authToken);
            const swapSignature = swapSigs[0];
            if (!swapSignature)
            {
                throw new Error("No swap signature was returned.");
            }

            // 2) USDC 도착 대기 (escrow 가 USDC 를 인출하므로 확정 필수)
            onPhase("confirming");
            await waitForConfirmation(connection, swapSignature);

            // 3) USDC → LN (Atomiq) — 확정 후 fresh 재견적 → 결제 (서명2)
            const freshQuote = await getLightningService().getQuote({
                rawInput,
                amountSats,
                srcToken: USDC,
                srcAddress: account.publicKey.toBase58(),
            });
            const outcome = await getLightningService().pay(
                freshQuote,
                account,
                (phase) => onPhase(phase),
            );

            return { swapSignature, outcome };
        },
        onSuccess: () =>
        {
            void queryClient.invalidateQueries({ queryKey: ["balance"] });
            void queryClient.invalidateQueries({ queryKey: ["history"] });
        },
    });
}
