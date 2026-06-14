import { CBBTC, USDC } from "@/constants/tokens";
import { getQuote } from "@/services/JupiterService";
import type { QuoteResponse } from "@/types/jupiter";

// M17.5 — cbBTC 로 LN 결제하기 위한 선행 swap (cbBTC → USDC).
//
// Atomiq LP 는 cbBTC 를 직접 받지 않으므로, cbBTC 보유 사용자는 먼저 Jupiter 로
// cbBTC → USDC 로 바꾼 뒤 그 USDC 로 LN 결제(Atomiq)한다. 서명 2회.
//
// ExactOut 으로 "정확히 N USDC" 를 받도록 견적 → cbBTC 필요량이 결정됨.
// Atomiq 견적과 실제 결제(재견적) 사이의 fee/시세 미세 변동을 흡수하도록 버퍼를 얹는다.

// USDC 목표에 더하는 버퍼 (1.5%). Jupiter swap 후 Atomiq 재견적 시 필요 USDC 가
// 살짝 늘어도 부족하지 않도록. 남는 USDC 는 지갑에 그대로 남는다(무해).
export const USDC_BUFFER_BPS = 150;

const BPS_DENOM = 10_000n;

/** usdcNeededBase 에 버퍼(bps)를 얹어 swap 으로 확보할 USDC 목표량(올림). */
export function usdcTargetWithBuffer(usdcNeededBase: bigint): bigint
{
    if (usdcNeededBase <= 0n)
    {
        return 0n;
    }
    const numerator = usdcNeededBase * (BPS_DENOM + BigInt(USDC_BUFFER_BPS));
    // ceil division — 목표가 needed+buffer 아래로 내려가지 않도록
    return (numerator + BPS_DENOM - 1n) / BPS_DENOM;
}

export interface CbbtcSwapQuote
{
    jupiterQuote: QuoteResponse;
    /** swap 에 필요한 cbBTC 입력량 (base unit, slippage 적용 전 예상) */
    cbbtcInBase: bigint;
    /** swap 으로 받게 될 USDC (base unit, ExactOut 이라 목표와 동일) */
    usdcOutBase: bigint;
}

/**
 * cbBTC → 정확히 usdcTargetBase USDC (ExactOut) Jupiter 견적.
 * slippageBps 는 cbBTC 입력측 여유 (ExactOut 이라 출력 USDC 는 고정).
 */
export async function quoteCbbtcToUsdc(
    usdcTargetBase: bigint,
    slippageBps: number,
): Promise<CbbtcSwapQuote>
{
    const quote = await getQuote({
        inputMint: CBBTC.mint,
        outputMint: USDC.mint,
        amount: usdcTargetBase,
        slippageBps,
        swapMode: "ExactOut",
    });
    return {
        jupiterQuote: quote,
        cbbtcInBase: BigInt(quote.inAmount),
        usdcOutBase: BigInt(quote.outAmount),
    };
}
