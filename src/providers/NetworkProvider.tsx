import * as Network from "expo-network";
import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";

// expo-network이 알려주는 isConnected/isInternetReachable을 단일 isOnline boolean으로 통합.
// 정책: "명시적으로 offline일 때만 차단". 초기값 unknown(undefined)은 online으로 간주.
// (잘못된 false positive로 reviewer가 정상 환경에서 막히는 상황을 피함)
export interface NetworkStatus
{
    isOnline: boolean;
    isInternetReachable: boolean;
}

const DEFAULT_STATUS: NetworkStatus = {
    isOnline: true,
    isInternetReachable: true,
};

const NetworkContext = createContext<NetworkStatus>(DEFAULT_STATUS);

// offline 인 동안 재연결을 스스로 감지하기 위한 재조회 주기(ms).
// expo-network 의 상태 변경 이벤트는 Android 에서 연결 전이 시 stale/누락되는 알려진 버그가
// 있다(expo/expo#37972). 특히 "오프라인으로 앱을 시작 → 이후 재연결" 시 change 이벤트가
// 오지 않아 오프라인 배너가 영영 사라지지 않는다. 그래서 이벤트(useNetworkState)에만 의존하지
// 않고, offline 동안에는 getNetworkStateAsync 로 OS 의 현재 상태를 직접 재조회해 self-heal 한다.
// getNetworkStateAsync 는 이벤트 스트림이 아니라 호출 시점의 상태를 매번 새로 읽으므로 stuck 을 푼다.
const OFFLINE_RECHECK_MS = 3000;

interface NetworkProviderProps
{
    children: React.ReactNode;
}

// isConnected가 false면 디바이스 자체가 미연결. internet reachability는 OS가 모르면 undefined.
// 둘 다 unknown(undefined)이면 online으로 간주(낙관적 기본).
function toStatus(state: Network.NetworkState): NetworkStatus
{
    const connected = state.isConnected ?? true;
    const reachable = state.isInternetReachable ?? true;
    return {
        isOnline: connected && reachable,
        isInternetReachable: reachable,
    };
}

export function NetworkProvider({ children }: NetworkProviderProps): React.JSX.Element
{
    const [status, setStatus] = useState<NetworkStatus>(DEFAULT_STATUS);

    // 초기 1회 조회 + change 이벤트 구독(fast path) + 포그라운드 복귀 시 강제 재확인.
    useEffect(() =>
    {
        let cancelled = false;

        const apply = (state: Network.NetworkState): void =>
        {
            if (!cancelled)
            {
                setStatus(toStatus(state));
            }
        };

        const refresh = (): void =>
        {
            // OS 현재 상태를 새로 읽는다. 실패해도 기존 status 를 유지(차단하지 않음).
            Network.getNetworkStateAsync().then(apply).catch(() => undefined);
        };

        refresh();
        const netSub = Network.addNetworkStateListener(apply);
        // background→active 로 돌아왔을 때 그 사이의 전이 이벤트를 놓쳤을 수 있으니 재확인.
        const appSub = AppState.addEventListener("change", (next) =>
        {
            if (next === "active")
            {
                refresh();
            }
        });

        return () =>
        {
            cancelled = true;
            netSub.remove();
            appSub.remove();
        };
    }, []);

    // offline 인 동안에만 주기적으로 재조회 — 재연결 이벤트가 누락돼도 배너가 스스로 사라진다.
    // online 이면 인터벌을 걸지 않아 배터리/비용 0.
    useEffect(() =>
    {
        if (status.isOnline)
        {
            return;
        }

        let cancelled = false;
        const id = setInterval(() =>
        {
            Network.getNetworkStateAsync()
                .then((state) =>
                {
                    // 인터벌 정리(재연결/언마운트) 후 뒤늦게 도착한 응답은 무시.
                    if (!cancelled)
                    {
                        setStatus(toStatus(state));
                    }
                })
                .catch(() => undefined);
        }, OFFLINE_RECHECK_MS);

        return () =>
        {
            cancelled = true;
            clearInterval(id);
        };
    }, [status.isOnline]);

    return (
        <NetworkContext.Provider value={status}>
            {children}
        </NetworkContext.Provider>
    );
}

export function useNetworkStatus(): NetworkStatus
{
    return useContext(NetworkContext);
}
