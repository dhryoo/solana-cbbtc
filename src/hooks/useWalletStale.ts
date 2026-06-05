import { useEffect, useState } from "react";

import { useWallet } from "@/hooks/useWallet";
import { isStaleAuth, loadWalletConnectedAt, STALE_THRESHOLD_MS } from "@/utils/walletAuthAge";

const REEVAL_INTERVAL_MS = 60 * 1000; // 1 분마다 재평가 (12h 임계 대비 충분)

/**
 * MWA 세션이 stale 한지 사전 감지.
 *
 * - 지갑 미연결 → 항상 false (배너 의미 없음)
 * - 마지막 connect/reauthorize 가 12시간 이상 지났거나 isAuthFailure 마킹되어 있으면 true
 *
 * AsyncStorage 의 connectedAt 을 비동기로 읽어 state 에 보관. WalletProvider 의 connect/disconnect 가
 * connectedAt 을 갱신하므로, account 변화에 반응해서 다시 로드한다.
 */
export function useWalletStale(): { stale: boolean }
{
    const { account } = useWallet();
    const [connectedAt, setConnectedAt] = useState<number | null>(null);
    const [, setTick] = useState(0);

    // account 변화 시(연결·해제·재연결) connectedAt 재로드.
    useEffect(() =>
    {
        let mounted = true;
        if (!account)
        {
            setConnectedAt(null);
            return () => { mounted = false; };
        }
        void loadWalletConnectedAt().then((v) =>
        {
            if (mounted)
            {
                setConnectedAt(v);
            }
        });
        return () => { mounted = false; };
    }, [account]);

    // 시간이 흐르며 자연스럽게 stale 로 넘어가는 경계를 잡기 위해 주기적으로 재평가.
    // 짧은 setInterval 은 RN 에서 불이익 적음 — 1분에 한 번.
    useEffect(() =>
    {
        if (!account)
        {
            return;
        }
        const id = setInterval(() => setTick((n) => n + 1), REEVAL_INTERVAL_MS);
        return () => clearInterval(id);
    }, [account]);

    const stale = Boolean(account) && isStaleAuth(connectedAt, Date.now());
    return { stale };
}

export { STALE_THRESHOLD_MS };
