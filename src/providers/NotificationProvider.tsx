import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    ensureSwapChannel,
    getPermissionStatus,
    notifySwapSuccess as serviceNotifySwapSuccess,
    requestPermission,
    type PermissionStatus,
    type SwapNotificationPayload,
} from "@/services/NotificationService";
import {
    loadNotificationsEnabled,
    saveNotificationsEnabled,
} from "@/utils/notificationPreference";

interface NotificationContextValue
{
    enabled: boolean;
    permissionStatus: PermissionStatus;
    // setEnabled: true로 설정 시도 시 OS 권한 요청. 거부되면 enabled는 false로 유지.
    setEnabled: (next: boolean) => Promise<void>;
    // 호출 시점에 enabled=false면 no-op. 위 라이프사이클 외부에서는 enabled 체크 없이 호출.
    notifySwapSuccess: (payload: SwapNotificationPayload) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps
{
    children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps): React.JSX.Element
{
    const [enabled, setEnabledState] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>("undetermined");

    useEffect(() =>
    {
        let cancelled = false;
        void (async (): Promise<void> =>
        {
            // 시작 시 저장된 설정 + 현재 OS 권한 상태 동기화
            const [storedEnabled, status] = await Promise.all([
                loadNotificationsEnabled(),
                getPermissionStatus(),
            ]);
            if (cancelled)
            {
                return;
            }
            setPermissionStatus(status);
            // 사용자가 OS 설정에서 권한을 회수했으면 enabled도 강제 해제
            const effective = storedEnabled && status === "granted";
            setEnabledState(effective);
            if (effective)
            {
                await ensureSwapChannel();
            }
        })();
        return () =>
        {
            cancelled = true;
        };
    }, []);

    const setEnabled = useCallback(async (next: boolean): Promise<void> =>
    {
        if (next)
        {
            const status = await requestPermission();
            setPermissionStatus(status);
            if (status !== "granted")
            {
                // 거부됨: 사용자 의도와 결과 불일치이지만 enabled는 false로 유지
                await saveNotificationsEnabled(false);
                setEnabledState(false);
                return;
            }
            await ensureSwapChannel();
            await saveNotificationsEnabled(true);
            setEnabledState(true);
        }
        else
        {
            await saveNotificationsEnabled(false);
            setEnabledState(false);
        }
    }, []);

    const notifySwapSuccess = useCallback(async (payload: SwapNotificationPayload): Promise<void> =>
    {
        if (!enabled)
        {
            return;
        }
        try
        {
            await serviceNotifySwapSuccess(payload);
        }
        catch
        {
            // 알림 전송 실패는 swap 결과에 영향 주지 않음 — silently 무시
        }
    }, [enabled]);

    const value = useMemo<NotificationContextValue>(() =>
        ({
            enabled,
            permissionStatus,
            setEnabled,
            notifySwapSuccess,
        }), [enabled, permissionStatus, setEnabled, notifySwapSuccess]);

    return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue
{
    const ctx = useContext(NotificationContext);
    if (!ctx)
    {
        throw new Error("useNotifications must be used within NotificationProvider");
    }
    return ctx;
}
