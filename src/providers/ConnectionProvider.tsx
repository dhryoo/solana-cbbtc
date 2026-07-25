import { Connection } from "@solana/web3.js";
import React, { createContext, useContext, useMemo, useRef } from "react";

import { getRpcEndpoints } from "@/constants/cluster";
import { makeFailoverFetch } from "@/utils/failoverFetch";

export const ConnectionContext = createContext<Connection | null>(null);

interface ConnectionProviderProps
{
    children: React.ReactNode;
    endpoint?: string;
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
