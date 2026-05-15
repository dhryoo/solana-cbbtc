// 모든 테스트 파일 실행 전 자동 적용되는 글로벌 setup.
// React Native 네이티브 모듈은 jest 환경에서 사용 불가하므로 mock으로 대체.

jest.mock(
    "@react-native-async-storage/async-storage",
    () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// expo-notifications: native module 의존이라 jest 환경에서는 mock 처리.
jest.mock("expo-notifications", () => ({
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
    getPermissionsAsync: jest.fn().mockResolvedValue({ status: "undetermined" }),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
    scheduleNotificationAsync: jest.fn().mockResolvedValue("notif-id"),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    AndroidImportance: { HIGH: 4 },
}));

// expo-clipboard mock — jest 환경에서 native binding 없음
jest.mock("expo-clipboard", () => ({
    setStringAsync: jest.fn().mockResolvedValue(true),
    getStringAsync: jest.fn().mockResolvedValue(""),
}));

// expo-haptics mock
jest.mock("expo-haptics", () => ({
    impactAsync: jest.fn().mockResolvedValue(undefined),
    notificationAsync: jest.fn().mockResolvedValue(undefined),
    selectionAsync: jest.fn().mockResolvedValue(undefined),
    ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
    NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

// expo-localization mock — 테스트는 기본으로 영어 locale을 반환
jest.mock("expo-localization", () => ({
    getLocales: jest.fn(() => [
        { languageCode: "en", languageTag: "en-US", regionCode: "US" },
    ]),
    useLocales: jest.fn(() => [
        { languageCode: "en", languageTag: "en-US", regionCode: "US" },
    ]),
    getCalendars: jest.fn(() => []),
    useCalendars: jest.fn(() => []),
}));

// expo-network mock — native bridge 없이도 useNetworkState 호출 가능하도록.
// 테스트는 기본적으로 online 상태로 동작 (isConnected/isInternetReachable=true)
jest.mock("expo-network", () => ({
    useNetworkState: jest.fn(() => ({
        type: "WIFI",
        isConnected: true,
        isInternetReachable: true,
    })),
    getNetworkStateAsync: jest.fn().mockResolvedValue({
        type: "WIFI",
        isConnected: true,
        isInternetReachable: true,
    }),
    addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
    NetworkStateType: { NONE: "NONE", UNKNOWN: "UNKNOWN", WIFI: "WIFI", CELLULAR: "CELLULAR" },
}));

// expo-local-authentication mock
jest.mock("expo-local-authentication", () => ({
    hasHardwareAsync: jest.fn().mockResolvedValue(true),
    isEnrolledAsync: jest.fn().mockResolvedValue(true),
    supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([1]),
    authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
    AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
}));
