import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";

import { useConnection } from "@/providers/ConnectionProvider";
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

    return useQuery<TokenBalance, Error>({
        queryKey: balanceQueryKey(token, owner),
        enabled: owner !== null,
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
