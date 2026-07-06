import React, {
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { useAppLock } from "@/providers/AppLockProvider";
import * as WalletService from "@/services/WalletService";
import type { ConnectedAccount } from "@/services/WalletService";
import { clearAuthToken, loadAuthToken, saveAuthToken } from "@/utils/authStorage";
import { saveWalletConnectedAt } from "@/utils/walletAuthAge";

export type WalletStatus =
    | "idle"
    | "restoring"
    | "connecting"
    | "connected"
    | "disconnecting"
    | "error";

export interface WalletContextValue
{
    status: WalletStatus;
    account: ConnectedAccount | null;
    error: Error | null;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    /** disconnect 후 즉시 connect — 만료된 세션을 새 토큰으로 갱신할 때 사용. */
    reconnect: () => Promise<void>;
}

export const WalletContext = createContext<WalletContextValue | null>(null);

interface WalletProviderProps
{
    children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps): React.JSX.Element
{
    const [status, setStatus] = useState<WalletStatus>("restoring");
    const [account, setAccount] = useState<ConnectedAccount | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const isMounted = useRef(true);
    const restoreAttemptedRef = useRef(false);
    // sink 콜백이 최신 account 를 읽도록 ref 로 미러링 (effect deps 를 늘리지 않기 위해).
    const accountRef = useRef<ConnectedAccount | null>(account);
    accountRef.current = account;
    const { state: appLockState, enabled: appLockEnabled } = useAppLock();

    useEffect(() =>
    {
        isMounted.current = true;
        return () =>
        {
            isMounted.current = false;
        };
    }, []);

    // 서명 흐름의 reauthorize 가 auth_token 을 회전/확인하면 상태·저장소에 반영(R06). 회전된 토큰을
    // 버리면 다음 서명·앱 재시작 복원이 stale 토큰으로 실패했다(12h stale 배너·markAuthFailure 밴드에이드의
    // 근본 원인). 성공한 reauthorize 는 세션이 살아있다는 증거이므로 stale 시계도 리셋한다.
    useEffect(() =>
    {
        WalletService.setAuthTokenSink((rotated) =>
        {
            const cur = accountRef.current;
            if (!cur)
            {
                return;
            }
            void saveWalletConnectedAt(Date.now());
            if (cur.authToken !== rotated)
            {
                const updated = { ...cur, authToken: rotated };
                accountRef.current = updated;
                setAccount(updated);
                void saveAuthToken(rotated);
            }
        });
        return () =>
        {
            WalletService.setAuthTokenSink(null);
        };
    }, []);

    // 앱 시작 시 저장된 authToken으로 자동 reauthorize 시도.
    //
    // AppLock 이 활성화되어 있으면 unlocked 상태가 될 때까지 대기 — 그러지 않으면
    // MWA reconnect intent 가 앱을 background 로 보내고, 그 사이 biometric prompt 가
    // silent fail 한다. (production logcat 으로 확인됨)
    //
    // restoreAttemptedRef 가 mount 동안 단 1회만 자동 reconnect 시도하도록 보장.
    useEffect(() =>
    {
        if (restoreAttemptedRef.current)
        {
            return;
        }
        if (appLockState === "initializing")
        {
            return;
        }
        if (appLockEnabled && appLockState !== "unlocked")
        {
            return;
        }
        restoreAttemptedRef.current = true;

        let cancelled = false;

        const tryRestore = async (): Promise<void> =>
        {
            const stored = await loadAuthToken();
            if (cancelled)
            {
                return;
            }
            if (!stored)
            {
                setStatus("idle");
                return;
            }

            try
            {
                const restored = await WalletService.reconnect(stored);
                if (cancelled)
                {
                    return;
                }
                // authToken이 회전했을 수 있으니 갱신
                if (restored.authToken !== stored)
                {
                    await saveAuthToken(restored.authToken);
                }
                // reauthorize 성공 = 세션이 살아있음 → stale 시계 리셋.
                await saveWalletConnectedAt(Date.now());
                setAccount(restored);
                setStatus("connected");
            }
            catch
            {
                if (cancelled)
                {
                    return;
                }
                // reauthorize 실패 시 토큰 폐기 후 idle (에러는 표시 안 함)
                await clearAuthToken();
                await saveWalletConnectedAt(null);
                setStatus("idle");
            }
        };

        void tryRestore();

        return () =>
        {
            cancelled = true;
        };
    }, [appLockState, appLockEnabled]);

    const connect = useCallback(async (): Promise<void> =>
    {
        setStatus("connecting");
        setError(null);
        try
        {
            const next = await WalletService.connect();
            await saveAuthToken(next.authToken);
            await saveWalletConnectedAt(Date.now());
            if (!isMounted.current)
            {
                return;
            }
            setAccount(next);
            setStatus("connected");
        }
        catch (err)
        {
            if (!isMounted.current)
            {
                return;
            }
            setError(err instanceof Error ? err : new Error(String(err)));
            setStatus("error");
        }
    }, []);

    const disconnect = useCallback(async (): Promise<void> =>
    {
        const current = account;
        if (!current)
        {
            return;
        }
        setStatus("disconnecting");
        setError(null);
        try
        {
            await WalletService.disconnect(current.authToken);
        }
        catch
        {
            // 디바이스에서 이미 폐기됐을 수 있으니 무시
        }
        await clearAuthToken();
        await saveWalletConnectedAt(null);
        if (!isMounted.current)
        {
            return;
        }
        setAccount(null);
        setStatus("idle");
    }, [account]);

    const reconnect = useCallback(async (): Promise<void> =>
    {
        await disconnect();
        await connect();
    }, [disconnect, connect]);

    const value = useMemo<WalletContextValue>(() =>
        ({
            status,
            account,
            error,
            connect,
            disconnect,
            reconnect,
        }), [status, account, error, connect, disconnect, reconnect]);

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
}
