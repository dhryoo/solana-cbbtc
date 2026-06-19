import { Connection } from "@solana/web3.js";
import React, { createContext, useContext, useMemo, useRef } from "react";

import { getRpcEndpoints } from "@/constants/cluster";

export const ConnectionContext = createContext<Connection | null>(null);

interface ConnectionProviderProps
{
    children: React.ReactNode;
    endpoint?: string;
}

// 무료 티어 RPC 의 429/5xx·네트워크 오류를 흡수하는 failover fetch.
// web3.js Connection 의 모든 JSON-RPC 호출은 이 fetch 를 통하므로, 여기서 endpoint 를
// 회전하면 단일 Connection 인터페이스를 유지한 채 자동 폴백이 된다.
// - 마지막으로 성공한 endpoint 를 sticky 로 기억해 다음 호출의 시작점으로 사용
// - 429/5xx 또는 throw 시 다음 endpoint 로 재시도, 한 바퀴 다 실패하면 마지막 에러를 throw
// baseFetch 주입 가능 — 테스트에서 mock 주입.
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

// 단일 Connection. endpoint 가 2개 이상이면 failover fetch 주입.
function buildFallbackConnection(endpoints: readonly string[]): Connection
{
    if (endpoints.length === 0)
    {
        throw new Error("ConnectionProvider: no RPC endpoints configured");
    }

    const first = endpoints[0]!;
    if (endpoints.length === 1)
    {
        return new Connection(first, "confirmed");
    }

    return new Connection(first, {
        commitment: "confirmed",
        fetch: makeFailoverFetch(endpoints),
    });
}

export function ConnectionProvider({
    children,
    endpoint,
}: ConnectionProviderProps): React.JSX.Element
{
    // endpoint prop이 명시되면 그것만 사용 (테스트용 override). 그렇지 않으면 폴백 체인.
    const endpointsRef = useRef<readonly string[]>(
        endpoint ? [endpoint] : getRpcEndpoints(),
    );

    const connection = useMemo(() =>
    {
        return buildFallbackConnection(endpointsRef.current);
    }, []);

    return (
        <ConnectionContext.Provider value={connection}>
            {children}
        </ConnectionContext.Provider>
    );
}

export function useConnection(): Connection
{
    const ctx = useContext(ConnectionContext);
    if (!ctx)
    {
        throw new Error("useConnection must be used within ConnectionProvider");
    }
    return ctx;
}
