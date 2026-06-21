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

// Swap 시 가스(수수료)로 남겨둘 최소 SOL — priority fee + signature + 안전 margin.
//   - Jupiter swap 평균 priority fee(최대 0.001) + signature: ~0.0005~0.0015 SOL
// 이 값 미만이면 "swap이 가스 부족으로 실패할 가능성이 매우 높음"으로 간주.
// (입력 토큰이 SOL이면 amount + 이 reserve 합계로 검증)
// 주의: 출력 토큰 ATA 가 새로 생성되는 경우 rent(아래)가 추가로 들므로, 호출부에서 합산해야 한다.
export const MIN_SOL_GAS_RESERVE_SOL = 0.002;

// 출력 토큰 ATA 가 아직 없으면 swap 이 ATA 를 생성하며 rent-exempt 최소 잔액을 소비한다.
// SPL token account(165B): (165+128) * 3480 lamports/byte-year * 2y = 2,039,280 lamports ≈ 0.00204 SOL.
// 약간의 margin 을 더해 0.0021 로 둔다. cbBTC/SKR/USDC 를 처음 받을 때(매수 등) 발생.
export const OUTPUT_ATA_RENT_SOL = 0.0021;

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

// Swap(A 방식): cbBTC 를 한 축으로 고정하고, 반대쪽에 둘 수 있는 카운터 토큰들.
// cbBTC 는 여기 절대 포함하지 않는다 — 한 쪽은 항상 cbBTC 이고 다른 쪽이 이 중 하나.
export const SWAP_COUNTER_TOKENS: readonly TokenInfo[] = [SOL, SKR, USDC];

/**
 * cbBTC 를 고정한 채 방향(cbbtcIsOutput)에 따라 input/output 쌍을 만든다.
 * cbbtcIsOutput=true → counter→cbBTC(cbBTC 매수), false → cbBTC→counter(cbBTC 매도).
 * 항상 정확히 한 쪽만 cbBTC 임을 보장.
 */
export function deriveSwapPair(
    counter: TokenInfo,
    cbbtcIsOutput: boolean,
): { input: TokenInfo; output: TokenInfo }
{
    return cbbtcIsOutput
        ? { input: counter, output: CBBTC }
        : { input: CBBTC, output: counter };
}
