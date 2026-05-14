// Swap 실행 중 발생할 수 있는 에러를 i18n 번역 키로 변환.
// 호출자가 t(key, params)로 최종 메시지를 렌더링.

import { JupiterApiError } from "@/types/jupiter";

export interface FriendlyError
{
    key: string;
    params?: Record<string, unknown>;
    rawMessage: string;
    isUserCancellation: boolean;
}

const PATTERNS: Array<{ test: (msg: string) => boolean; key: string; isCancel?: boolean }> = [
    {
        test: (m) => /user (rejected|denied|declined|cancell?ed)/i.test(m),
        key: "errors.userCancelled",
        isCancel: true,
    },
    {
        test: (m) => /session (terminated|closed|cancell?ed)/i.test(m),
        key: "errors.sessionTerminated",
        isCancel: true,
    },
    {
        test: (m) => /(authorization|reauthorize|auth_token).*(fail|denied|invalid|expired)/i.test(m),
        key: "errors.authExpired",
    },
    {
        test: (m) => /insufficient (lamports|funds|balance)/i.test(m),
        key: "errors.insufficientBalance",
    },
    {
        test: (m) => /slippage.*(exceeded|tolerance|too high)/i.test(m),
        key: "errors.slippageExceeded",
    },
    {
        test: (m) => /blockhash.*not found/i.test(m),
        key: "errors.blockhashExpired",
    },
    {
        test: (m) => /computational budget exceeded/i.test(m),
        key: "errors.computeBudget",
    },
    {
        test: (m) => /rate limit|429/i.test(m),
        key: "errors.rateLimit",
    },
    {
        test: (m) => /network request failed|fetch failed|timeout/i.test(m),
        key: "errors.network",
    },
];

function extractMessage(err: unknown): string
{
    if (err instanceof Error)
    {
        return err.message;
    }
    if (typeof err === "string")
    {
        return err;
    }
    try
    {
        return JSON.stringify(err);
    }
    catch
    {
        return String(err);
    }
}

export function toFriendlySwapError(err: unknown): FriendlyError
{
    const raw = extractMessage(err);

    if (err instanceof JupiterApiError)
    {
        if (err.status === 429)
        {
            return { key: "errors.rateLimit", rawMessage: raw, isUserCancellation: false };
        }
        if (err.status >= 500)
        {
            return { key: "errors.jupiter5xx", rawMessage: raw, isUserCancellation: false };
        }
        return {
            key: "errors.jupiterClient",
            params: { status: err.status },
            rawMessage: raw,
            isUserCancellation: false,
        };
    }

    for (const p of PATTERNS)
    {
        if (p.test(raw))
        {
            return {
                key: p.key,
                rawMessage: raw,
                isUserCancellation: p.isCancel ?? false,
            };
        }
    }

    return { key: "errors.generic", rawMessage: raw, isUserCancellation: false };
}
