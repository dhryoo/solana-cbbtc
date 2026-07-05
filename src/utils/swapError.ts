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
        // 확정 예산 초과 — network 의 bare /timeout/ 보다 먼저 (confirm_timeout 이 /timeout/ 에 잡히지 않도록).
        // tx 는 나중에 랜딩될 수 있어 "실패"가 아니라 "내역 확인" 안내.
        test: (m) => /confirm_timeout/i.test(m),
        key: "errors.confirmTimeout",
    },
    {
        // send 후 온체인에서 실패(자금 미이동). 확정 폴링이 status.err 를 감지해 던짐.
        test: (m) => /failed on-chain/i.test(m),
        key: "errors.txFailedOnChain",
    },
    {
        // 지갑 응답 타임아웃 — network 의 bare /timeout/ 보다 먼저 (MWA 서명 무응답 선점)
        test: (m) => /TimeoutException|Timed out waiting for response/i.test(m),
        key: "errors.walletTimeout",
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
