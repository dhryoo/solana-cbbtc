// Earn 액션(공급/인출/차입/상환) 실패 시 사용자에게 보여줄 안내 메시지(i18n 키) 선택 로직.
//
// WHY 분리: 네 개 폼이 동일한 ladder 를 중복으로 갖고 있어, 순서나 가드(특히 solGasLow 최후 보루,
// cancelled 일 때 무표시)를 바꾸면 네 곳을 동시에 손대야 했고 테스트도 없었다. 순수 함수로 묶어
// 단일 출처 + 단위 테스트 대상으로 만든다.

import {
    isInsufficientLamports,
    isNoBorrowsToRepay,
    isOracleStaleError,
    isWalletTimeout,
} from "@/utils/lendingErrors";

export interface EarnNoticeInput
{
    /** 실패 에러 메시지 (err.message) */
    message: string;
    /** isAuthFailure 결과 — 폼에서 side-effect(markAuthFailureNow) 때문에 미리 계산해 넘긴다 */
    authFailed: boolean;
    /** SOL 가스가 부족할 가능성 (잔액 기반 사전 신호) */
    solGasLow: boolean;
    /** 사용자가 직접 취소/거부했는지 (isUserRejection) */
    cancelled: boolean;
}

/**
 * 실패 원인에 맞는 안내 i18n 키를 고른다. 우선순위: 구체적·일시적 원인(오라클/인증/타임아웃/부채없음)
 * 을 먼저, SOL 가스 부족은 **최후 보루**로 둔다 — 그래야 저잔액 사용자가 인증 실패·타임아웃을 봐도
 * 엉뚱하게 "SOL 부족"이 뜨지 않는다. 사용자 취소면 어떤 안내도 띄우지 않는다(null).
 * 매칭이 없으면 null (호출부에서 원문 표시 또는 무표시).
 *
 * 주의: 이 ladder 의 정확성은 lendingErrors 술어들이 한 메시지에 동시에 매칭되지 않는다는
 * 가정(pairwise-disjoint)에 기댄다. earnNoticeHint.test.ts 가 대표 문자열로 이를 고정한다.
 */
export function pickEarnNoticeHintKey(input: EarnNoticeInput): string | null
{
    const { message, authFailed, solGasLow, cancelled } = input;

    // 확정 대기 예산 초과 — tx 는 나중에 랜딩될 수 있어 "실패"가 아니라 "내역 확인" 안내.
    if (/confirm_timeout/i.test(message))
    {
        return "earn.confirmTimeoutHint";
    }
    // send 후 온체인 실패(자금 미이동). 확정 폴링이 status.err 를 감지해 던짐.
    if (/failed on-chain/i.test(message))
    {
        return "earn.txFailedHint";
    }
    if (isOracleStaleError(message))
    {
        return "earn.oracleStaleHint";
    }
    if (authFailed)
    {
        return "earn.authFailedHint";
    }
    if (isWalletTimeout(message))
    {
        return "earn.walletTimeoutHint";
    }
    if (isNoBorrowsToRepay(message))
    {
        return "earn.noBorrowsHint";
    }
    // SOL(가스/rent) 부족만 "SOL 부족" 안내로 — Token 의 "insufficient funds"(예: repay 의 USDC 부족)는
    // 여기서 잡지 않는다(폼이 토큰별로 처리). 잔액 신호(solGasLow)는 취소가 아닐 때만 최후 보루.
    if (isInsufficientLamports(message) || (solGasLow && !cancelled))
    {
        return "earn.insufficientHint";
    }
    return null;
}
