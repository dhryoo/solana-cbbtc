import { PublicKey } from "@solana/web3.js";

// 토큰 메타데이터.
// mint는 base58 string으로 저장, PublicKey는 lazy-instantiate.
// cbBTC mint는 on-chain 검증 완료 (getTokenSupply → decimals: 8).
// 출처: CoinGecko + Solana mainnet RPC (2026-05-13 시점).

export interface TokenInfo
{
    symbol: string;
    name: string;
    decimals: number;
    mint: string;            // base58. 'native'면 SOL.
    logoURI?: string;
    isNative: boolean;
}

export const CBBTC: TokenInfo = {
    symbol: "cbBTC",
    name: "Coinbase Wrapped BTC",
    decimals: 8,
    mint: "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij",
    isNative: false,
};

export const SOL: TokenInfo = {
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
    mint: "native",
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

// SKR — Solana Mobile 생태계 보상 토큰.
// 출처: https://docs.solanamobile.com/solana-mobile-stack/skr
// On-chain 검증 완료 (2026-05-14): decimals=6, live with 10.3B supply.
export const SKR: TokenInfo = {
    symbol: "SKR",
    name: "Solana Mobile",
    decimals: 6,
    mint: "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3",
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
