import type { PublicKey } from "@solana/web3.js";

import type { TokenInfo } from "@/constants/tokens";
import type { ParsedBolt11, ParsedLightningAddress, ParsedLnurl } from "@/utils/lightningInvoice";

// Phase 3 Lightning 결제 — 서비스 계층 타입.
//
// Strategy 패턴: LightningSwapProvider 인터페이스 뒤에 LP(Atomiq, 추후 Boltz 등)를 숨긴다.
// UI/hook 은 LightningService(Facade)만 보고, Facade 는 provider 를 선택해 위임한다.

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
    ): Promise<LightningPayOutcome>;

    /** 중단된(환불 가능한) 과거 swap — 화면 진입 시 안내용 */
    getRefundableCount(srcAddress: string): Promise<number>;

    /** 환불 가능한 swap 전부 환불 실행 (각각 MWA 서명) */
    refundAll(signer: SolanaSigningDelegate): Promise<number>;
}
