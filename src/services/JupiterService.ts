import { JupiterApiError, type QuoteParams, type QuoteResponse } from "@/types/jupiter";

const DEFAULT_BASE = "https://lite-api.jup.ag";

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
