import {
    TokenAccountNotFoundError,
    getAccount,
    getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";

export interface TokenBalance
{
    amount: bigint;
    uiAmount: number;
    decimals: number;
}

const LAMPORTS_PER_SOL = 1_000_000_000;
const SOL_DECIMALS = 9;

function toUiAmount(amount: bigint, decimals: number): number
{
    // 8~9 decimal 토큰을 다루므로 Number 변환은 Number.MAX_SAFE_INTEGER (2^53-1) 안전.
    // 표시 목적의 근사치라 정밀 연산은 amount(bigint)를 사용할 것.
    return Number(amount) / 10 ** decimals;
}

export async function getTokenBalance(
    connection: Connection,
    owner: PublicKey,
    mint: PublicKey,
    decimals: number,
): Promise<TokenBalance>
{
    const ata = getAssociatedTokenAddressSync(mint, owner, true);
    try
    {
        const account = await getAccount(connection, ata, "confirmed");
        return {
            amount: account.amount,
            uiAmount: toUiAmount(account.amount, decimals),
            decimals,
        };
    }
    catch (err)
    {
        // ATA 미존재는 잔액 0과 동일. 그 외 에러는 호출자에게 위임.
        if (err instanceof TokenAccountNotFoundError)
        {
            return { amount: 0n, uiAmount: 0, decimals };
        }
        throw err;
    }
}

export async function getSolBalance(
    connection: Connection,
    owner: PublicKey,
): Promise<TokenBalance>
{
    const lamports = await connection.getBalance(owner);
    return {
        amount: BigInt(lamports),
        uiAmount: lamports / LAMPORTS_PER_SOL,
        decimals: SOL_DECIMALS,
    };
}
