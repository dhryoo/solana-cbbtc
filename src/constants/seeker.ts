// Seeker Identity 관련 상수.
// 출처: https://docs.solanamobile.com/solana-mobile-stack/seeker-genesis-token
// 검증 방법: https://docs.solanamobile.com/recipes/general/detecting-seeker-users

import { PublicKey } from "@solana/web3.js";

// Seeker Genesis Token은 단일 mint가 아님 — 각 디바이스마다 별도 mint가 발행되고
// 공통 mint authority로 서명됨. 따라서 SGT 보유 여부는 "사용자의 Token-2022 잔액 중
// mint authority가 이 주소인 게 있는가"로 검증.
export const SGT_MINT_AUTHORITY = new PublicKey(
    "GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4",
);

// React Native Platform.constants.Model의 Seeker 식별자 (안드로이드).
// spoof 가능한 소프트 신호 — UX 힌트로만 사용, 보안 결정에 의존 금지.
export const SEEKER_DEVICE_MODEL = "Seeker";
