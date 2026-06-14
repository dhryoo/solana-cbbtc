import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from "@tanstack/react-query";

import type { TokenInfo } from "@/constants/tokens";
import { useWallet } from "@/hooks/useWallet";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import { getLightningService } from "@/services/lightning/LightningService";
import type {
    LightningPayOutcome,
    LightningPayPhase,
    LightningQuote,
    LightningReceive,
    LightningReceiveOutcome,
    LightningReceivePhase,
} from "@/services/lightning/types";

// Phase 3 Lightning 결제 hooks — 실험 화면이 열렸을 때만 마운트됨 (Labs 토글 뒤).
// 첫 호출 시 Atomiq SDK 초기화(LP 레지스트리 fetch)가 일어나므로 로딩 상태 표시 필요.

export interface LightningQuoteInput
{
    rawInput: string;
    amountSats: bigint | null;
    srcToken: TokenInfo;
}

export function useLightningQuote(): UseMutationResult<LightningQuote, Error, LightningQuoteInput>
{
    const { account } = useWallet();

    return useMutation<LightningQuote, Error, LightningQuoteInput>({
        mutationFn: async ({ rawInput, amountSats, srcToken }) =>
        {
            if (!account)
            {
                throw new Error("Wallet is not connected.");
            }
            return getLightningService().getQuote({
                rawInput,
                amountSats,
                srcToken,
                srcAddress: account.publicKey.toBase58(),
            });
        },
    });
}

export interface LightningPayInput
{
    quote: LightningQuote;
    onPhase: (phase: LightningPayPhase) => void;
}

export function useLightningPay(): UseMutationResult<LightningPayOutcome, Error, LightningPayInput>
{
    const { account } = useWallet();
    const queryClient = useQueryClient();

    return useMutation<LightningPayOutcome, Error, LightningPayInput>({
        mutationFn: async ({ quote, onPhase }) =>
        {
            if (!account)
            {
                throw new Error("Wallet is not connected.");
            }
            return getLightningService().pay(quote, account, onPhase);
        },
        onSuccess: () =>
        {
            void queryClient.invalidateQueries({ queryKey: ["balance"] });
            void queryClient.invalidateQueries({ queryKey: ["history"] });
        },
    });
}

/** 중단된 swap 전부 환불 — 각 swap 마다 MWA 서명 1회. 성공 시 환불된 개수 반환 */
export function useRefundAll(): UseMutationResult<number, Error, void>
{
    const { account } = useWallet();
    const queryClient = useQueryClient();

    return useMutation<number, Error, void>({
        mutationFn: async () =>
        {
            if (!account)
            {
                throw new Error("Wallet is not connected.");
            }
            return getLightningService().refundAll(account);
        },
        onSuccess: () =>
        {
            void queryClient.invalidateQueries({ queryKey: ["lightning", "refundable"] });
            void queryClient.invalidateQueries({ queryKey: ["balance"] });
            void queryClient.invalidateQueries({ queryKey: ["history"] });
        },
    });
}

// --- 받기 (FROM_BTCLN) ---

export interface ReceiveCreateInput
{
    dstToken: TokenInfo;
    amountSats: bigint;
}

/** 받기 인보이스 생성 (자금 이동 없음) */
export function useCreateReceive(): UseMutationResult<LightningReceive, Error, ReceiveCreateInput>
{
    const { account } = useWallet();

    return useMutation<LightningReceive, Error, ReceiveCreateInput>({
        mutationFn: async ({ dstToken, amountSats }) =>
        {
            if (!account)
            {
                throw new Error("Wallet is not connected.");
            }
            return getLightningService().createReceive(dstToken, amountSats, account.publicKey.toBase58());
        },
    });
}

export interface ReceiveClaimInput
{
    receive: LightningReceive;
    onPhase: (phase: LightningReceivePhase) => void;
}

/** 인보이스 결제 대기 → Solana 정산(claim, MWA 서명) */
export function useWaitAndClaim(): UseMutationResult<LightningReceiveOutcome, Error, ReceiveClaimInput>
{
    const { account } = useWallet();
    const queryClient = useQueryClient();

    return useMutation<LightningReceiveOutcome, Error, ReceiveClaimInput>({
        mutationFn: async ({ receive, onPhase }) =>
        {
            if (!account)
            {
                throw new Error("Wallet is not connected.");
            }
            return getLightningService().waitAndClaim(receive, account, onPhase);
        },
        onSuccess: () =>
        {
            void queryClient.invalidateQueries({ queryKey: ["balance"] });
            void queryClient.invalidateQueries({ queryKey: ["history"] });
        },
    });
}

/** 중단된(환불 대기) swap 수 — 화면 진입 시 안내 배너용 */
export function useRefundableSwaps(enabled: boolean): UseQueryResult<number, Error>
{
    const { account } = useWallet();
    const { isOnline } = useNetworkStatus();
    const owner = account?.publicKey.toBase58() ?? null;

    return useQuery<number, Error>({
        queryKey: ["lightning", "refundable", owner],
        enabled: enabled && isOnline && Boolean(owner),
        staleTime: 30_000,
        retry: 0,
        queryFn: async () =>
        {
            if (!owner)
            {
                return 0;
            }
            return getLightningService().getRefundableCount(owner);
        },
    });
}
