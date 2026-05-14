import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { TokenInfo } from "@/constants/tokens";
import { WSOL } from "@/constants/tokens";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import { getQuote } from "@/services/JupiterService";
import { JupiterApiError, type QuoteResponse } from "@/types/jupiter";
import { parseTokenAmount } from "@/utils/format";

// 견적의 "fresh" 보장 기간. UI의 stale 표시와 react-query staleTime을 동일하게 맞춰
// 캐시는 stale인데 UI는 fresh로 보이는 불일치를 제거.
export const QUOTE_STALE_SECONDS = 12;

interface UseSwapQuoteParams
{
    input: TokenInfo;
    output: TokenInfo;
    uiAmount: string;
    slippageBps: number;
    debounceMs?: number;
}

// 네이티브 SOL은 swap 경로에서 wrapped SOL mint를 사용해야 함 (Jupiter 표준).
function routableMint(token: TokenInfo): string
{
    if (token.isNative)
    {
        return WSOL.mint;
    }
    return token.mint;
}

// Jupiter API 호출 실패 시 재시도 전략.
// - 429 (rate limit): 1회만, 1.5s 후 — 즉시 재시도는 같은 결과
// - 5xx 또는 네트워크 에러: 2회까지 exponential backoff (0.5s → 1.5s)
// - 4xx (≠ 429): 클라이언트 측 잘못, 재시도 금지 (예: amount 검증 실패 등)
export function shouldRetryQuote(failureCount: number, error: unknown): boolean
{
    if (error instanceof JupiterApiError)
    {
        if (error.status === 429) return failureCount < 1;
        if (error.status >= 500) return failureCount < 2;
        return false;
    }
    // 우리 코드의 검증 에러는 retryable하지 않음.
    if (error instanceof Error && /amount must be|must differ|must be between/.test(error.message))
    {
        return false;
    }
    // 네트워크/타임아웃 등 익명 에러는 최대 2회.
    return failureCount < 2;
}

export function retryDelayQuote(attempt: number, error: unknown): number
{
    if (error instanceof JupiterApiError && error.status === 429)
    {
        return 1500;
    }
    // exponential backoff: 500ms → 1500ms
    return 500 * Math.pow(3, attempt);
}

export function useSwapQuote({
    input,
    output,
    uiAmount,
    slippageBps,
    debounceMs = 300,
}: UseSwapQuoteParams): UseQueryResult<QuoteResponse, Error>
{
    const debouncedAmount = useDebouncedValue(uiAmount, debounceMs);
    const parsed = parseTokenAmount(debouncedAmount, input.decimals);
    const positive = parsed !== null && parsed > 0n;
    const { isOnline } = useNetworkStatus();

    return useQuery<QuoteResponse, Error>({
        queryKey: [
            "quote",
            routableMint(input),
            routableMint(output),
            parsed?.toString() ?? "0",
            slippageBps,
        ],
        enabled: positive && isOnline,
        // staleTime = UI threshold 와 동일하게. 자동 polling은 끔.
        staleTime: QUOTE_STALE_SECONDS * 1000,
        gcTime: 30_000,
        retry: shouldRetryQuote,
        retryDelay: retryDelayQuote,
        queryFn: async () =>
        {
            if (!parsed)
            {
                throw new Error("amount is required");
            }
            return getQuote({
                inputMint: routableMint(input),
                outputMint: routableMint(output),
                amount: parsed,
                slippageBps,
                swapMode: "ExactIn",
            });
        },
    });
}
