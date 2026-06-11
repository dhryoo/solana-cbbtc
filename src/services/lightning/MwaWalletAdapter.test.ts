import { PublicKey } from "@solana/web3.js";

jest.mock("@/services/WalletService", () => ({
    signTransactions: jest.fn(),
}));

import type { ConnectedAccount } from "@/services/WalletService";
import { signTransactions } from "@/services/WalletService";

import { createMwaSigningDelegate } from "./MwaWalletAdapter";

const mockedSign = signTransactions as jest.MockedFunction<typeof signTransactions>;

const OWNER = new PublicKey("9xQeWvG816bUx9EPSWvPjW8TQ6E7KqkbszxbjGAxAJat");
const account: ConnectedAccount = {
    publicKey: OWNER,
    authToken: "auth-token",
    walletUriBase: "",
};

beforeEach(() => jest.clearAllMocks());

describe("createMwaSigningDelegate", () =>
{
    it("exposes the account public key", () =>
    {
        const d = createMwaSigningDelegate(account);
        expect(d.publicKey.equals(OWNER)).toBe(true);
    });

    it("signTransaction delegates to WalletService with authToken and unwraps the result", async () =>
    {
        const fakeTx = { kind: "tx" };
        const signedTx = { kind: "signed" };
        mockedSign.mockResolvedValueOnce([signedTx] as never);

        const d = createMwaSigningDelegate(account);
        const out = await d.signTransaction(fakeTx);
        expect(out).toBe(signedTx);
        expect(mockedSign).toHaveBeenCalledWith([fakeTx], "auth-token");
    });

    it("signTransaction throws when wallet returns nothing", async () =>
    {
        mockedSign.mockResolvedValueOnce([] as never);
        const d = createMwaSigningDelegate(account);
        await expect(d.signTransaction({})).rejects.toThrow("no signed transaction");
    });

    it("signAllTransactions delegates the full batch", async () =>
    {
        const txs = [{ i: 1 }, { i: 2 }];
        const signed = [{ i: 1, s: true }, { i: 2, s: true }];
        mockedSign.mockResolvedValueOnce(signed as never);

        const d = createMwaSigningDelegate(account);
        const out = await d.signAllTransactions(txs);
        expect(out).toEqual(signed);
        expect(mockedSign).toHaveBeenCalledWith(txs, "auth-token");
    });
});
