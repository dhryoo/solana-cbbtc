import { PublicKey } from "@solana/web3.js";
import type { AuthorizationResult } from "@solana-mobile/mobile-wallet-adapter-protocol";
import type { Web3MobileWallet } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";

import {
    connect,
    disconnect,
    reconnect,
    signAndSendTransactions,
} from "./WalletService";

jest.mock("@solana-mobile/mobile-wallet-adapter-protocol-web3js", () =>
    ({
        transact: jest.fn(),
    }));

const mockTransact = transact as jest.MockedFunction<typeof transact>;

// 32-byte 더미 키 (모두 1로 채움) → base64
const DUMMY_PUBKEY_BYTES = new Uint8Array(32).fill(1);
const DUMMY_PUBKEY_BASE64 = Buffer.from(DUMMY_PUBKEY_BYTES).toString("base64");
const EXPECTED_PUBKEY = new PublicKey(DUMMY_PUBKEY_BYTES);

function buildAuthResult(overrides: Partial<AuthorizationResult> = {}): AuthorizationResult
{
    return {
        accounts: [{ address: DUMMY_PUBKEY_BASE64 }],
        auth_token: "token-xyz",
        wallet_uri_base: "",
        ...overrides,
    } as AuthorizationResult;
}

interface WalletMockMethods
{
    authorize: jest.Mock;
    reauthorize: jest.Mock;
    deauthorize: jest.Mock;
    signAndSendTransactions: jest.Mock;
}

function setupWalletMock(methods: Partial<WalletMockMethods> = {}): WalletMockMethods
{
    const wallet: WalletMockMethods = {
        authorize: methods.authorize ?? jest.fn().mockResolvedValue(buildAuthResult()),
        reauthorize: methods.reauthorize ?? jest.fn().mockResolvedValue(buildAuthResult()),
        deauthorize: methods.deauthorize ?? jest.fn().mockResolvedValue({}),
        signAndSendTransactions:
            methods.signAndSendTransactions
            ?? jest.fn().mockResolvedValue(["sig-1", "sig-2"]),
    };

    mockTransact.mockImplementation(async (callback) =>
    {
        return callback(wallet as unknown as Web3MobileWallet);
    });

    return wallet;
}

describe("WalletService", () =>
{
    beforeEach(() =>
    {
        mockTransact.mockReset();
    });

    describe("connect", () =>
    {
        it("returns publicKey, authToken, walletUriBase from authorize result", async () =>
        {
            setupWalletMock();

            const result = await connect();

            expect(result.publicKey.equals(EXPECTED_PUBKEY)).toBe(true);
            expect(result.authToken).toBe("token-xyz");
            expect(result.walletUriBase).toBe("");
        });

        it("passes the configured chain and identity to authorize", async () =>
        {
            const wallet = setupWalletMock();

            await connect();

            expect(wallet.authorize).toHaveBeenCalledTimes(1);
            const args = wallet.authorize.mock.calls[0]?.[0];
            expect(args).toMatchObject({
                chain: expect.stringMatching(/^solana:/),
                identity: expect.objectContaining({ name: expect.any(String) }),
            });
        });

        it("throws when the wallet returns no accounts", async () =>
        {
            setupWalletMock({
                authorize: jest.fn().mockResolvedValue(buildAuthResult({ accounts: [] })),
            });

            await expect(connect()).rejects.toThrow(/no accounts/i);
        });

        it("propagates transact errors", async () =>
        {
            mockTransact.mockRejectedValueOnce(new Error("user denied"));

            await expect(connect()).rejects.toThrow("user denied");
        });
    });

    describe("reconnect", () =>
    {
        it("calls reauthorize with the stored authToken", async () =>
        {
            const wallet = setupWalletMock();

            const result = await reconnect("stored-token");

            expect(wallet.reauthorize).toHaveBeenCalledTimes(1);
            const args = wallet.reauthorize.mock.calls[0]?.[0];
            expect(args).toMatchObject({
                auth_token: "stored-token",
                identity: expect.objectContaining({ name: expect.any(String) }),
            });
            expect(result.publicKey.equals(EXPECTED_PUBKEY)).toBe(true);
        });
    });

    describe("disconnect", () =>
    {
        it("calls deauthorize with the authToken and resolves", async () =>
        {
            const wallet = setupWalletMock();

            await disconnect("token-xyz");

            expect(wallet.deauthorize).toHaveBeenCalledWith({ auth_token: "token-xyz" });
        });

        it("propagates errors from deauthorize", async () =>
        {
            setupWalletMock({
                deauthorize: jest.fn().mockRejectedValue(new Error("invalid token")),
            });

            await expect(disconnect("bad")).rejects.toThrow("invalid token");
        });
    });

    describe("signAndSendTransactions", () =>
    {
        it("reauthorizes then signs and returns signatures", async () =>
        {
            const wallet = setupWalletMock();
            const fakeTx = {} as never;

            const sigs = await signAndSendTransactions([fakeTx, fakeTx], "auth");

            expect(wallet.reauthorize).toHaveBeenCalledTimes(1);
            expect(wallet.signAndSendTransactions).toHaveBeenCalledTimes(1);
            const callArg = wallet.signAndSendTransactions.mock.calls[0]?.[0];
            expect(callArg).toMatchObject({ transactions: [fakeTx, fakeTx] });
            expect(sigs).toEqual(["sig-1", "sig-2"]);
        });
    });
});
