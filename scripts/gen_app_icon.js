#!/usr/bin/env node
// assets/favicon.png 을 data URI 로 인코딩해 src/constants/app.ts 의 APP_ICON_DATA_URI 를 재생성.
// 지갑(MWA/Seed Vault) 승인 화면 아이콘은 이 data URI 로 표시된다 (외부 호스팅 의존 없음).
//
// 사용: node scripts/gen_app_icon.js
//
// favicon.png 를 교체했을 때만 다시 실행하면 된다. 48x48 PNG 권장 (작은 표시 영역).

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const iconPath = path.join(root, "assets/favicon.png");
const targetPath = path.join(root, "src/constants/app.ts");

const b64 = fs.readFileSync(iconPath).toString("base64");
const dataUri = `data:image/png;base64,${b64}`;

const src = fs.readFileSync(targetPath, "utf8");
const re = /const APP_ICON_DATA_URI = "data:image\/png;base64,[^"]*";/;
if (!re.test(src))
{
    console.error("APP_ICON_DATA_URI 상수를 찾지 못했습니다 — app.ts 구조 확인 필요.");
    process.exit(1);
}
const next = src.replace(re, `const APP_ICON_DATA_URI = "${dataUri}";`);
fs.writeFileSync(targetPath, next);
console.log(`APP_ICON_DATA_URI 재생성 완료 (data URI ${dataUri.length} chars from assets/favicon.png).`);
