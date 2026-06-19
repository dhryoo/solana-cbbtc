import type { PublicKey } from "@solana/web3.js";

import type { TokenInfo } from "@/constants/tokens";
import type { ParsedBolt11, ParsedLightningAddress, ParsedLnurl } from "@/utils/lightningInvoice";

// Phase 3 Lightning 결제 — 서비스 계층 타입.
//
// Strategy 패턴: LightningSwapProvider 인터페이스 뒤에 LP(Atomiq, 추후 Boltz 등)를 숨긴다.
// UI/hook 은 LightningService(Facade)만 보고, Facade 는 provider 를 선택해 위임한다.

/**
 * 결제 금액이 LP 의 허용 범위를 벗어난 경우 (sats 단위 min/max 동반).
 * LP SDK 의 raw "Swap amount too low/high" 를 친절 안내로 바꾸기 위한 타입 에러.
 */
export class LightningAmountError extends Error
{
    readonly minSats: bigint | null;
    readonly maxSats: bigint | null;
    readonly tooLow: boolean;

    constructor(opts: { minSats: bigint | null; maxSats: bigint | null; tooLow: boolean })
    {
        super("lightning amount out of bounds");
        this.name = "LightningAmountError";
        this.minSats = opts.minSats;
        this.maxSats = opts.maxSats;
        this.tooLow = opts.tooLow;
    }
}

/** Hermes 의 setPrototypeOf 이슈를 피해 안전하게 판별 (instanceof + name 이중 체크). */
export function isLightningAmountError(e: unknown): e is LightningAmountError
{
    return e instanceof LightningAmountError
        || (typeof e === "object" && e !== null && (e as { name?: unknown }).name === "LightningAmountError");
}

/**
 * LP SDK 의 OutOfBoundsError(min/max sats + "amount too low/high" 메시지)를
 * LightningAmountError 로 변환. 해당 에러가 아니면 null.
 */
export function asLightningAmountError(e: unknown): LightningAmountError | null
{
    if (!e || typeof e !== "object")
    {
        return null;
    }
    const o = e as { min?: unknown; max?: unknown; message?: unknown };
    const msg = typeof o.message === "string" ? o.message : "";
    const hasBounds = o.min !== undefined || o.max !== undefined;
    const matchesMsg = /amount too (low|high)/i.test(msg);
    if (!hasBounds && !matchesMsg)
    {
        return null;
    }
    const toBig = (v: unknown): bigint | null =>
    {
        if (typeof v === "bigint") return v;
        if (typeof v === "number" && Number.isFinite(v)) return BigInt(Math.trunc(v));
        if (typeof v === "string" && /^\d+$/.test(v)) return BigInt(v);
        return null;
    };
    // "too high" 가 명시되면 상한 초과, 그 외(특히 "too low" / 모호)는 하한 미만으로 간주
    const tooLow = !/too high/i.test(msg);
    return new LightningAmountError({ minSats: toBig(o.min), maxSats: toBig(o.max), tooLow });
}

/** UI 진행 단계 — 기존 TxProgress 의 TxStep 으로 매핑해 표시 */
export type LightningPayPhase =
    | "signing"     // Solana 측 escrow lock 서명 (MWA)
    | "paying"      // LP 가 LN 인보이스 결제 중 (waitForPayment)
    | "refunding";  // 결제 실패 → 사용자 자금 환불 서명 (MWA)

export interface LightningQuote
{
    providerId: string;
    srcToken: TokenInfo;
    /** 사용자가 지불할 총량 (fee 포함, src token base units) */
    inputBase: bigint;
    /** fee 제외 입력량 (src token base units) */
    inputWithoutFeeBase: bigint;
    /** swap fee (src token base units) */
    feeBase: bigint;
    /** LN 쪽 수신량 (sats) */
    outputSats: bigint;
    /** quote 유효 만료 (unix ms). 지나면 재견적 필요 */
    quoteExpiresAt: number;
    /** 표시용 — 인보이스 description 또는 lightning address */
    destinationLabel: string;
    /** provider 내부 swap 핸들 (opaque — provider 만 해석) */
    ref: unknown;
}

export type LightningPayOutcome =
    | { status: "paid"; commitTxId: string; lnSecret: string | null }
    | { status: "refunded"; commitTxId: string }
    | { status: "refund_failed"; commitTxId: string; error: string };

/** MWA 서명을 provider 에 넘기기 위한 위임 — Adapter(MwaWalletAdapter)가 구현체 생성 */
export interface SolanaSigningDelegate
{
    publicKey: PublicKey;
    signTransaction<T>(tx: T): Promise<T>;
    signAllTransactions<T>(txs: T[]): Promise<T[]>;
}

// --- 받기 (FROM_BTCLN) ---

export type LightningReceivePhase =
    | "awaiting"   // LN 인보이스 결제 대기 (서명 없음)
    | "claiming";  // Solana 정산 서명

export interface LightningReceive
{
    providerId: string;
    invoice: string;           // 표시할 BOLT11 인보이스
    amountSats: bigint;        // 요청한 수신액
    expectedOutBase: bigint;   // 받게 될 dst token 량 (LP fee 차감 후)
    dstToken: TokenInfo;
    ref: unknown;              // provider 내부 swap 핸들
}

export interface LightningReceiveOutcome
{
    status: "received";
    claimTxId: string;
    outBase: bigint;
}

export type LightningDestination =
    | { kind: "bolt11"; parsed: ParsedBolt11 }
    | { kind: "lnurlOrAddress"; destination: string; amountSats: bigint; parsed: ParsedLightningAddress | ParsedLnurl };

/**
 * Strategy 인터페이스 — LP 구현체가 충족해야 하는 계약.
 * 모든 메서드는 사용자 자금을 건드리기 전(quote)과 후(pay)를 명확히 분리한다.
 */
export interface LightningSwapProvider
{
    readonly id: string;

    /** LP 가 현재 quote 가능한 소스 토큰 (앱 토큰 기준 필터됨) */
    getSupportedSourceTokens(): Promise<TokenInfo[]>;

    /** 견적 — 자금 이동 없음, 서명 없음 */
    quote(srcToken: TokenInfo, dest: LightningDestination, srcAddress: string): Promise<LightningQuote>;

    /**
     * 결제 실행 — commit(서명) → LP 결제 대기 → 실패 시 자동 환불(서명).
     * onPhase 로 단계 통지 (UI stepper).
     */
    pay(
        quote: LightningQuote,
        signer: SolanaSigningDelegate,
        onPhase: (phase: LightningPayPhase) => void,
        abortSignal?: AbortSignal,
    ): Promise<LightningPayOutcome>;

    /** 중단된(환불 가능한) 과거 swap — 화면 진입 시 안내용 */
    getRefundableCount(srcAddress: string): Promise<number>;

    /** 환불 가능한 swap 전부 환불 실행 (각각 MWA 서명) */
    refundAll(signer: SolanaSigningDelegate): Promise<number>;

    /** 받기: dstToken 으로 amountSats 받기 위한 LN 인보이스 생성 (자금 이동 없음, 서명 없음) */
    createReceive(dstToken: TokenInfo, amountSats: bigint, dstAddress: string): Promise<LightningReceive>;

    /** 인보이스 결제 대기 → Solana 정산(claim, MWA 서명). onPhase 로 단계 통지 */
    waitAndClaim(
        receive: LightningReceive,
        signer: SolanaSigningDelegate,
        onPhase: (phase: LightningReceivePhase) => void,
        abortSignal?: AbortSignal,
    ): Promise<LightningReceiveOutcome>;
}
