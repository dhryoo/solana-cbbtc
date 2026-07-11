import { LN_EXPERIMENTAL_MAX_SATS } from "@/constants/lightning";
import type { TokenInfo } from "@/constants/tokens";
import type { ConnectedAccount } from "@/services/WalletService";
import { parseLightningInput } from "@/utils/lightningInvoice";

import { AtomiqProvider } from "./AtomiqProvider";
import { createMwaSigningDelegate } from "./MwaWalletAdapter";
import { isLightningQuoteExpired } from "./types";
import type {
    LightningDestination,
    LightningPayOutcome,
    LightningPayPhase,
    LightningQuote,
    LightningReceive,
    LightningReceiveOutcome,
    LightningReceivePhase,
    LightningSwapProvider,
} from "./types";

// Facade: UI/hook 이 보는 유일한 진입점.
// - 입력 파싱(bolt11/LNURL/address) → 검증 → provider 선택(Strategy) → quote/pay 위임
// - provider 교체·추가(Boltz 등)가 UI 에 영향 주지 않도록 격리

export type QuoteRequestError =
    | "invalid_input"          // 파싱 불가
    | "expired_invoice"        // BOLT11 만료
    | "amount_required"        // amountless 인보이스 또는 address 인데 금액 없음
    | "amount_not_allowed"     // 금액 있는 BOLT11 에 별도 금액 지정
    | "amount_too_large"       // 실험 기능 소액 상한(LN_EXPERIMENTAL_MAX_SATS) 초과
    | "no_route"               // LP(중개자)가 해당 pair·금액을 라우팅 못 함 (대개 금액이 너무 작음)
    | "quote_expired";         // quote 유효시간 경과 → 재견적 필요 (commit 전 차단)

/**
 * Atomiq LP 가 "No intermediary found for the requested pair and amount!" 처럼 라우팅 실패를 던지는지 판별.
 * 각 스왑엔 온체인 정산·LP 수수료 등 고정비가 있어, 아주 작은 금액(예: 150 sats)은 어떤 LP 도 경제적으로
 * 중개하지 않는다 → 이 에러가 난다. 구조화된 min/max 범위 에러(asLightningAmountError)와는 별개.
 */
export function isNoRouteError(err: unknown): boolean
{
    const msg = err instanceof Error ? err.message : String(err);
    return /no intermediary|no route|couldn'?t find (a |an )?(route|intermediary|swap|lp)/i.test(msg);
}

export class LightningQuoteError extends Error
{
    readonly code: QuoteRequestError;

    constructor(code: QuoteRequestError)
    {
        super(`lightning quote error: ${code}`);
        this.code = code;
        this.name = "LightningQuoteError";
    }
}

/** 입력 문자열 + (선택) 금액 → 검증된 destination. 실패 시 LightningQuoteError */
export function resolveDestination(
    rawInput: string,
    amountSats: bigint | null,
    nowSec: number = Math.floor(Date.now() / 1000),
): LightningDestination
{
    const parsed = parseLightningInput(rawInput, nowSec);
    switch (parsed.kind)
    {
        case "invalid":
            throw new LightningQuoteError("invalid_input");
        case "bolt11":
            if (parsed.isExpired)
            {
                throw new LightningQuoteError("expired_invoice");
            }
            if (parsed.amountSats === null)
            {
                // amountless 인보이스 — MVP 미지원 (금액 명시 인보이스만)
                throw new LightningQuoteError("amount_required");
            }
            if (amountSats !== null)
            {
                throw new LightningQuoteError("amount_not_allowed");
            }
            if (parsed.amountSats > LN_EXPERIMENTAL_MAX_SATS)
            {
                throw new LightningQuoteError("amount_too_large");
            }
            return { kind: "bolt11", parsed };
        case "lightningAddress":
            if (amountSats === null || amountSats <= 0n)
            {
                throw new LightningQuoteError("amount_required");
            }
            if (amountSats > LN_EXPERIMENTAL_MAX_SATS)
            {
                throw new LightningQuoteError("amount_too_large");
            }
            return { kind: "lnurlOrAddress", destination: parsed.address, amountSats, parsed };
        case "lnurl":
            if (amountSats === null || amountSats <= 0n)
            {
                throw new LightningQuoteError("amount_required");
            }
            if (amountSats > LN_EXPERIMENTAL_MAX_SATS)
            {
                throw new LightningQuoteError("amount_too_large");
            }
            return { kind: "lnurlOrAddress", destination: parsed.lnurl, amountSats, parsed };
    }
}

export class LightningService
{
    private readonly provider: LightningSwapProvider;

    constructor(provider?: LightningSwapProvider)
    {
        // Strategy 선택 — 현재는 Atomiq 고정. Boltz 추가 시 여기서 선택/폴백 로직.
        this.provider = provider ?? new AtomiqProvider();
    }

    get providerId(): string
    {
        return this.provider.id;
    }

    getSupportedSourceTokens(): Promise<TokenInfo[]>
    {
        return this.provider.getSupportedSourceTokens();
    }

    /** 입력 파싱 + 검증 + LP 견적. 자금 이동 없음 */
    async getQuote(params: {
        rawInput: string;
        amountSats: bigint | null;
        srcToken: TokenInfo;
        srcAddress: string;
    }): Promise<LightningQuote>
    {
        const dest = resolveDestination(params.rawInput, params.amountSats);
        try
        {
            return await this.provider.quote(params.srcToken, dest, params.srcAddress);
        }
        catch (e)
        {
            // 라우팅 실패(중개자 없음)만 친절 코드로 정규화. 금액 범위 에러(LightningAmountError)나
            // 그 외는 그대로 전파해 각자의 안내 문구로 처리.
            if (isNoRouteError(e))
            {
                throw new LightningQuoteError("no_route");
            }
            throw e;
        }
    }

    /** 결제 실행 — MWA 서명 1회(escrow) + 실패 시 환불 서명 1회 */
    async pay(
        quote: LightningQuote,
        account: ConnectedAccount,
        onPhase: (phase: LightningPayPhase) => void,
        abortSignal?: AbortSignal,
    ): Promise<LightningPayOutcome>
    {
        // quote 만료 가드 — stale quote 로 escrow commit(되돌릴 수 없는 HTLC lock)을 막고 재견적 유도.
        // provider.pay 위임 전, 즉 어떤 서명도 일어나기 전에 차단한다.
        if (isLightningQuoteExpired(quote.quoteExpiresAt, Date.now()))
        {
            throw new LightningQuoteError("quote_expired");
        }
        const signer = createMwaSigningDelegate(account);
        return this.provider.pay(quote, signer, onPhase, abortSignal);
    }

    getRefundableCount(srcAddress: string): Promise<number>
    {
        return this.provider.getRefundableCount(srcAddress);
    }

    refundAll(account: ConnectedAccount): Promise<number>
    {
        return this.provider.refundAll(createMwaSigningDelegate(account));
    }

    /** 받기: LN 인보이스 생성 (자금 이동 없음) */
    createReceive(dstToken: TokenInfo, amountSats: bigint, dstAddress: string): Promise<LightningReceive>
    {
        // 실험 기능 소액 상한은 UI(LightningReceivePanel) 뿐 아니라 서비스층에서도 강제(R33) — send
        // 경로(resolveDestination)와 대칭. UI 가드를 우회해 들어와도 상한을 넘는 인보이스는 만들지 않는다.
        if (amountSats <= 0n)
        {
            throw new LightningQuoteError("amount_required");
        }
        if (amountSats > LN_EXPERIMENTAL_MAX_SATS)
        {
            throw new LightningQuoteError("amount_too_large");
        }
        return this.provider.createReceive(dstToken, amountSats, dstAddress);
    }

    /** 받기: 인보이스 결제 대기 → Solana 정산(claim, 서명) */
    waitAndClaim(
        receive: LightningReceive,
        account: ConnectedAccount,
        onPhase: (phase: LightningReceivePhase) => void,
        abortSignal?: AbortSignal,
    ): Promise<LightningReceiveOutcome>
    {
        return this.provider.waitAndClaim(receive, createMwaSigningDelegate(account), onPhase, abortSignal);
    }
}

// 앱 전역 싱글톤 (lazy) — 실험 화면이 열릴 때 처음 생성
let serviceInstance: LightningService | null = null;

export function getLightningService(): LightningService
{
    if (!serviceInstance)
    {
        serviceInstance = new LightningService();
    }
    return serviceInstance;
}
