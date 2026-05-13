import { act, renderHook, waitFor } from "@testing-library/react-native";
import { PublicKey } from "@solana/web3.js";
import React from "react";

import { useWallet } from "@/hooks/useWallet";
import * as WalletService from "@/services/WalletService";
import * as authStorage from "@/utils/authStorage";

import { WalletProvider } from "./WalletProvider";

jest.mock("@/services/WalletService");
jest.mock("@/utils/authStorage");

const mockedWalletService = WalletService as jest.Mocked<typeof WalletService>;
const mockedAuthStorage = authStorage as jest.Mocked<typeof authStorage>;

const FAKE_PUBKEY = new PublicKey(new Uint8Array(32).fill(2));

function makeAccount(authToken = "auth-1"): WalletService.ConnectedAccount
{
    return {
        publicKey: FAKE_PUBKEY,
        authToken,
        walletUriBase: "",
    };
}

function wrapper({ children }: { children: React.ReactNode }): React.JSX.Element
{
    return <WalletProvider>{children}</WalletProvider>;
}

describe("WalletProvider", () =>
{
    beforeEach(() =>
    {
        jest.clearAllMocks();
        mockedAuthStorage.saveAuthToken.mockResolvedValue(undefined);
        mockedAuthStorage.clearAuthToken.mockResolvedValue(undefined);
    });

    describe("initial restore", () =>
    {
        it("transitions restoring → idle when no token is stored", async () =>
        {
            mockedAuthStorage.loadAuthToken.mockResolvedValue(null);

            const { result } = renderHook(() => useWallet(), { wrapper });

            await waitFor(() =>
            {
                expect(result.current.status).toBe("idle");
            });
            expect(result.current.account).toBeNull();
            expect(mockedWalletService.reconnect).not.toHaveBeenCalled();
        });

        it("transitions restoring → connected when reauthorize succeeds", async () =>
        {
            mockedAuthStorage.loadAuthToken.mockResolvedValue("stored-token");
            mockedWalletService.reconnect.mockResolvedValue(makeAccount("stored-token"));

            const { result } = renderHook(() => useWallet(), { wrapper });

            await waitFor(() =>
            {
                expect(result.current.status).toBe("connected");
            });
            expect(result.current.account?.authToken).toBe("stored-token");
            expect(mockedAuthStorage.saveAuthToken).not.toHaveBeenCalled();
        });

        it("persists rotated token when reauthorize returns a new one", async () =>
        {
            mockedAuthStorage.loadAuthToken.mockResolvedValue("old-token");
            mockedWalletService.reconnect.mockResolvedValue(makeAccount("rotated-token"));

            const { result } = renderHook(() => useWallet(), { wrapper });

            await waitFor(() =>
            {
                expect(result.current.status).toBe("connected");
            });
            expect(mockedAuthStorage.saveAuthToken).toHaveBeenCalledWith("rotated-token");
        });

        it("clears stored token and stays idle when reauthorize fails", async () =>
        {
            mockedAuthStorage.loadAuthToken.mockResolvedValue("stale-token");
            mockedWalletService.reconnect.mockRejectedValue(new Error("expired"));

            const { result } = renderHook(() => useWallet(), { wrapper });

            await waitFor(() =>
            {
                expect(result.current.status).toBe("idle");
            });
            expect(mockedAuthStorage.clearAuthToken).toHaveBeenCalled();
            expect(result.current.account).toBeNull();
        });
    });

    describe("connect", () =>
    {
        it("idle → connecting → connected on success and persists token", async () =>
        {
            mockedAuthStorage.loadAuthToken.mockResolvedValue(null);
            mockedWalletService.connect.mockResolvedValue(makeAccount("new-token"));

            const { result } = renderHook(() => useWallet(), { wrapper });

            await waitFor(() =>
            {
                expect(result.current.status).toBe("idle");
            });

            await act(async () =>
            {
                await result.current.connect();
            });

            expect(result.current.status).toBe("connected");
            expect(result.current.account?.authToken).toBe("new-token");
            expect(mockedAuthStorage.saveAuthToken).toHaveBeenCalledWith("new-token");
        });

        it("idle → connecting → error when WalletService.connect throws", async () =>
        {
            mockedAuthStorage.loadAuthToken.mockResolvedValue(null);
            mockedWalletService.connect.mockRejectedValue(new Error("user denied"));

            const { result } = renderHook(() => useWallet(), { wrapper });
            await waitFor(() => expect(result.current.status).toBe("idle"));

            await act(async () =>
            {
                await result.current.connect();
            });

            expect(result.current.status).toBe("error");
            expect(result.current.error?.message).toBe("user denied");
            expect(result.current.account).toBeNull();
        });
    });

    describe("disconnect", () =>
    {
        it("connected → idle and clears storage", async () =>
        {
            mockedAuthStorage.loadAuthToken.mockResolvedValue("token-1");
            mockedWalletService.reconnect.mockResolvedValue(makeAccount("token-1"));
            mockedWalletService.disconnect.mockResolvedValue(undefined);

            const { result } = renderHook(() => useWallet(), { wrapper });
            await waitFor(() => expect(result.current.status).toBe("connected"));

            await act(async () =>
            {
                await result.current.disconnect();
            });

            expect(result.current.status).toBe("idle");
            expect(result.current.account).toBeNull();
            expect(mockedAuthStorage.clearAuthToken).toHaveBeenCalled();
        });

        it("still clears local state even if MWA disconnect throws", async () =>
        {
            mockedAuthStorage.loadAuthToken.mockResolvedValue("token-1");
            mockedWalletService.reconnect.mockResolvedValue(makeAccount("token-1"));
            mockedWalletService.disconnect.mockRejectedValue(new Error("network"));

            const { result } = renderHook(() => useWallet(), { wrapper });
            await waitFor(() => expect(result.current.status).toBe("connected"));

            await act(async () =>
            {
                await result.current.disconnect();
            });

            expect(result.current.status).toBe("idle");
            expect(result.current.account).toBeNull();
            expect(mockedAuthStorage.clearAuthToken).toHaveBeenCalled();
        });
    });

    describe("useWallet outside provider", () =>
    {
        it("throws a helpful error", () =>
        {
            const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
            try
            {
                expect(() =>
                {
                    renderHook(() => useWallet());
                }).toThrow(/within WalletProvider/);
            }
            finally
            {
                consoleError.mockRestore();
            }
        });
    });
});
