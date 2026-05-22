import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";

import { useConnection } from "@/providers/ConnectionProvider";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import { getUserPosition } from "@/services/KaminoService";
import type { KaminoPosition } from "@/types/kamino";

export function positionQueryKey(owner: PublicKey | null): readonly unknown[]
{
    return ["kamino", "position", owner?.toBase58() ?? "no-owner"];
}

// 사용자의 Kamino lending 포지션(예치/차입/health/청산가).
// owner 없거나 오프라인이면 호출하지 않음 (useTokenBalance 와 동일 정책).
export function useKaminoPosition(owner: PublicKey | null): UseQueryResult<KaminoPosition, Error>
{
    const connection = useConnection();
    const { isOnline } = useNetworkStatus();

    return useQuery<KaminoPosition, Error>({
        queryKey: positionQueryKey(owner),
        enabled: owner !== null && isOnline,
        queryFn: async () =>
        {
            if (!owner)
            {
                throw new Error("owner is required");
            }
            return getUserPosition(connection, owner);
        },
    });
}
