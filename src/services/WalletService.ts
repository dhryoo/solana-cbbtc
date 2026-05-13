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
        await wallet.reauthorize({ auth_token: authToken, identity: APP_IDENTITY });
        return wallet.signAndSendTransactions({ transactions });
    });
}
