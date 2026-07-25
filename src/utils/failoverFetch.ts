// 무료 티어 RPC 의 429/5xx·네트워크 오류를 흡수하는 failover fetch.
// web3.js Connection 의 모든 JSON-RPC 호출은 주입된 fetch 를 통하므로, 여기서 endpoint 를
// 회전하면 단일 Connection 인터페이스를 유지한 채 자동 폴백이 된다.
// - 마지막으로 성공한 endpoint 를 sticky 로 기억해 다음 호출의 시작점으로 사용
// - 429/5xx 또는 throw 시 다음 endpoint 로 재시도, 한 바퀴 다 실패하면 마지막 에러를 throw
// baseFetch 주입 가능 — 테스트에서 mock 주입.
//
// ConnectionProvider(앱 RPC)와 AtomiqProvider(라이트닝 SDK)가 공유한다 — 서비스가 provider 를
// import 하지 않도록 util 로 분리.
export function makeFailoverFetch(
    endpoints: readonly string[],
    baseFetch: typeof fetch = fetch,
): typeof fetch
{
    let preferred = 0;
    return async (_input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): Promise<Response> =>
    {
        let lastError: unknown;
        for (let attempt = 0; attempt < endpoints.length; attempt += 1)
        {
            const idx = (preferred + attempt) % endpoints.length;
            const url = endpoints[idx]!;
            try
            {
                const res = await baseFetch(url, init);
                // 429(rate limit)·5xx(서버 오류)는 다음 endpoint 로 폴백
                if (res.status === 429 || res.status >= 500)
                {
                    lastError = new Error(`RPC ${url} returned ${res.status}`);
                    continue;
                }
                preferred = idx; // 성공한 endpoint 를 다음부터 우선
                return res;
            }
            catch (e)
            {
                // 네트워크 오류 → 다음 endpoint 시도
                lastError = e;
            }
        }
        throw lastError ?? new Error("All RPC endpoints failed");
    };
}
