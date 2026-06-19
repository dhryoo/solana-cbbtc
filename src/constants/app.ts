// MWA가 지갑(Seed Vault) 승인 화면에 표시할 dApp 메타데이터 (이름·아이콘·URL).
//
// icon: 앱 아이콘(assets/favicon.png, 48x48)을 data URI 로 직접 임베드한다. MWA spec 은 icon 으로
//   data URI(base64 PNG/SVG/WebP/GIF) 또는 uri 상대경로를 허용하는데, 상대경로는 uri 도메인에
//   실제 favicon 이 호스팅돼 있어야 한다. 기존 placeholder 도메인엔 파일이 없어 지갑이 "?" 를
//   띄웠다 → 외부 호스팅 의존이 없는 data URI 로 전환해 어떤 환경에서도 항상 표시되게 한다.
//   (assets/favicon.png 변경 시: `node scripts/gen_app_icon.js` 로 이 상수를 재생성.)
// uri: 실제로 도달 가능한 캐노니컬 URL(GitHub Pages). 지갑이 출처로 표시할 수 있어 신뢰도에 기여.
const APP_ICON_DATA_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAACyklEQVR42u2YPUxTURTHfw9IqZaPRkAwlPKlRjEMFvxAEQatQwcSYTER4+iggwwuGlcGE8OiiTiaSByUhOhgTIwagx8xIGKtRCWQ0ghtwFAsCC2lDjcGHgWpbfW9Jvckd7gn977c37vnnP/JVTrtkQgpbGmkuEkACSABJIAEkAASQEvLSNqfyADrfjG27gKjGYw5EA5BcBam3eAbgi9PYHoseQBKMpq5YhscPg9mS2zrh59D73WY9+sghMoOgaM99sMDVDZC0zUw5moMkF0ERy+BEsdXzFZoaNM4B6qbId2g9s2Mw7sumHBCwCdyY0s5VJ+Aisbo28vfDpNfNQKw1Krnc1PQfQ6CgWVfOAReF3g/gT0dyuvVe0rrEgNIKIQ2mdXzCaf68CqLwOC9NUKpRMMQWpiBzKzleV6lCJmlxbXXe11w67iOhGzCqZ7nWsB+BXK2pYiQOXtghx0URR3T1oMw/h5GesHTB37PvwNIWMhqz4Dt1J/XBHzg6Qf3axh7KxJbV0psa4Wa1tj0IDgLnx9Df1dylFhJ1ruQ2Qp7T0L5EcjI3Hj9vB+eXhU3oguA32YwgfWAaOqKbdGldqUtLsDDi6LJ0w2A+uuQVwEl+6CiQajuWqW154IO2un1xGtqWIyBu2CpgWOXwbBCOwqrRPhNu/8zgKNd3UoE5+B2CyyF19/j6YPB+6JyqfLHEj9A3EK2un8xbIay+o33hYPRvsxsDZR49GW0r+4sZBWsv8eYC3uaov0/vBoA+Iaib8GUDy2dUHNaJK/BJHqj7CLY7YDmG5BVuKqczoD3o0ZVqLAKmjrUrcTf2qub8KFbo2bO64IXHaLaxGOuB4kdPilldOiRiOGGNhEqsdi8H/rviGZQN62EkiYEq7QOCnaKZDaYhD80B4FJ+D4C3wZg+BmEfursXSiyBO43YiBf5iSABJAAEkACSAAJkBr2C/su0wMz2Ml8AAAAAElFTkSuQmCC";

export const APP_IDENTITY = {
    name: "Solana cbBTC",
    uri: "https://dhryoo.github.io/solana-cbbtc/",
    icon: APP_ICON_DATA_URI,
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
