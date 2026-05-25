// Kamino lending 시뮬레이션 에러 중 사용자에게 별도 안내가 필요한 케이스 판별.

/**
 * 오라클 가격이 너무 오래되어(PriceTooOld 6039 / ReserveStale 6009) 거래가 막힌 경우.
 * 우리 트랜잭션 문제가 아니라 외부 Scope 오라클 신선도 문제 — 잠시 후 재시도하면 보통 해결됨.
 */
export function isOracleStaleError(message: string): boolean
{
    return /6039|PriceTooOld|6009|ReserveStale|Price is too old|Reserve state needs to be refreshed/i.test(message);
}

/**
 * 사용자가 지갑에서 승인을 취소/거부한 경우 (MWA 는 java CancellationException 등으로 전달).
 * raw 예외 대신 "취소됨" 안내로 처리하기 위한 판별.
 */
export function isUserRejection(message: string): boolean
{
    return /Cancellation|cancell?ed|rejected|declined|denied|session (terminated|closed)/i.test(message);
}

/**
 * SOL/토큰 잔액 부족 (첫 거래의 계정 rent·수수료 포함). raw 대신 친절 안내로 처리.
 */
export function isInsufficientFunds(message: string): boolean
{
    return /insufficient (lamports|funds|balance)/i.test(message);
}

/**
 * MWA 지갑 인증 실패 (auth token 만료/무효, reauthorize 실패 등).
 * 예: "-1/authorization request failed". 지갑 재연결 안내로 처리.
 */
export function isAuthFailure(message: string): boolean
{
    return /authorization request failed|(authorization|reauthorize|auth[_ ]?token).*(fail|deni|invalid|expired)/i.test(message);
}
