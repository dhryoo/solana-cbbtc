// MWA가 지갑(Seed Vault) 승인 화면에 표시할 dApp 메타데이터 (이름·아이콘·URL).
//
// icon 은 반드시 uri 기준 **상대 경로** 여야 한다. (MWA spec 은 data URI 도 허용하지만 Seeker
//   Seed Vault 는 거부하고 -32602 "identity.icon must be a relative URL" 을 던진다 — 실측 확인.)
//   지갑은 new URL(icon, uri) 로 합쳐 가져오므로:
//   - uri 끝의 슬래시가 중요: ".../solana-cbbtc/" + "favicon.png" → ".../solana-cbbtc/favicon.png".
//     (슬래시 없으면 마지막 경로 조각이 떨어져 ".../favicon.png" 로 잘못 해석됨)
//   - 그 위치에 실제 파일을 호스팅해야 함 → docs/favicon.png (GitHub Pages, main /docs).
//     아이콘 교체 시 docs/favicon.png 를 갱신하고 push 하면 Pages 가 재배포한다.
export const APP_IDENTITY = {
    name: "Solana cbBTC",
    uri: "https://dhryoo.github.io/solana-cbbtc/",
    icon: "favicon.png",
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
