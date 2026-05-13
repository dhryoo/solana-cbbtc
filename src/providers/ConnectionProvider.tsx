import { Connection } from "@solana/web3.js";
import React, { createContext, useContext, useMemo } from "react";

import { getRpcEndpoint } from "@/constants/cluster";

export const ConnectionContext = createContext<Connection | null>(null);

interface ConnectionProviderProps
{
    children: React.ReactNode;
    endpoint?: string;
}

export function ConnectionProvider({
    children,
    endpoint,
}: ConnectionProviderProps): React.JSX.Element
{
    const connection = useMemo(() =>
    {
        const url = endpoint ?? getRpcEndpoint();
        return new Connection(url, "confirmed");
    }, [endpoint]);

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
