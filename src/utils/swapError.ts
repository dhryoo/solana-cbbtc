// Swap 실행 중 발생할 수 있는 다양한 에러를 사용자에게 보여줄 한국어 메시지로 변환.
// 정확한 에러 매칭이 어려우므로 메시지 substring 기반 휴리스틱.
// 매핑이 안 된 경우 fallback으로 영문 원본을 노출 (디버깅을 위해).

import { JupiterApiError } from "@/types/jupiter";

export interface FriendlyError
{
    message: string;
    rawMessage: string;
    isUserCancellation: boolean;
}

const PATTERNS: Array<{ test: (msg: string) => boolean; message: string; isCancel?: boolean }> = [
    {
        test: (m) => /user (rejected|denied|declined|cancell?ed)/i.test(m),
        message: "사용자가 트랜잭션 승인을 취소했습니다.",
        isCancel: true,
    },
    {
        test: (m) => /session (terminated|closed|cancell?ed)/i.test(m),
        message: "지갑 세션이 종료됐습니다. 다시 시도해 주세요.",
        isCancel: true,
    },
    {
        test: (m) => /(authorization|reauthorize|auth_token).*(fail|denied|invalid|expired)/i.test(m),
        message: "지갑 인증이 만료됐습니다. 지갑을 다시 연결한 뒤 시도해 주세요.",
    },
    {
        test: (m) => /insufficient (lamports|funds|balance)/i.test(m),
        message: "잔액이 부족합니다. SOL 또는 입력 토큰 잔액을 확인해 주세요.",
    },
    {
        test: (m) => /slippage.*(exceeded|tolerance|too high)/i.test(m),
        message: "가격 변동이 허용한 슬리피지를 초과했습니다. 슬리피지를 올리고 다시 시도해 주세요.",
    },
    {
        test: (m) => /blockhash.*not found/i.test(m),
        message: "트랜잭션이 블록해시 만료로 거부됐습니다. 다시 시도해 주세요.",
    },
    {
        test: (m) => /computational budget exceeded/i.test(m),
        message: "트랜잭션이 너무 복잡해 계산 한도를 넘었습니다. 잠시 후 다시 시도해 주세요.",
    },
    {
        test: (m) => /rate limit|429/i.test(m),
        message: "Jupiter API 요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.",
    },
    {
        test: (m) => /network request failed|fetch failed|timeout/i.test(m),
        message: "네트워크 오류로 요청이 실패했습니다. 연결 상태를 확인해 주세요.",
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
            return {
                message: "Jupiter API 요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.",
                rawMessage: raw,
                isUserCancellation: false,
            };
        }
        if (err.status >= 500)
        {
            return {
                message: "Jupiter 서비스가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요.",
                rawMessage: raw,
                isUserCancellation: false,
            };
        }
        return {
            message: `Jupiter 요청이 거부됐습니다 (HTTP ${err.status}). 입력값을 확인해 주세요.`,
            rawMessage: raw,
            isUserCancellation: false,
        };
    }

    for (const p of PATTERNS)
    {
        if (p.test(raw))
        {
            return {
                message: p.message,
                rawMessage: raw,
                isUserCancellation: p.isCancel ?? false,
            };
        }
    }

    return {
        message: "트랜잭션이 실패했습니다. 잠시 후 다시 시도해 주세요.",
        rawMessage: raw,
        isUserCancellation: false,
    };
}
