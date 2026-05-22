import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { useConnection } from "@/providers/ConnectionProvider";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import { getMarketInfo } from "@/services/KaminoService";
import type { LendingMarketInfo } from "@/types/kamino";

export function marketInfoQueryKey(): readonly unknown[]
{
    return ["kamino", "marketInfo"];
}

// cbBTC/USDC reserve 의 마켓 정보(공급/차입 APR, 가격, utilization).
// 자주 바뀌지 않으므로 staleTime 을 길게 둬 RPC 호출을 아낀다 (no-backend, 무료 RPC 배려).
export function useKaminoMarket(): UseQueryResult<LendingMarketInfo, Error>
{
    const connection = useConnection();
    const { isOnline } = useNetworkStatus();

    return useQuery<LendingMarketInfo, Error>({
        queryKey: marketInfoQueryKey(),
        enabled: isOnline,
        staleTime: 60_000,
        queryFn: () => getMarketInfo(connection),
    });
}
