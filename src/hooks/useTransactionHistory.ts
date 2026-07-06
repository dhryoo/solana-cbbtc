import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { useConnection } from "@/providers/ConnectionProvider";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import {
    fetchTransactionHistory,
    type TxHistoryItem,
} from "@/services/TransactionHistoryService";
import { useWallet } from "@/hooks/useWallet";

export function historyQueryKey(owner: string | null, limit: number): readonly unknown[]
{
    return ["history", owner ?? "anonymous", limit];
}

interface UseTransactionHistoryOptions
{
    limit?: number;
    /** false 면 쿼리 비활성(예: 내역 모달이 닫혀 있을 때 불필요한 RPC 폴링 방지). 기본 true. */
    enabled?: boolean;
}

/**
 * 최근 거래 내역. 지갑이 연결된 경우에만 enabled.
 *
 * 캐시 전략:
 * - staleTime 30초 — 잦은 RPC 호출 회피 + 사용자가 supply 직후 home 로 돌아왔을 때 거의-최신 표시
 * - invalidate 는 supply/withdraw/borrow/repay/swap hook 의 onSuccess 에서 이미 ["balance"]/["kamino"]
 *   를 호출하므로, 여기서는 추가로 ["history"] 도 invalidate 하는 식으로 확장(추후).
 *   현재는 staleTime 만으로도 충분 (pull-to-refresh 와 결합).
 */
export function useTransactionHistory(
    options: UseTransactionHistoryOptions = {},
): UseQueryResult<TxHistoryItem[], Error>
{
    const connection = useConnection();
    const { isOnline } = useNetworkStatus();
    const { account } = useWallet();
    const limit = options.limit ?? 25;
    const enabled = options.enabled ?? true;
    const owner = account?.publicKey.toBase58() ?? null;

    return useQuery<TxHistoryItem[], Error>({
        queryKey: historyQueryKey(owner, limit),
        enabled: enabled && isOnline && Boolean(account),
        staleTime: 30_000,
        // Helius 무료 티어의 RPS 한도를 자극하지 않도록 재시도 최소화.
        // 1 회만 retry, 1.2 초 대기.
        retry: 1,
        retryDelay: 1_200,
        queryFn: async () =>
        {
            if (!account)
            {
                return [];
            }
            return fetchTransactionHistory(connection, account.publicKey, { limit });
        },
    });
}
