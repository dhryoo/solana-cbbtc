import type { PublicKey } from "@solana/web3.js";

export function shortenAddress(pubkey: PublicKey, head = 4, tail = 4): string
{
    const base58 = pubkey.toBase58();
    if (base58.length <= head + tail + 3)
    {
        return base58;
    }
    return `${base58.slice(0, head)}…${base58.slice(-tail)}`;
}

// 토큰 잔액을 사람이 읽기 좋은 문자열로. 뒤따르는 0은 제거하되 토큰 decimals를 상한으로.
// 예: 0.00012345 cbBTC, 1.5 SOL, 0
export function formatTokenAmount(uiAmount: number, decimals: number): string
{
    if (!Number.isFinite(uiAmount))
    {
        return "—";
    }
    if (uiAmount === 0)
    {
        return "0";
    }
    return uiAmount.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: Math.min(decimals, 8),
    });
}
