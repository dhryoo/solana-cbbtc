import type { Transaction, VersionedTransaction } from "@solana/web3.js";

import type { ConnectedAccount } from "@/services/WalletService";
import { signTransactions } from "@/services/WalletService";

import type { SolanaSigningDelegate } from "./types";

// Adapter 패턴: Atomiq SDK 가 기대하는 Anchor Wallet 모양(signTransaction/signAllTransactions/publicKey)을
// MWA(Seed Vault) 서명으로 구현한다. SDK 는 서명된 트랜잭션을 받아 자체 RPC 로 broadcast 한다.
//
// 주의: MWA 는 호출마다 지갑 앱으로 전환(인텐트)되므로, 한 흐름에서 서명 횟수를 최소화할 것.

export function createMwaSigningDelegate(account: ConnectedAccount): SolanaSigningDelegate
{
    return {
        publicKey: account.publicKey,
        async signTransaction<T>(tx: T): Promise<T>
        {
            const signed = await signTransactions(
                [tx as Transaction | VersionedTransaction],
                account.authToken,
            );
            const first = signed[0];
            if (!first)
            {
                throw new Error("Wallet returned no signed transaction");
            }
            return first as T;
        },
        async signAllTransactions<T>(txs: T[]): Promise<T[]>
        {
            const signed = await signTransactions(
                txs as (Transaction | VersionedTransaction)[],
                account.authToken,
            );
            return signed as T[];
        },
    };
}
