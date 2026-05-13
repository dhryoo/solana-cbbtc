import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { TokenInfo } from "@/constants/tokens";
import { WSOL } from "@/constants/tokens";
import { getQuote } from "@/services/JupiterService";
import type { QuoteResponse } from "@/types/jupiter";
import { parseTokenAmount } from "@/utils/format";

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

    return useQuery<QuoteResponse, Error>({
        queryKey: [
            "quote",
            routableMint(input),
            routableMint(output),
            parsed?.toString() ?? "0",
            slippageBps,
        ],
        enabled: positive,
        // 견적은 짧게 fresh — 12초마다 자동 재조회를 허용하지만 자동 polling은 끔.
        staleTime: 8_000,
        gcTime: 30_000,
        retry: 1,
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
