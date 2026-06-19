// Lightning/RPC 흐름에서 raw 예외 메시지가 사용자에게 그대로 노출되던 것을 막는 중앙 매퍼.
// swap 은 JupiterApiError 특수처리가 있어 toFriendlySwapError 를 유지하되, 그 외(Lightning 받기,
// 환불, History 로드 등)는 이 매퍼로 통일한다. 판별은 lendingErrors 의 술어를 재사용.

import {
    isAuthFailure,
    isInsufficientFunds,
    isNoBorrowsToRepay,
    isOracleStaleError,
    isUserRejection,
    isWalletTimeout,
} from "@/utils/lendingErrors";

export interface FriendlyErrorResult
{
    /** i18n 키 — 호출자가 t(key) 로 렌더링 */
    key: string;
    /** 사용자가 직접 취소/거부한 경우 (error 가 아닌 info 톤으로 표시) */
    isUserCancellation: boolean;
}

/**
 * 임의의 에러 메시지를 친절한 i18n 키로 변환. 우선순위가 높은(구체적인) 패턴부터 검사.
 * 매칭 실패 시 errors.generic.
 */
export function toFriendlyErrorKey(message: string): FriendlyErrorResult
{
    // 1) 사용자 취소/거부 (Seed Vault X, MWA CancellationException 등)
    if (isUserRejection(message))
    {
        return { key: "errors.userCancelled", isUserCancellation: true };
    }
    // 2) 지갑 응답 타임아웃 — network 의 bare /timeout/ 보다 먼저 (TimeoutException 선점)
    if (isWalletTimeout(message))
    {
        return { key: "errors.walletTimeout", isUserCancellation: false };
    }
    // 3) 지갑 인증 만료/실패 → 재연결 안내
    if (isAuthFailure(message))
    {
        return { key: "errors.authExpired", isUserCancellation: false };
    }
    // 4) 오라클 가격 지연 (외부 Scope 신선도) → 잠시 후 재시도
    if (isOracleStaleError(message))
    {
        return { key: "errors.oracleStale", isUserCancellation: false };
    }
    // 5) 상환할 부채 없음 (이미 전액 상환된 직후)
    if (isNoBorrowsToRepay(message))
    {
        return { key: "errors.noBorrows", isUserCancellation: false };
    }
    // 6) LN 인보이스 만료 (받기: 결제 대기 시간 초과)
    if (/receive_invoice_expired/.test(message))
    {
        return { key: "receive.expired", isUserCancellation: false };
    }
    // 7) cbBTC pre-swap 환율 초과 → USDC 로 재시도 (이미 USDC 보유, 손실 아님)
    if (/cbbtc_preswap_shortfall/.test(message))
    {
        return { key: "lightning.cbbtcRetryWithUsdc", isUserCancellation: false };
    }
    // 8) 잔액 부족
    if (isInsufficientFunds(message))
    {
        return { key: "errors.insufficientBalance", isUserCancellation: false };
    }
    // 9) rate limit
    if (/rate limit|429/i.test(message))
    {
        return { key: "errors.rateLimit", isUserCancellation: false };
    }
    // 10) 네트워크/요청 실패
    if (/network request failed|fetch failed|timeout/i.test(message))
    {
        return { key: "errors.network", isUserCancellation: false };
    }
    return { key: "errors.generic", isUserCancellation: false };
}
