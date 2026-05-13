import React, {
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import * as WalletService from "@/services/WalletService";
import type { ConnectedAccount } from "@/services/WalletService";
import { clearAuthToken, loadAuthToken, saveAuthToken } from "@/utils/authStorage";

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

    useEffect(() =>
    {
        isMounted.current = true;
        return () =>
        {
            isMounted.current = false;
        };
    }, []);

    // 앱 시작 시 저장된 authToken으로 자동 reauthorize 시도
    useEffect(() =>
    {
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
                setStatus("idle");
            }
        };

        void tryRestore();

        return () =>
        {
            cancelled = true;
        };
    }, []);

    const connect = useCallback(async (): Promise<void> =>
    {
        setStatus("connecting");
        setError(null);
        try
        {
            const next = await WalletService.connect();
            await saveAuthToken(next.authToken);
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
        if (!isMounted.current)
        {
            return;
        }
        setAccount(null);
        setStatus("idle");
    }, [account]);

    const value = useMemo<WalletContextValue>(() =>
        ({
            status,
            account,
            error,
            connect,
            disconnect,
        }), [status, account, error, connect, disconnect]);

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
}
