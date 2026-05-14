// 잔액·견적 조회 에러를 사용자 친화 카테고리로 분류해 i18n 키 반환.
// swapError와 동일 패턴이지만 swap 트랜잭션이 아닌 read-only 조회에 특화.

export type BalanceErrorKind =
    | "rateLimit"
    | "network"
    | "rpc4xx"
    | "rpc5xx"
    | "auth"
    | "unknown";

export interface BalanceErrorInfo
{
    kind: BalanceErrorKind;
    key: string;
    rawMessage: string;
}

// 순서가 중요 — 가장 구체적인 매칭부터. "401 Unauthorized"는 rpc4xx보다 auth로 우선 분류.
const PATTERNS: Array<{ test: (m: string) => boolean; kind: BalanceErrorKind; key: string }> = [
    {
        test: (m) => /429|rate limit|too many requests/i.test(m),
        kind: "rateLimit",
        key: "errors.balanceRateLimit",
    },
    {
        test: (m) => /network request failed|fetch failed|econnreset|enotfound|timeout/i.test(m),
        kind: "network",
        key: "errors.balanceNetwork",
    },
    {
        test: (m) => /unauthorized|forbidden|api key|401|403/i.test(m),
        kind: "auth",
        key: "errors.balanceAuth",
    },
    {
        test: (m) => /\b40[0-9]\b|invalid|bad request/i.test(m),
        kind: "rpc4xx",
        key: "errors.balanceRpc4xx",
    },
    {
        test: (m) => /\b50[0-9]\b|server error|service unavailable|internal/i.test(m),
        kind: "rpc5xx",
        key: "errors.balanceRpc5xx",
    },
];

function extractMessage(err: unknown): string
{
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    try { return JSON.stringify(err); }
    catch { return String(err); }
}

export function classifyBalanceError(err: unknown): BalanceErrorInfo
{
    const raw = extractMessage(err);
    for (const p of PATTERNS)
    {
        if (p.test(raw))
        {
            return { kind: p.kind, key: p.key, rawMessage: raw };
        }
    }
    return { kind: "unknown", key: "errors.balanceUnknown", rawMessage: raw };
}
