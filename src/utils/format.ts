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
