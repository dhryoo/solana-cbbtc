// MWA의 cluster 식별자 (Solana Mobile spec). 'solana:mainnet', 'solana:devnet' 등 형식.
// Solana Mobile RFC: https://docs.solanamobile.com/mobile-wallet-adapter/overview

export type ClusterId = "mainnet-beta" | "devnet" | "testnet";

export type MwaCluster = "solana:mainnet" | "solana:devnet" | "solana:testnet";

const PUBLIC_RPC_BY_CLUSTER: Readonly<Record<ClusterId, string>> = {
    "mainnet-beta": "https://api.mainnet-beta.solana.com",
    "devnet": "https://api.devnet.solana.com",
    "testnet": "https://api.testnet.solana.com",
};

const MWA_CLUSTER_BY_CLUSTER: Readonly<Record<ClusterId, MwaCluster>> = {
    "mainnet-beta": "solana:mainnet",
    "devnet": "solana:devnet",
    "testnet": "solana:testnet",
};

export function getClusterId(): ClusterId
{
    const raw = process.env.EXPO_PUBLIC_SOLANA_CLUSTER;
    if (raw === "devnet" || raw === "testnet" || raw === "mainnet-beta")
    {
        return raw;
    }
    return "mainnet-beta";
}

export function getRpcEndpoint(): string
{
    const override = process.env.EXPO_PUBLIC_SOLANA_RPC_URL;
    if (override && override.length > 0)
    {
        return override;
    }
    return PUBLIC_RPC_BY_CLUSTER[getClusterId()];
}

export function getMwaCluster(): MwaCluster
{
    return MWA_CLUSTER_BY_CLUSTER[getClusterId()];
}
