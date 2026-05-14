import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { Buffer } from "buffer";

import {
    JupiterApiError,
    type PrioritizationFeeLamports,
    type QuoteParams,
    type QuoteResponse,
    type SwapResponse,
} from "@/types/jupiter";

const DEFAULT_BASE = "https://lite-api.jup.ag";

// Swap 트랜잭션의 priority fee 기본값.
// "auto"(Jupiter 자유 재량, 상한 없음) 대신 priority="high" + 1.0M lamports(0.001 SOL) cap.
// - 혼잡 시 swap이 빠르게 land 하도록 high 우선순위 부여
// - 동시에 사용자가 과한 가스를 지불하지 않도록 상한 고정
// 이 값은 MIN_SOL_GAS_RESERVE_SOL(0.002)과 ATA rent(~0.002)를 고려한 보수적 cap.
const DEFAULT_PRIORITY_FEE: PrioritizationFeeLamports = {
    priorityLevelWithMaxLamports: {
        priorityLevel: "high",
        maxLamports: 1_000_000,
    },
};

function getApiBase(): string
{
    const override = process.env.EXPO_PUBLIC_JUPITER_API_BASE;
    if (override && override.length > 0)
    {
        return override.replace(/\/+$/, "");
    }
    return DEFAULT_BASE;
}

function validateParams(params: QuoteParams): void
{
    if (params.amount <= 0n)
    {
        throw new Error("amount must be > 0");
    }
    if (params.inputMint === params.outputMint)
    {
        throw new Error("input and output mints must differ");
    }
    if (params.slippageBps < 0 || params.slippageBps > 10_000)
    {
        throw new Error(`slippageBps must be between 0 and 10000 (got ${params.slippageBps})`);
    }
}

export async function getQuote(params: QuoteParams): Promise<QuoteResponse>
{
    validateParams(params);

    const url = new URL(`${getApiBase()}/swap/v1/quote`);
    url.searchParams.set("inputMint", params.inputMint);
    url.searchParams.set("outputMint", params.outputMint);
    url.searchParams.set("amount", params.amount.toString());
    url.searchParams.set("slippageBps", String(params.slippageBps));
    if (params.swapMode)
    {
        url.searchParams.set("swapMode", params.swapMode);
    }

    const response = await fetch(url.toString());
    if (!response.ok)
    {
        let body: unknown;
        try
        {
            body = await response.json();
        }
        catch
        {
            body = await response.text().catch(() => undefined);
        }
        throw new JupiterApiError(
            `Jupiter quote failed (HTTP ${response.status})`,
            response.status,
            body,
        );
    }

    return await response.json() as QuoteResponse;
}

export interface GetSwapTransactionParams
{
    quote: QuoteResponse;
    userPublicKey: PublicKey;
    wrapAndUnwrapSol?: boolean;
    dynamicComputeUnitLimit?: boolean;
    prioritizationFeeLamports?: PrioritizationFeeLamports;
}

export interface SwapTransactionResult
{
    transaction: VersionedTransaction;
    lastValidBlockHeight?: number;
    prioritizationFeeLamports?: number;
}

export async function getSwapTransaction(
    params: GetSwapTransactionParams,
): Promise<SwapTransactionResult>
{
    const body = {
        quoteResponse: params.quote,
        userPublicKey: params.userPublicKey.toBase58(),
        wrapAndUnwrapSol: params.wrapAndUnwrapSol ?? true,
        dynamicComputeUnitLimit: params.dynamicComputeUnitLimit ?? true,
        prioritizationFeeLamports: params.prioritizationFeeLamports ?? DEFAULT_PRIORITY_FEE,
    };

    const response = await fetch(`${getApiBase()}/swap/v1/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!response.ok)
    {
        let errBody: unknown;
        try
        {
            errBody = await response.json();
        }
        catch
        {
            errBody = await response.text().catch(() => undefined);
        }
        throw new JupiterApiError(
            `Jupiter swap failed (HTTP ${response.status})`,
            response.status,
            errBody,
        );
    }

    const payload = await response.json() as SwapResponse;
    if (!payload.swapTransaction)
    {
        throw new Error("Jupiter response missing swapTransaction");
    }

    const txBytes = Buffer.from(payload.swapTransaction, "base64");
    const transaction = VersionedTransaction.deserialize(txBytes);

    return {
        transaction,
        lastValidBlockHeight: payload.lastValidBlockHeight,
        prioritizationFeeLamports: payload.prioritizationFeeLamports,
    };
}
