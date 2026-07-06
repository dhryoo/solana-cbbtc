import type {
    AuthToken,
    AuthorizationResult,
} from "@solana-mobile/mobile-wallet-adapter-protocol";
import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { Buffer } from "buffer";

import { APP_IDENTITY } from "@/constants/app";
import { getMwaCluster } from "@/constants/cluster";

export interface ConnectedAccount
{
    publicKey: PublicKey;
    authToken: AuthToken;
    walletUriBase: string;
}

// MWA 는 reauthorize 시 auth_token 을 회전(교체)하고 이전 토큰을 무효화할 수 있다. 서명 흐름에서
// 회전이 일어나면 그 토큰을 provider 상태·저장소로 흘려보내야 다음 서명/앱 재시작 복원이 stale
// 토큰으로 실패하지 않는다. WalletProvider 가 아래 sink 를 등록한다(전역 싱글톤 = 지갑도 싱글톤).
let authTokenSink: ((token: AuthToken) => void) | null = null;

/** WalletProvider 가 등록: reauthorize 로 확인/회전된 auth_token 을 상태·저장소로 전달. */
export function setAuthTokenSink(sink: ((token: AuthToken) => void) | null): void
{
    authTokenSink = sink;
}

function toConnectedAccount(auth: AuthorizationResult): ConnectedAccount
{
    const first = auth.accounts[0];
    if (!first)
    {
        throw new Error("Wallet returned no accounts");
    }

    const rawBytes = Buffer.from(first.address, "base64");
    return {
        publicKey: new PublicKey(rawBytes),
        authToken: auth.auth_token,
        walletUriBase: auth.wallet_uri_base,
    };
}

export async function connect(): Promise<ConnectedAccount>
{
    return await transact(async (wallet) =>
    {
        const auth = await wallet.authorize({
            chain: getMwaCluster(),
            identity: APP_IDENTITY,
        });
        return toConnectedAccount(auth);
    });
}

export async function reconnect(authToken: AuthToken): Promise<ConnectedAccount>
{
    return await transact(async (wallet) =>
    {
        const auth = await wallet.reauthorize({
            auth_token: authToken,
            identity: APP_IDENTITY,
        });
        return toConnectedAccount(auth);
    });
}

export async function disconnect(authToken: AuthToken): Promise<void>
{
    await transact(async (wallet) =>
    {
        await wallet.deauthorize({ auth_token: authToken });
    });
}

export async function signAndSendTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[],
    authToken: AuthToken,
): Promise<string[]>
{
    return await transact(async (wallet) =>
    {
        const auth = await wallet.reauthorize({ auth_token: authToken, identity: APP_IDENTITY });
        authTokenSink?.(auth.auth_token);
        return wallet.signAndSendTransactions({ transactions });
    });
}

/**
 * 서명만 하고 broadcast 는 호출자가 직접 — Atomiq SDK 처럼 자체 RPC 로 전송·추적하는
 * 외부 SDK 에 Anchor Wallet 인터페이스를 제공하기 위해 필요 (Phase 3 Lightning).
 */
export async function signTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[],
    authToken: AuthToken,
): Promise<T[]>
{
    return await transact(async (wallet) =>
    {
        const auth = await wallet.reauthorize({ auth_token: authToken, identity: APP_IDENTITY });
        authTokenSink?.(auth.auth_token);
        return wallet.signTransactions({ transactions });
    });
}
