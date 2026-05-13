import {
    Account as SplTokenAccount,
    TokenAccountNotFoundError,
    getAccount,
} from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";

import { getSolBalance, getTokenBalance } from "./TokenService";

jest.mock("@solana/spl-token", () =>
{
    const actual = jest.requireActual("@solana/spl-token");
    return {
        ...actual,
        getAccount: jest.fn(),
    };
});

const mockGetAccount = getAccount as jest.MockedFunction<typeof getAccount>;

const MINT = new PublicKey(new Uint8Array(32).fill(3));
const OWNER = new PublicKey(new Uint8Array(32).fill(4));

interface ConnectionMock
{
    getBalance: jest.Mock;
}

function makeConnectionMock(): { connection: Connection; mock: ConnectionMock }
{
    const mock: ConnectionMock = {
        getBalance: jest.fn(),
    };
    return { connection: mock as unknown as Connection, mock };
}

function makeSplAccount(amount: bigint): SplTokenAccount
{
    return {
        address: new PublicKey(new Uint8Array(32).fill(5)),
        mint: MINT,
        owner: OWNER,
        amount,
        delegate: null,
        delegatedAmount: 0n,
        isInitialized: true,
        isFrozen: false,
        isNative: false,
        rentExemptReserve: null,
        closeAuthority: null,
        tlvData: Buffer.from([]),
    } as unknown as SplTokenAccount;
}

describe("TokenService", () =>
{
    beforeEach(() =>
    {
        mockGetAccount.mockReset();
    });

    describe("getTokenBalance", () =>
    {
        it("returns the amount and uiAmount when the ATA exists", async () =>
        {
            mockGetAccount.mockResolvedValueOnce(makeSplAccount(12_345_678n));
            const { connection } = makeConnectionMock();

            const result = await getTokenBalance(connection, OWNER, MINT, 8);

            expect(result.amount).toBe(12_345_678n);
            expect(result.uiAmount).toBeCloseTo(0.12345678, 8);
            expect(result.decimals).toBe(8);
        });

        it("returns zero when the ATA does not exist (TokenAccountNotFoundError)", async () =>
        {
            mockGetAccount.mockRejectedValueOnce(new TokenAccountNotFoundError());
            const { connection } = makeConnectionMock();

            const result = await getTokenBalance(connection, OWNER, MINT, 8);

            expect(result.amount).toBe(0n);
            expect(result.uiAmount).toBe(0);
            expect(result.decimals).toBe(8);
        });

        it("propagates generic RPC errors (e.g. network failure)", async () =>
        {
            mockGetAccount.mockRejectedValueOnce(new Error("Network request failed"));
            const { connection } = makeConnectionMock();

            await expect(getTokenBalance(connection, OWNER, MINT, 8))
                .rejects.toThrow("Network request failed");
        });

        it("handles large amounts without precision loss in the bigint", async () =>
        {
            const big = 21_000_000_00000000n;
            mockGetAccount.mockResolvedValueOnce(makeSplAccount(big));
            const { connection } = makeConnectionMock();

            const result = await getTokenBalance(connection, OWNER, MINT, 8);

            expect(result.amount).toBe(big);
        });
    });

    describe("getSolBalance", () =>
    {
        it("converts lamports to SOL with 9 decimals", async () =>
        {
            const { connection, mock } = makeConnectionMock();
            mock.getBalance.mockResolvedValueOnce(1_500_000_000);

            const result = await getSolBalance(connection, OWNER);

            expect(result.amount).toBe(1_500_000_000n);
            expect(result.uiAmount).toBeCloseTo(1.5, 9);
            expect(result.decimals).toBe(9);
        });

        it("returns zero when wallet has no SOL", async () =>
        {
            const { connection, mock } = makeConnectionMock();
            mock.getBalance.mockResolvedValueOnce(0);

            const result = await getSolBalance(connection, OWNER);

            expect(result.amount).toBe(0n);
            expect(result.uiAmount).toBe(0);
        });

        it("propagates RPC errors", async () =>
        {
            const { connection, mock } = makeConnectionMock();
            mock.getBalance.mockRejectedValueOnce(new Error("429 Too Many Requests"));

            await expect(getSolBalance(connection, OWNER))
                .rejects.toThrow(/429/);
        });
    });
});
