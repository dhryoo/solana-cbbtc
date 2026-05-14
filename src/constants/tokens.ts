import { PublicKey } from "@solana/web3.js";
import type { ImageSourcePropType } from "react-native";

// 토큰 메타데이터.
// mint는 base58 string으로 저장, PublicKey는 lazy-instantiate.
// cbBTC mint는 on-chain 검증 완료 (getTokenSupply → decimals: 8).
// 출처: CoinGecko + Solana mainnet RPC (2026-05-13 시점).
// 로고는 scripts/fetch_token_icons.py로 한 번 다운로드 후 assets/tokens/에 보관.

export interface TokenInfo
{
    symbol: string;
    name: string;
    decimals: number;
    mint: string;            // base58. 'native'면 SOL.
    logoURI?: string;
    logoSource?: ImageSourcePropType;
    isNative: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO_CBBTC = require("../../assets/tokens/cbbtc.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO_SOL = require("../../assets/tokens/sol.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO_SKR = require("../../assets/tokens/skr.png");

export const CBBTC: TokenInfo = {
    symbol: "cbBTC",
    name: "Coinbase Wrapped BTC",
    decimals: 8,
    mint: "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij",
    logoSource: LOGO_CBBTC,
    isNative: false,
};

export const SOL: TokenInfo = {
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
    mint: "native",
    logoSource: LOGO_SOL,
    isNative: true,
};

// wrapped SOL (필요 시 swap 라우팅용)
export const WSOL: TokenInfo = {
    symbol: "SOL",
    name: "Wrapped SOL",
    decimals: 9,
    mint: "So11111111111111111111111111111111111111112",
    isNative: false,
};

export const USDC: TokenInfo = {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    isNative: false,
};

// Swap 시 사용자가 가스비로 남겨두어야 할 최소 SOL.
// 측정 근거:
//   - Jupiter swap 평균 priority fee + signature: ~0.0005~0.001 SOL
//   - ATA 미존재 시 rent 발생: ~0.00204 SOL
//   - 합산 + 안전 margin = 0.002 SOL
// 이 값 미만이면 "swap이 가스 부족으로 실패할 가능성이 매우 높음"으로 간주.
// (사용자 입력 토큰이 SOL일 경우, amount + 이 reserve 합계로 검증)
export const MIN_SOL_GAS_RESERVE_SOL = 0.002;

// SKR — Solana Mobile 생태계 보상 토큰.
// 출처: https://docs.solanamobile.com/solana-mobile-stack/skr
// On-chain 검증 완료 (2026-05-14): decimals=6, live with 10.3B supply.
export const SKR: TokenInfo = {
    symbol: "SKR",
    name: "Solana Mobile",
    decimals: 6,
    mint: "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3",
    logoSource: LOGO_SKR,
    isNative: false,
};

export function mintPublicKey(token: TokenInfo): PublicKey
{
    if (token.isNative)
    {
        throw new Error(`${token.symbol} is native — has no mint pubkey`);
    }
    return new PublicKey(token.mint);
}
