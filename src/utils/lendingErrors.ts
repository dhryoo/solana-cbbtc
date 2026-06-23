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
 * 주의: 광범위 매칭 — SPL Token 의 "insufficient funds"(토큰 잔액 부족)와 System Program 의
 * "insufficient lamports"(SOL 부족)를 모두 잡는다. SOL/토큰을 구분해야 할 때는
 * isInsufficientLamports 와 함께 쓴다. (예: repay 실패는 USDC 부족이지 SOL 부족이 아님)
 */
export function isInsufficientFunds(message: string): boolean
{
    return /insufficient (lamports|funds|balance)/i.test(message);
}

/**
 * SOL(가스/rent) 부족 — System Program 의 "insufficient lamports" 전용.
 * SPL Token 의 "insufficient funds"(토큰 잔액 부족)는 잡지 않는다.
 * 이 둘을 구분해야 "SOL 부족" 안내를 토큰 부족 실패에 잘못 띄우지 않는다.
 */
export function isInsufficientLamports(message: string): boolean
{
    return /insufficient lamports/i.test(message);
}

/**
 * MWA 지갑 인증 실패 (auth token 만료/무효, reauthorize 실패 등).
 * 예: "-1/authorization request failed". 지갑 재연결 안내로 처리.
 */
export function isAuthFailure(message: string): boolean
{
    return /authorization request failed|(authorization|reauthorize|auth[_ ]?token).*(fail|deni|invalid|expired)/i.test(message);
}

/**
 * MWA 응답 타임아웃 — 지갑 앱이 제때 응답하지 못한 경우.
 * 예: "java.util.concurrent.TimeoutException: Timed out waiting for response with id=…".
 * 보통 지갑 앱이 백그라운드에 묻혔거나 화면이 너무 오래 떠 있었을 때 발생. 다시 시도 안내로 처리.
 */
export function isWalletTimeout(message: string): boolean
{
    return /TimeoutException|Timed out waiting for response/i.test(message);
}

/**
 * Kamino 6021 ObligationBorrowsEmpty — 상환할 부채가 이미 0 인 경우.
 * 보통 직전에 전액 상환했는데 UI 캐시가 갱신되기 전 다시 상환을 누르거나,
 * 다른 경로(웹/다른 지갑) 에서 상환된 직후. "새로고침 후 확인" 안내로 처리.
 */
export function isNoBorrowsToRepay(message: string): boolean
{
    return /6021|ObligationBorrowsEmpty|Obligation borrows are empty/i.test(message);
}
