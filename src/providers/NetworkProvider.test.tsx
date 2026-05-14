import { renderHook } from "@testing-library/react-native";
import * as Network from "expo-network";
import React from "react";

import { NetworkProvider, useNetworkStatus } from "./NetworkProvider";

const mockedNetwork = Network as jest.Mocked<typeof Network>;

function wrapper({ children }: { children: React.ReactNode }): React.JSX.Element
{
    return <NetworkProvider>{children}</NetworkProvider>;
}

describe("NetworkProvider", () =>
{
    afterEach(() =>
    {
        jest.clearAllMocks();
    });

    it("reports online when both isConnected and isInternetReachable are true", () =>
    {
        mockedNetwork.useNetworkState.mockReturnValue({
            type: Network.NetworkStateType.WIFI,
            isConnected: true,
            isInternetReachable: true,
        });

        const { result } = renderHook(() => useNetworkStatus(), { wrapper });

        expect(result.current.isOnline).toBe(true);
        expect(result.current.isInternetReachable).toBe(true);
    });

    it("reports offline when isConnected is false", () =>
    {
        mockedNetwork.useNetworkState.mockReturnValue({
            type: Network.NetworkStateType.NONE,
            isConnected: false,
            isInternetReachable: false,
        });

        const { result } = renderHook(() => useNetworkStatus(), { wrapper });

        expect(result.current.isOnline).toBe(false);
    });

    it("reports offline when device is connected but internet is not reachable", () =>
    {
        // Wi-Fi에 붙어 있지만 캡티브 포털 등으로 외부 reach 실패
        mockedNetwork.useNetworkState.mockReturnValue({
            type: Network.NetworkStateType.WIFI,
            isConnected: true,
            isInternetReachable: false,
        });

        const { result } = renderHook(() => useNetworkStatus(), { wrapper });

        expect(result.current.isOnline).toBe(false);
        expect(result.current.isInternetReachable).toBe(false);
    });

    it("treats unknown (undefined) values as online (optimistic default)", () =>
    {
        // 초기 mount 직후 expo-network이 아직 값을 채우지 못한 상태
        mockedNetwork.useNetworkState.mockReturnValue({});

        const { result } = renderHook(() => useNetworkStatus(), { wrapper });

        expect(result.current.isOnline).toBe(true);
    });

    it("falls back to online when no provider is mounted", () =>
    {
        const { result } = renderHook(() => useNetworkStatus());

        expect(result.current.isOnline).toBe(true);
    });
});
