// 트랜잭션 온체인 확정 대기 (swap / lending / cbBTC Lightning 공용).
//
// deprecated 된 confirmTransaction(sig, commitment) 은 websocket signatureSubscribe 에
// 의존하는데 모바일 RPC 에서 불안정 → getSignatureStatuses HTTP 폴링으로 대체.
//
// 확정 없이 "성공"으로 처리하면 슬리피지 초과·blockhash 만료 등으로 온체인 실패한 tx 를
// 성공으로 오표시하게 된다(자금 미이동인데도 완료 알림). 그래서 send 이후 이 함수로
// getSignatureStatuses 를 폴링해 confirmed/finalized 를 확인한 뒤에만 성공 처리한다.

import type { Connection } from "@solana/web3.js";

// 총 확정 대기 예산. 이 시간 내 미확정이면 confirm_timeout (tx 는 나중에 랜딩될 수 있음 — 호출부에서 안내).
export const CONFIRM_TIMEOUT_MS = 90_000;
// 폴링 간격.
export const CONFIRM_POLL_MS = 2_000;
const CONFIRM_MAX_ATTEMPTS = Math.ceil(CONFIRM_TIMEOUT_MS / CONFIRM_POLL_MS);

/** abortSignal 을 존중하는 sleep — 타이머/리스너를 항상 정리(누수 방지). */
function abortableSleep(ms: number, abortSignal?: AbortSignal): Promise<void>
{
    return new Promise<void>((resolve, reject) =>
    {
        let onAbort: (() => void) | undefined;
        const timer = setTimeout(() =>
        {
            if (onAbort && abortSignal)
            {
                abortSignal.removeEventListener("abort", onAbort);
            }
            resolve();
        }, ms);
        if (abortSignal)
        {
            onAbort = () =>
            {
                clearTimeout(timer);
                reject(new Error("user_cancelled"));
            };
            if (abortSignal.aborted)
            {
                onAbort();
            }
            else
            {
                abortSignal.addEventListener("abort", onAbort, { once: true });
            }
        }
    });
}

/**
 * signature 가 confirmed/finalized 될 때까지 getSignatureStatuses 폴링.
 * - 확정 → resolve
 * - status.err(온체인 실패) → throw "transaction failed on-chain: <err>"
 * - 예산 초과 → throw "confirm_timeout"
 * - abort → throw "user_cancelled"
 * websocket 미사용 — 모바일 RPC 안정 + deprecated confirmTransaction 의존 제거.
 * (자금 안전 경로라 분기별 단위 테스트 대상.)
 */
export async function waitForConfirmation(
    connection: Pick<Connection, "getSignatureStatuses">,
    signature: string,
    abortSignal?: AbortSignal,
): Promise<void>
{
    for (let attempt = 0; attempt < CONFIRM_MAX_ATTEMPTS; attempt += 1)
    {
        if (abortSignal?.aborted)
        {
            throw new Error("user_cancelled");
        }
        const { value } = await connection.getSignatureStatuses([signature]);
        const status = value[0];
        if (status)
        {
            if (status.err)
            {
                throw new Error(`transaction failed on-chain: ${JSON.stringify(status.err)}`);
            }
            if (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized")
            {
                return;
            }
        }
        // 마지막 시도 뒤엔 자지 않고 바로 타임아웃
        if (attempt < CONFIRM_MAX_ATTEMPTS - 1)
        {
            await abortableSleep(CONFIRM_POLL_MS, abortSignal);
        }
    }
    throw new Error("confirm_timeout");
}
