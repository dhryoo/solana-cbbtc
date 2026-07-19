import { act, renderHook } from "@testing-library/react-native";
import * as Network from "expo-network";
import React from "react";

import { NetworkProvider, useNetworkStatus } from "./NetworkProvider";

// 이 provider 는 이제 expo-network 의 useNetworkState 훅이 아니라
// getNetworkStateAsync(초기/폴링) + addNetworkStateListener(이벤트 fast path) 를 직접 쓴다.
// 재연결 이벤트가 stale/누락되는 Android 버그(expo/expo#37972)를 offline 폴링으로 self-heal 하기 위함.
const getState = Network.getNetworkStateAsync as jest.MockedFunction<typeof Network.getNetworkStateAsync>;
const addListener = Network.addNetworkStateListener as jest.MockedFunction<typeof Network.addNetworkStateListener>;

const ONLINE: Network.NetworkState = {
    type: Network.NetworkStateType.WIFI,
    isConnected: true,
    isInternetReachable: true,
};
const OFFLINE: Network.NetworkState = {
    type: Network.NetworkStateType.NONE,
    isConnected: false,
    isInternetReachable: false,
};

// offline 인 동안 재조회하는 폴링 주기. NetworkProvider 의 상수와 맞춘다.
const OFFLINE_RECHECK_MS = 3000;

function wrapper({ children }: { children: React.ReactNode }): React.JSX.Element
{
    return <NetworkProvider>{children}</NetworkProvider>;
}

// 초기 getNetworkStateAsync(마이크로태스크) + 폴링 타이머를 함께 흘려보낸다.
async function advance(ms = 0): Promise<void>
{
    await act(async () =>
    {
        await jest.advanceTimersByTimeAsync(ms);
    });
}

describe("NetworkProvider", () =>
{
    beforeEach(() =>
    {
        jest.useFakeTimers();
        getState.mockReset();
        addListener.mockReset();
        addListener.mockReturnValue(
            { remove: jest.fn() } as unknown as ReturnType<typeof Network.addNetworkStateListener>,
        );
    });

    afterEach(() =>
    {
        // 남은 offline 폴링 타이머는 실행하지 말고 폐기(실행하면 act 밖 setState 경고 발생).
        jest.clearAllTimers();
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it("reports online when both isConnected and isInternetReachable are true", async () =>
    {
        getState.mockResolvedValue(ONLINE);

        const { result } = renderHook(() => useNetworkStatus(), { wrapper });
        await advance();

        expect(result.current.isOnline).toBe(true);
        expect(result.current.isInternetReachable).toBe(true);
    });

    it("reports offline when isConnected is false", async () =>
    {
        getState.mockResolvedValue(OFFLINE);

        const { result } = renderHook(() => useNetworkStatus(), { wrapper });
        await advance();

        expect(result.current.isOnline).toBe(false);
    });

    it("reports offline when device is connected but internet is not reachable", async () =>
    {
        // Wi-Fi에 붙어 있지만 캡티브 포털 등으로 외부 reach 실패
        getState.mockResolvedValue({
            type: Network.NetworkStateType.WIFI,
            isConnected: true,
            isInternetReachable: false,
        });

        const { result } = renderHook(() => useNetworkStatus(), { wrapper });
        await advance();

        expect(result.current.isOnline).toBe(false);
        expect(result.current.isInternetReachable).toBe(false);
    });

    it("treats unknown (undefined) values as online (optimistic default)", async () =>
    {
        // expo-network이 아직 값을 채우지 못한 상태
        getState.mockResolvedValue({});

        const { result } = renderHook(() => useNetworkStatus(), { wrapper });
        await advance();

        expect(result.current.isOnline).toBe(true);
    });

    it("falls back to online when no provider is mounted", () =>
    {
        const { result } = renderHook(() => useNetworkStatus());

        expect(result.current.isOnline).toBe(true);
    });

    it("updates from a network change event (fast path)", async () =>
    {
        getState.mockResolvedValue(ONLINE);

        const { result } = renderHook(() => useNetworkStatus(), { wrapper });
        await advance();
        expect(result.current.isOnline).toBe(true);

        // 이벤트로 offline 통지 → 즉시 반영되어야 한다.
        const listener = addListener.mock.calls[0]?.[0] as (s: Network.NetworkState) => void;
        act(() =>
        {
            listener(OFFLINE);
        });

        expect(result.current.isOnline).toBe(false);
    });

    // 회귀 테스트(이 버그의 핵심): 오프라인으로 시작 → 재연결.
    // expo-network 의 change 이벤트가 stale/누락돼도(expo/expo#37972) offline 동안
    // getNetworkStateAsync 폴링만으로 online 으로 회복되어 배너가 스스로 사라져야 한다.
    it("self-heals to online after reconnect even if the change event never fires", async () =>
    {
        getState.mockResolvedValueOnce(OFFLINE); // 최초 조회: 오프라인
        getState.mockResolvedValue(ONLINE); // 이후 폴링: 온라인

        const { result } = renderHook(() => useNetworkStatus(), { wrapper });
        await advance();
        expect(result.current.isOnline).toBe(false);

        // change 이벤트는 일부러 발생시키지 않는다(listener 미호출). 오직 폴링으로만 회복.
        await advance(OFFLINE_RECHECK_MS);

        expect(result.current.isOnline).toBe(true);
    });

    it("does not poll while online (no interval cost when connected)", async () =>
    {
        getState.mockResolvedValue(ONLINE);

        renderHook(() => useNetworkStatus(), { wrapper });
        await advance();
        const callsAfterInit = getState.mock.calls.length;

        // online 이면 인터벌이 걸리지 않으므로 시간이 지나도 추가 조회가 없어야 한다.
        await advance(OFFLINE_RECHECK_MS * 5);

        expect(getState.mock.calls.length).toBe(callsAfterInit);
    });
});
