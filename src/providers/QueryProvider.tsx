import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useMemo } from "react";

interface QueryProviderProps
{
    children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps): React.JSX.Element
{
    // QueryClient는 앱 라이프타임 동안 단일 인스턴스.
    // 잔액류는 30초 fresh, 5분 cache 유지. 사용자 명시적 새로고침은 invalidate 호출.
    const client = useMemo(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30_000,
                gcTime: 5 * 60_000,
                retry: 1,
                refetchOnWindowFocus: false,
            },
        },
    }), []);

    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
