// Jupiter Swap v1 API 응답 타입.
// 공식 endpoint: https://lite-api.jup.ag/swap/v1/quote
// 응답에는 다양한 메타 필드가 있지만 본 앱에서 실제 사용하는 것만 선언.
// 응답이 변경될 가능성을 줄이기 위해 필요한 필드만 보수적으로 명시.

export interface SwapInfo
{
    ammKey: string;
    label: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
}

export interface RoutePlanStep
{
    swapInfo: SwapInfo;
    percent: number;
}

export interface QuoteResponse
{
    inputMint: string;
    outputMint: string;
    inAmount: string;            // 입력 raw amount (smallest unit, string)
    outAmount: string;           // 출력 raw amount (smallest unit, string)
    otherAmountThreshold: string;// slippage 적용 후 최소 수령량
    swapMode: "ExactIn" | "ExactOut";
    slippageBps: number;
    priceImpactPct: string;      // "0.0123" 형식의 percentage 문자열
    routePlan: RoutePlanStep[];
    contextSlot?: number;
    timeTaken?: number;
}

export interface QuoteParams
{
    inputMint: string;
    outputMint: string;
    amount: bigint;              // smallest unit. URL에서는 string으로 직렬화.
    slippageBps: number;         // 기본 50 (0.5%)
    swapMode?: "ExactIn" | "ExactOut";
}

export class JupiterApiError extends Error
{
    constructor(
        message: string,
        public readonly status: number,
        public readonly body?: unknown,
    )
    {
        super(message);
        this.name = "JupiterApiError";
    }
}

// Jupiter v6 priority fee 설정. 다음 셋 중 하나:
//   - number: 고정 lamports
//   - "auto": Jupiter가 결정 (상한 없음)
//   - 객체: priority level + max lamports cap
export type PrioritizationFeeLamports =
    | number
    | "auto"
    | {
        priorityLevelWithMaxLamports: {
            priorityLevel: "medium" | "high" | "veryHigh";
            maxLamports: number;
        };
    };

export interface SwapRequest
{
    quoteResponse: QuoteResponse;
    userPublicKey: string;       // base58
    wrapAndUnwrapSol?: boolean;  // 기본 true
    dynamicComputeUnitLimit?: boolean;
    prioritizationFeeLamports?: PrioritizationFeeLamports;
}

export interface SwapResponse
{
    swapTransaction: string;     // base64 직렬화된 VersionedTransaction
    lastValidBlockHeight?: number;
    prioritizationFeeLamports?: number;
}
