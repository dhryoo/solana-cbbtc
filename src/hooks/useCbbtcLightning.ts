import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { USDC } from "@/constants/tokens";
import { useWallet } from "@/hooks/useWallet";
import { useConnection } from "@/providers/ConnectionProvider";
import { waitForConfirmation } from "@/services/confirmTransaction";
import { getSwapTransaction } from "@/services/JupiterService";
import { getLightningService } from "@/services/lightning/LightningService";
import { hasPreSwapShortfall, quoteCbbtcToUsdc, usdcTargetWithBuffer, type CbbtcSwapQuote } from "@/services/lightning/cbbtcPreSwap";
import { LN_SENTINEL } from "@/services/lightning/sentinels";
import type { LightningPayOutcome, LightningPayPhase, LightningQuote } from "@/services/lightning/types";
import { signAndSendTransactions } from "@/services/WalletService";

// M17.5 — cbBTC 로 LN 결제. cbBTC→USDC(Jupiter, 서명1) → 확정 → USDC→LN(Atomiq, 서명2).
// 견적/결제 모두 USDC 경로(useLightning)를 재사용하되, 앞에 Jupiter 선행 swap 을 끼운다.

// cbBTC swap 의 Jupiter slippage (입력 cbBTC 측 여유). ExactOut 이라 출력 USDC 는 고정.
const JUPITER_SLIPPAGE_BPS = 50;

// cbBTC 결제 진행 단계 (USDC/SOL 직결제의 LightningPayPhase 앞에 3단계 추가)
//   swapping   : cbBTC→USDC swap 서명·전송
//   confirming : swap 온체인 확정 대기 (아직 USDC 확보 전)
//   confirmed  : swap 확정됨 = USDC 확보 (이 시점 이후 실패는 'USDC 로 재시도'가 맞다)
export type CbbtcPayPhase = "swapping" | "confirming" | "confirmed" | LightningPayPhase;

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
    /** 취소 시 확정 대기/LP 결제 폴링을 중단 */
    abortSignal?: AbortSignal;
}

export interface CbbtcPayResult
{
    swapSignature: string;
    outcome: LightningPayOutcome;
}

export function useCbbtcLightningPay(): UseMutationResult<CbbtcPayResult, Error, CbbtcPayInput>
{
    const { account } = useWallet();
    const connection = useConnection();
    const queryClient = useQueryClient();

    return useMutation<CbbtcPayResult, Error, CbbtcPayInput>({
        mutationFn: async ({ rawInput, amountSats, swap, onPhase, abortSignal }) =>
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
            await waitForConfirmation(connection, swapSignature, abortSignal);
            // 확정 성공 = USDC 확보. 이 phase 이후의 실패만 "USDC 로 재시도"가 맞다.
            // (confirming 중 on-chain 실패면 cbBTC 그대로이므로 소스 전환하면 안 됨 — R12.)
            onPhase("confirmed");

            // 3) USDC → LN (Atomiq) — 확정 후 fresh 재견적 → 결제 (서명2)
            const freshQuote = await getLightningService().getQuote({
                rawInput,
                amountSats,
                srcToken: USDC,
                srcAddress: account.publicKey.toBase58(),
            });
            // 환율이 ExactOut 버퍼(1.5%)보다 더 움직여 재견적 USDC 가 확보분을 초과하면, escrow 가
            // 보유 USDC 를 다 끌어가고도 모자라 실패한다. escrow 시도 전에 차단하고 "USDC 로 재시도"로 유도 —
            // 이미 USDC 는 손에 있으니 자금 손실이 아니라 단순 재시도.
            if (hasPreSwapShortfall(freshQuote.inputBase, swap.usdcOutBase))
            {
                throw new Error(LN_SENTINEL.PRESWAP_SHORTFALL);
            }
            const outcome = await getLightningService().pay(
                freshQuote,
                account,
                (phase) => onPhase(phase),
                abortSignal,
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
