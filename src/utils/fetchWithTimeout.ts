// fetch + 타임아웃.
//
// WHY: RN Android 의 네트워크 스택(OkHttp)은 JS 에서 별도 지정하지 않으면 read/connect
// 타임아웃이 사실상 무한이다. 멈춘(half-open) 연결이 영원히 매달리면 Jupiter/Atomiq/RPC
// 호출이 회수되지 않고, 그 위에 얹은 failover 나 재시도도 회전하지 못한다. 모든 외부 fetch 를
// 이 헬퍼로 감싸 상한 시간 뒤 abort 하고, 타이머는 finally 에서 정리(누수 방지)한다.

export const DEFAULT_FETCH_TIMEOUT_MS = 15_000;

/**
 * 지정 시간 내 응답이 없으면 abort 하고 "fetch_timeout" 으로 throw 하는 fetch.
 * 타임아웃 외의 실패는 원래 에러 그대로 전파한다. 호출부가 signal 을 넘기지 않는 전제(현재 모든
 * 외부 fetch 가 그렇다) — 넘겨도 이 헬퍼의 타임아웃 signal 로 덮어쓴다.
 */
export async function fetchWithTimeout(
    input: RequestInfo | URL,
    init?: RequestInit,
    timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response>
{
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); }, timeoutMs);
    try
    {
        return await fetch(input, { ...init, signal: controller.signal });
    }
    catch (err)
    {
        if (controller.signal.aborted)
        {
            throw new Error("fetch_timeout");
        }
        throw err;
    }
    finally
    {
        clearTimeout(timer);
    }
}
