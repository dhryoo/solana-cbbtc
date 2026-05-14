import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";

import { useConnection } from "@/providers/ConnectionProvider";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import {
    getSolBalance,
    getTokenBalance,
    type TokenBalance,
} from "@/services/TokenService";
import type { TokenInfo } from "@/constants/tokens";

export function balanceQueryKey(token: TokenInfo, owner: PublicKey | null): readonly unknown[]
{
    return ["balance", token.mint, owner?.toBase58() ?? "no-owner"];
}

export function useTokenBalance(
    token: TokenInfo,
    owner: PublicKey | null,
): UseQueryResult<TokenBalance, Error>
{
    const connection = useConnection();
    const { isOnline } = useNetworkStatus();

    return useQuery<TokenBalance, Error>({
        queryKey: balanceQueryKey(token, owner),
        // 오프라인 상태에서는 RPC 호출이 어차피 실패. fetch를 시도조차 하지 않음.
        // 온라인으로 돌아오면 query가 자동 enable되어 refetch.
        enabled: owner !== null && isOnline,
        queryFn: async () =>
        {
            if (!owner)
            {
                throw new Error("owner is required");
            }
            if (token.isNative)
            {
                return getSolBalance(connection, owner);
            }
            return getTokenBalance(connection, owner, new PublicKey(token.mint), token.decimals);
        },
    });
}
