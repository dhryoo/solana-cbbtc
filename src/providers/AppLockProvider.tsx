import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

import {
    authenticate,
    getCapability,
    type DeviceLockCapability,
} from "@/services/AppLockService";
import {
    loadAppLockEnabled,
    saveAppLockEnabled,
} from "@/utils/appLockPreference";

export type LockState = "initializing" | "unlocked" | "locked" | "unlocking";

interface AppLockContextValue
{
    enabled: boolean;
    state: LockState;
    capability: DeviceLockCapability | null;
    /** true: 잠금 활성화 시도. 디바이스에 biometric 미설정이면 false 반환. */
    setEnabled: (next: boolean) => Promise<boolean>;
    /** 사용자 액션으로 잠금 해제 시도. LockScreen에서 호출. */
    unlock: () => Promise<void>;
}

const AppLockContext = createContext<AppLockContextValue | null>(null);

// background에서 active로 돌아왔을 때 너무 짧은 부재(예: biometric prompt 자체로 인한 transition)는
// 재잠금하지 않도록 grace period 적용. Seeker의 hardware-backed prompt는 일반 Android보다
// 응답이 느릴 수 있어 3초까지는 같은 인증 세션으로 간주.
const REGLOCK_GRACE_MS = 3000;

interface AppLockProviderProps
{
    children: React.ReactNode;
}

export function AppLockProvider({ children }: AppLockProviderProps): React.JSX.Element
{
    const [enabled, setEnabledState] = useState(false);
    const [state, setState] = useState<LockState>("initializing");
    const [capability, setCapability] = useState<DeviceLockCapability | null>(null);

    // AppState 추적을 위한 ref들
    const lastBackgroundedAt = useRef<number | null>(null);
    const enabledRef = useRef(enabled);
    enabledRef.current = enabled;
    const stateRef = useRef<LockState>(state);
    stateRef.current = state;

    // 시작 시 1회: 디바이스 능력 + 저장된 preference 조회.
    useEffect(() =>
    {
        let cancelled = false;
        void (async (): Promise<void> =>
        {
            const [cap, stored] = await Promise.all([
                getCapability(),
                loadAppLockEnabled(),
            ]);
            if (cancelled)
            {
                return;
            }
            setCapability(cap);
            const usable = cap.hasHardware && cap.isEnrolled;
            const effectivelyEnabled = stored && usable;
            setEnabledState(effectivelyEnabled);
            // 저장된 preference가 있고 사용 가능하면 즉시 잠금 상태로 시작
            setState(effectivelyEnabled ? "locked" : "unlocked");
        })();
        return () =>
        {
            cancelled = true;
        };
    }, []);

    // AppState 감지: background → active 전이 시 잠금 재활성화
    useEffect(() =>
    {
        const handler = (next: AppStateStatus): void =>
        {
            if (next === "background" || next === "inactive")
            {
                lastBackgroundedAt.current = Date.now();
                return;
            }
            if (next === "active")
            {
                const t = lastBackgroundedAt.current;
                lastBackgroundedAt.current = null;
                // grace period: biometric prompt 등이 잠시 background를 만들 수 있어 너무 짧으면 무시
                if (t === null || Date.now() - t < REGLOCK_GRACE_MS)
                {
                    return;
                }
                if (enabledRef.current && stateRef.current === "unlocked")
                {
                    setState("locked");
                }
            }
        };
        const sub = AppState.addEventListener("change", handler);
        return () =>
        {
            sub.remove();
        };
    }, []);

    const setEnabled = useCallback(async (next: boolean): Promise<boolean> =>
    {
        if (next)
        {
            // 활성화 시도 — 디바이스에 biometric 등록이 없으면 거부
            const cap = capability ?? await getCapability();
            setCapability(cap);
            if (!cap.hasHardware || !cap.isEnrolled)
            {
                return false;
            }
            // 활성화 직전에 한 번 인증을 요구해 의도 확인 (보안 best practice)
            const outcome = await authenticate("앱 잠금 활성화");
            if (outcome.kind !== "success")
            {
                return false;
            }
            await saveAppLockEnabled(true);
            setEnabledState(true);
            // 활성화 후 즉시 잠그지는 않음 — 사용자는 방금 인증했으므로 현재 세션은 unlocked
            return true;
        }
        // 비활성화 시도 — 현재 잠긴 상태면 인증 후 진행 (보안: 누군가가 잠금만 끄지 못하도록)
        if (stateRef.current === "locked")
        {
            const outcome = await authenticate("앱 잠금 비활성화");
            if (outcome.kind !== "success")
            {
                return false;
            }
        }
        await saveAppLockEnabled(false);
        setEnabledState(false);
        setState("unlocked");
        return true;
    }, [capability]);

    const unlock = useCallback(async (): Promise<void> =>
    {
        if (stateRef.current === "unlocking" || stateRef.current === "unlocked")
        {
            return;
        }
        setState("unlocking");
        // biometric prompt 자체가 만드는 AppState background→active 전환을 "잠금 재발동" 으로
        // 잘못 해석하지 않도록 unlock 진입 시 background timestamp를 초기화.
        // 동일하게 unlock 종료 후에도 한 번 더 reset해서, authenticate가 resolve된 뒤 늦게 도착하는
        // AppState handler가 방금 unlocked 한 상태를 다시 locked로 강제하는 race를 차단.
        lastBackgroundedAt.current = null;
        const outcome = await authenticate("앱 잠금 해제");
        lastBackgroundedAt.current = null;
        if (outcome.kind === "success")
        {
            setState("unlocked");
            return;
        }
        // 실패: 잠금 유지. 사용자가 LockScreen에서 재시도 가능.
        setState("locked");
    }, []);

    const value = useMemo<AppLockContextValue>(() =>
        ({
            enabled,
            state,
            capability,
            setEnabled,
            unlock,
        }), [enabled, state, capability, setEnabled, unlock]);

    return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock(): AppLockContextValue
{
    const ctx = useContext(AppLockContext);
    if (!ctx)
    {
        throw new Error("useAppLock must be used within AppLockProvider");
    }
    return ctx;
}
