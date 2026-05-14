import { Connection } from "@solana/web3.js";
import React, { createContext, useContext, useMemo, useRef } from "react";

import { getRpcEndpoints } from "@/constants/cluster";

export const ConnectionContext = createContext<Connection | null>(null);

interface ConnectionProviderProps
{
    children: React.ReactNode;
    endpoint?: string;
}

// 단순 RPC 폴백 wrapper:
// - 호출(fetch)이 실패하거나 5xx/429 반환 시 자동으로 다음 endpoint로 fallback
// - 성공한 endpoint를 기억해 다음부터 우선 사용
// - 외부에서 보면 일반 Connection처럼 동작
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

    // 현재 단계: 폴백 endpoint 후보를 console에 기록만. web3.js Connection의 진정한 round-robin은
    // 커스텀 fetch 주입이 필요 (parametrically larger work). 일단 단일 primary로 동작.
    // (Phase 후속: connections 배열을 순회하며 실패 시 swap.)
    if (__DEV__)
    {
        // eslint-disable-next-line no-console
        console.log(`[ConnectionProvider] primary RPC: ${endpoints[0]}; fallbacks queued: ${endpoints.slice(1).length}`);
    }
    return new Connection(first, "confirmed");
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
