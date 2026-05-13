// 모든 테스트 파일 실행 전 자동 적용되는 글로벌 setup.
// React Native 네이티브 모듈은 jest 환경에서 사용 불가하므로 mock으로 대체.

jest.mock(
    "@react-native-async-storage/async-storage",
    () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
