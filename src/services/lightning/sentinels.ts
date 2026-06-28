// LN 에러 sentinel 상수.
// WHY: throw 위치(useCbbtcLightning, AtomiqProvider)와 friendlyError 매퍼가 같은 문자열을
//      각자 하드코딩하면, 한쪽의 오타/리네이밍이 조용히 errors.generic 으로 떨어져도
//      테스트가 통과한다(둘 다 같은 리터럴을 따로 적었으니). 단일 출처로 묶어 그 드리프트를 막는다.

export const LN_SENTINEL = {
    /** cbBTC pre-swap 후 환율이 움직여 USDC 부족 → USDC 로 재시도 유도(이미 USDC 보유, 손실 아님) */
    PRESWAP_SHORTFALL: "cbbtc_preswap_shortfall",
    /** 받기: 결제 대기 시간 초과로 인보이스 만료 */
    RECEIVE_EXPIRED: "receive_invoice_expired",
} as const;

export type LnSentinel = (typeof LN_SENTINEL)[keyof typeof LN_SENTINEL];
