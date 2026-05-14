import * as Network from "expo-network";
import React, { createContext, useContext, useMemo } from "react";

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

interface NetworkProviderProps
{
    children: React.ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps): React.JSX.Element
{
    const state = Network.useNetworkState();

    const value = useMemo<NetworkStatus>(() =>
    {
        // isConnected가 false면 디바이스 자체가 미연결. internet reachability는 OS가 모르면 undefined.
        const connected = state.isConnected ?? true;
        const reachable = state.isInternetReachable ?? true;
        return {
            isOnline: connected && reachable,
            isInternetReachable: reachable,
        };
    }, [state.isConnected, state.isInternetReachable]);

    return (
        <NetworkContext.Provider value={value}>
            {children}
        </NetworkContext.Provider>
    );
}

export function useNetworkStatus(): NetworkStatus
{
    return useContext(NetworkContext);
}
