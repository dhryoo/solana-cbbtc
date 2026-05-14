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
