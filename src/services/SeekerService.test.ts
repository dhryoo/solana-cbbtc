import { Connection, PublicKey } from "@solana/web3.js";

import { SGT_MINT_AUTHORITY } from "@/constants/seeker";

import { hasGenesisToken } from "./SeekerService";

interface ConnectionMock
{
    getParsedTokenAccountsByOwner: jest.Mock;
    getParsedAccountInfo: jest.Mock;
}

function makeConnectionMock(): { connection: Connection; mock: ConnectionMock }
{
    const mock: ConnectionMock = {
        getParsedTokenAccountsByOwner: jest.fn(),
        getParsedAccountInfo: jest.fn(),
    };
    return { connection: mock as unknown as Connection, mock };
}

const OWNER = new PublicKey(new Uint8Array(32).fill(7));
const MINT_A = new PublicKey(new Uint8Array(32).fill(11));
const MINT_B = new PublicKey(new Uint8Array(32).fill(13));

function tokenAccount(mint: PublicKey, uiAmount: number): unknown
{
    return {
        pubkey: new PublicKey(new Uint8Array(32).fill(5)),
        account: {
            data: {
                parsed: {
                    info: {
                        mint: mint.toBase58(),
                        tokenAmount: { uiAmount },
                    },
                },
            },
        },
    };
}

function mintInfo(authority: string | null): { value: unknown }
{
    return {
        value: {
            data: {
                parsed: {
                    info: {
                        mintAuthority: authority,
                    },
                },
            },
        },
    };
}

describe("SeekerService.hasGenesisToken", () =>
{
    it("returns false when wallet has no Token-2022 holdings", async () =>
    {
        const { connection, mock } = makeConnectionMock();
        mock.getParsedTokenAccountsByOwner.mockResolvedValueOnce({ value: [] });

        const result = await hasGenesisToken(connection, OWNER);

        expect(result).toBe(false);
        expect(mock.getParsedAccountInfo).not.toHaveBeenCalled();
    });

    it("returns true when one Token-2022 mint's authority matches SGT_MINT_AUTHORITY", async () =>
    {
        const { connection, mock } = makeConnectionMock();
        mock.getParsedTokenAccountsByOwner.mockResolvedValueOnce({
            value: [tokenAccount(MINT_A, 1)],
        });
        mock.getParsedAccountInfo.mockResolvedValueOnce(
            mintInfo(SGT_MINT_AUTHORITY.toBase58()),
        );

        const result = await hasGenesisToken(connection, OWNER);

        expect(result).toBe(true);
    });

    it("returns false when no mint authority matches", async () =>
    {
        const { connection, mock } = makeConnectionMock();
        mock.getParsedTokenAccountsByOwner.mockResolvedValueOnce({
            value: [tokenAccount(MINT_A, 1), tokenAccount(MINT_B, 1)],
        });
        mock.getParsedAccountInfo
            .mockResolvedValueOnce(mintInfo("OtherAuthority1111111111111111111111111111"))
            .mockResolvedValueOnce(mintInfo("OtherAuthority2222222222222222222222222222"));

        const result = await hasGenesisToken(connection, OWNER);

        expect(result).toBe(false);
    });

    it("skips accounts with zero balance", async () =>
    {
        const { connection, mock } = makeConnectionMock();
        mock.getParsedTokenAccountsByOwner.mockResolvedValueOnce({
            value: [tokenAccount(MINT_A, 0), tokenAccount(MINT_B, 1)],
        });
        mock.getParsedAccountInfo.mockResolvedValueOnce(
            mintInfo(SGT_MINT_AUTHORITY.toBase58()),
        );

        const result = await hasGenesisToken(connection, OWNER);

        expect(result).toBe(true);
        // 잔액 0 mint는 조회하지 않으므로 호출 1회만
        expect(mock.getParsedAccountInfo).toHaveBeenCalledTimes(1);
    });

    it("propagates RPC errors from the initial token account query", async () =>
    {
        const { connection, mock } = makeConnectionMock();
        mock.getParsedTokenAccountsByOwner.mockRejectedValueOnce(new Error("rpc 429"));

        await expect(hasGenesisToken(connection, OWNER)).rejects.toThrow("rpc 429");
    });
});
