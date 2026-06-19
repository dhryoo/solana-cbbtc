// MWA가 지갑에 표시할 dApp 메타데이터.
// uri는 dApp의 캐노니컬 URL이 가장 정확하지만 MVP 단계라 placeholder 사용.

export const APP_IDENTITY = {
    name: "Solana cbBTC",
    uri: "https://seeker-btcfi.app",
    icon: "favicon.ico",
} as const;

// 버전 알림 (UpdateCheckService) 가 폴링할 GitHub repo. no-backend 정책 하에서 GitHub Releases
// API 가 사실상 버전 레지스트리. tag 가 latest 가 되는 시점 = dApp Store 승인 후 우리가 `gh release
// create v0.x.y` 누르는 순간. 그래야 사용자에게 "받을 수 있을 때" 만 배너가 뜸.
export const RELEASES_REPO_OWNER = "dhryoo";
export const RELEASES_REPO_NAME = "solana-cbbtc";

// "업데이트하러 가기" 버튼이 여는 URL. 현재는 GitHub Release 페이지(공개 release notes + 첨부 APK).
// 추후 dApp Store 공식 리스팅 URL 알게 되면 이 한 줄만 바꾸면 됨.
// 형식 예: `https://dappstore.solanamobile.com/dapps/com.seekerbtcfi.app`
export const DAPP_STORE_LISTING_URL: string | null = null;
