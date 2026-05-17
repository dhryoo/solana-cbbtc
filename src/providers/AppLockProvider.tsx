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

// 사용자가 방금 잠금을 푼 직후엔 wallet auto-reconnect 가 MWA intent 로 앱을 background 로
// 보냈다가 곧 돌아오는 background↔active transition 이 발생함. 이 시점에 reglock 이 발동되면
// 사용자가 인증 직후 LockScreen 으로 다시 튕겨나가는 현상이 생긴다 (production 재현).
// 따라서 unlock 후 일정 시간 동안은 AppState 변화로 인한 reglock 을 일괄 무시.
const POST_UNLOCK_REGLOCK_GRACE_MS = 20_000;

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
    // 동기 mutex — state 기반 가드는 setState 의 비동기성 때문에 빠른 재진입에 약함.
    // ref 는 동기적으로 update되므로 같은 frame 내 중복 호출도 차단.
    const inFlightRef = useRef(false);
    // 방금 unlock 한 시각. AppState handler 가 reglock 결정 시 이 값을 확인해
    // wallet reconnect 등 system-initiated background transition 으로 인한 잘못된 reglock 차단.
    const lastUnlockAtRef = useRef<number | null>(null);

    const unlock = useCallback(async (): Promise<void> =>
    {
        // 동기 mutex: setState 가 비동기 적용되는 동안 다음 frame 의 useEffect 가 unlock 을 또
        // 호출해도 즉시 reject. 이전 fix(state-based guard)가 빠른 재진입을 못 막아 native biometric
        // 서비스에 "AuthSession is not current" race가 폭주했음 (production logcat 확인).
        if (inFlightRef.current)
        {
            return;
        }
        if (stateRef.current === "unlocked")
        {
            return;
        }
        inFlightRef.current = true;
        try
        {
            setState("unlocking");
            // biometric prompt 자체가 만드는 AppState background→active 전환을 "잠금 재발동" 으로
            // 잘못 해석하지 않도록 unlock 진입/종료 시 background timestamp 를 초기화.
            lastBackgroundedAt.current = null;
            const outcome = await authenticate("앱 잠금 해제");
            lastBackgroundedAt.current = null;
            if (outcome.kind === "success")
            {
                lastUnlockAtRef.current = Date.now();
                setState("unlocked");
                return;
            }
            // 실패: 잠금 유지. 사용자가 LockScreen 버튼으로 재시도 가능.
            setState("locked");
        }
        finally
        {
            inFlightRef.current = false;
        }
    }, []);

    // 시작 시 1회: 디바이스 능력 + 저장된 preference 조회.
    //
    // 자동 biometric prompt 는 일부러 발동하지 않는다. 앱 mount / wallet reconnect /
    // MWA intent 등이 동시에 일어나면서 native biometric service 가 paused-app 의 요청을
    // silent-ignore 하는 경우가 production 에서 재현되었음 (logcat 분석). 사용자가
    // LockScreen 에서 명시적으로 탭하면 그때 unlock() 호출 — 그 path 는 항상 작동.
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
                // 방금 unlock 한 직후 (20초 이내) wallet auto-reconnect 등이 만드는
                // background transition 은 reglock 트리거가 아님.
                const unlockedAt = lastUnlockAtRef.current;
                if (unlockedAt !== null
                    && Date.now() - unlockedAt < POST_UNLOCK_REGLOCK_GRACE_MS)
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
