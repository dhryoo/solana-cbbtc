import { render } from "@testing-library/react-native";
import React from "react";
import { Platform, StatusBar, StyleSheet } from "react-native";

import { useUpdateCheck } from "@/hooks/useUpdateCheck";
import { useNetworkStatus } from "@/providers/NetworkProvider";

import { UpdateBanner } from "./UpdateBanner";

jest.mock("@/hooks/useUpdateCheck");
jest.mock("@/providers/NetworkProvider");
// useThemedStyles 도 이 모듈의 useTheme 을 쓰므로, provider 트리 없이 팔레트만 주입한다.
jest.mock("@/providers/ThemeProvider", () => ({
    useTheme: () => ({
        mode: "dark",
        palette: jest.requireActual("@/constants/theme").DARK_PALETTE,
        setMode: jest.fn(),
    }),
}));
jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));
// 아이콘 폰트는 native asset 로더를 타서 jest 에서 resolve 되지 않는다.
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));
// 배너의 레이아웃만 검증한다 — 모달 내부는 이 테스트의 관심사가 아니다.
jest.mock("@/components/UpdateDetailModal", () => ({ UpdateDetailModal: () => null }));

const mockedUpdate = useUpdateCheck as jest.MockedFunction<typeof useUpdateCheck>;
const mockedNetwork = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;

// Android 상태바 높이. edge-to-edge 라 최상단 컴포넌트가 직접 흡수해야 한다.
const BAR = 42;

function setUpdate(shouldShow: boolean): void
{
    mockedUpdate.mockReturnValue({
        shouldShow,
        latest: shouldShow ? { tag: "v9.9.9", url: "https://example.com", notes: "" } : null,
    } as unknown as ReturnType<typeof useUpdateCheck>);
}

function setOnline(isOnline: boolean): void
{
    mockedNetwork.mockReturnValue({ isOnline } as unknown as ReturnType<typeof useNetworkStatus>);
}

// Pressable 의 style 은 함수형(({pressed}) => [...]) 이라 flatten 해서 확인.
function bannerPaddingTop(): number
{
    const { getByRole } = render(<UpdateBanner />);
    const style = getByRole("button").props.style as unknown;
    const flat = StyleSheet.flatten(
        typeof style === "function"
            ? (style as (s: { pressed: boolean }) => unknown)({ pressed: false })
            : style,
    ) as { paddingTop?: number };
    return flat.paddingTop ?? 0;
}

describe("UpdateBanner", () =>
{
    const originalHeight = StatusBar.currentHeight;
    const originalOs = Platform.OS;

    beforeEach(() =>
    {
        // 실기기(Android, edge-to-edge) 조건 재현. 둘 다 읽기 전용이라 정의로 덮어쓴다.
        Object.defineProperty(Platform, "OS", { value: "android", configurable: true });
        Object.defineProperty(StatusBar, "currentHeight", { value: BAR, configurable: true });
    });

    afterEach(() =>
    {
        Object.defineProperty(Platform, "OS", { value: originalOs, configurable: true });
        Object.defineProperty(StatusBar, "currentHeight", { value: originalHeight, configurable: true });
        jest.clearAllMocks();
    });

    it("renders nothing when there is no update", () =>
    {
        setUpdate(false);
        setOnline(true);
        const { queryByRole } = render(<UpdateBanner />);
        expect(queryByRole("button")).toBeNull();
    });

    it("clears the status bar so the banner does not overlap the system clock", () =>
    {
        setUpdate(true);
        setOnline(true);
        // 배너가 화면 최상단 → status bar 높이만큼 밀려 있어야 한다.
        expect(bannerPaddingTop()).toBeGreaterThanOrEqual(BAR);
    });

    it("does not double-pad when the offline banner already sits above it", () =>
    {
        setUpdate(true);
        setOnline(false);
        // OfflineBanner 가 이미 status bar 를 흡수했으므로 여기서 또 밀면 큰 빈 띠가 생긴다.
        expect(bannerPaddingTop()).toBeLessThan(BAR);
    });
});
