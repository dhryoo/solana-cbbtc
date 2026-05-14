// MWA의 cluster 식별자 (Solana Mobile spec). 'solana:mainnet', 'solana:devnet' 등 형식.
// Solana Mobile RFC: https://docs.solanamobile.com/mobile-wallet-adapter/overview

export type ClusterId = "mainnet-beta" | "devnet" | "testnet";

export type MwaCluster = "solana:mainnet" | "solana:devnet" | "solana:testnet";

const PUBLIC_RPC_BY_CLUSTER: Readonly<Record<ClusterId, string>> = {
    "mainnet-beta": "https://api.mainnet-beta.solana.com",
    "devnet": "https://api.devnet.solana.com",
    "testnet": "https://api.testnet.solana.com",
};

// 폴백용 보조 RPC endpoint들. 기본 endpoint가 429/5xx 등으로 실패 시 순차 시도.
// 무료 공개 RPC만 포함 — 사용자가 자체 키를 .env로 설정한 경우 그것이 1순위.
const FALLBACK_RPC_BY_CLUSTER: Readonly<Record<ClusterId, string[]>> = {
    "mainnet-beta": [
        "https://solana-rpc.publicnode.com",
        "https://solana.drpc.org",
    ],
    "devnet": [],
    "testnet": [],
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

// 폴백 후보 — 첫 번째: 주 endpoint, 이후 공개 폴백. 중복 자동 제거.
export function getRpcEndpoints(): string[]
{
    const cluster = getClusterId();
    const primary = getRpcEndpoint();
    const fallbacks = FALLBACK_RPC_BY_CLUSTER[cluster];
    const all = [primary, ...fallbacks];
    return Array.from(new Set(all));
}

export function getMwaCluster(): MwaCluster
{
    return MWA_CLUSTER_BY_CLUSTER[getClusterId()];
}
