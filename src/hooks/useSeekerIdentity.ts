import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useConnection } from "@/providers/ConnectionProvider";
import { useWallet } from "@/hooks/useWallet";
import { hasGenesisToken, isSeekerDevice } from "@/services/SeekerService";

export interface SeekerIdentity
{
    /** Platform.constants.Model 기반 소프트 신호. spoof 가능. */
    isSeekerDevice: boolean;
    /** 지갑이 SGT를 보유했는지 — cryptographic 검증. true일 때만 강한 신호. */
    hasGenesisToken: boolean;
    /** Genesis Token 조회 중 여부 */
    isLoading: boolean;
    /** Genesis Token 조회 에러 (있으면 UI에서 무시하고 unverified 처리) */
    error: Error | null;
}

export function useSeekerIdentity(): SeekerIdentity
{
    const connection = useConnection();
    const { account } = useWallet();
    // useMemo로 Platform check 캐싱 — 사실상 상수지만 명시적으로
    const deviceFlag = useMemo(() => isSeekerDevice(), []);

    const query = useQuery<boolean, Error>({
        queryKey: ["seeker", "genesis-token", account?.publicKey.toBase58() ?? "no-owner"],
        enabled: account !== null,
        staleTime: 60 * 60_000, // 1시간 — Genesis Token 보유 상태는 매우 안정적
        gcTime: 24 * 60 * 60_000,
        retry: 1,
        queryFn: async () =>
        {
            if (!account)
            {
                return false;
            }
            return hasGenesisToken(connection, account.publicKey);
        },
    });

    return {
        isSeekerDevice: deviceFlag,
        hasGenesisToken: query.data ?? false,
        isLoading: query.isPending && account !== null,
        error: query.error ?? null,
    };
}
