import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { PublicKey, VersionedTransaction, TransactionMessage } from "@solana/web3.js";
import React from "react";

import { CBBTC, SOL } from "@/constants/tokens";
import { useWallet } from "@/hooks/useWallet";
import { useNotifications } from "@/providers/NotificationProvider";
import * as JupiterService from "@/services/JupiterService";
import * as WalletService from "@/services/WalletService";
import type { QuoteResponse } from "@/types/jupiter";

import { useSwap } from "./useSwap";

jest.mock("@/hooks/useWallet");
jest.mock("@/providers/NotificationProvider");
jest.mock("@/services/JupiterService");
jest.mock("@/services/WalletService");
jest.mock("react-i18next", () =>
    ({
        useTranslation: () =>
            ({
                t: (key: string, params?: Record<string, unknown>) =>
                {
                    if (params) return `${key}|${JSON.stringify(params)}`;
                    return key;
                },
            }),
    }));

const mockedWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockedNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;
const mockedJupiter = JupiterService as jest.Mocked<typeof JupiterService>;
const mockedWalletService = WalletService as jest.Mocked<typeof WalletService>;

const FAKE_PUBKEY = new PublicKey(new Uint8Array(32).fill(3));

function fakeQuote(): QuoteResponse
{
    return {
        inputMint: SOL.mint === "native" ? "So11111111111111111111111111111111111111112" : SOL.mint,
        outputMint: CBBTC.mint,
        inAmount: "10000000",
        outAmount: "1175",
        otherAmountThreshold: "1170",
        swapMode: "ExactIn",
        slippageBps: 50,
        priceImpactPct: "0",
        routePlan: [],
    };
}

function fakeTx(): VersionedTransaction
{
    const msg = new TransactionMessage({
        payerKey: FAKE_PUBKEY,
        recentBlockhash: "11111111111111111111111111111111",
        instructions: [],
    }).compileToV0Message();
    return new VersionedTransaction(msg);
}

function wrapper({ children }: { children: React.ReactNode }): React.JSX.Element
{
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useSwap", () =>
{
    let notifySwapSuccess: jest.Mock;

    beforeEach(() =>
    {
        jest.clearAllMocks();
        notifySwapSuccess = jest.fn().mockResolvedValue(undefined);

        mockedWallet.mockReturnValue({
            status: "connected",
            account: {
                publicKey: FAKE_PUBKEY,
                authToken: "auth-1",
                walletUriBase: "",
            },
            error: null,
            connect: jest.fn(),
            disconnect: jest.fn(),
        });

        mockedNotifications.mockReturnValue({
            enabled: false,
            permissionStatus: "undetermined",
            setEnabled: jest.fn(),
            notifySwapSuccess,
        });

        mockedJupiter.getSwapTransaction.mockResolvedValue({
            transaction: fakeTx(),
            lastValidBlockHeight: 1,
        });
        mockedWalletService.signAndSendTransactions.mockResolvedValue(["sig-1"]);
    });

    it("succeeds and returns the signature", async () =>
    {
        const { result } = renderHook(() => useSwap(), { wrapper });

        let returned: { signature: string } | undefined;
        await act(async () =>
        {
            returned = await result.current.mutateAsync({
                quote: fakeQuote(),
                inputToken: SOL,
                outputToken: CBBTC,
            });
        });

        expect(returned?.signature).toBe("sig-1");
        expect(mockedJupiter.getSwapTransaction).toHaveBeenCalledTimes(1);
        expect(mockedWalletService.signAndSendTransactions).toHaveBeenCalledTimes(1);

        await waitFor(() =>
        {
            expect(notifySwapSuccess).toHaveBeenCalledTimes(1);
        });
    });

    it("rejects when wallet is not connected", async () =>
    {
        mockedWallet.mockReturnValue({
            status: "idle",
            account: null,
            error: null,
            connect: jest.fn(),
            disconnect: jest.fn(),
        });

        const { result } = renderHook(() => useSwap(), { wrapper });

        await expect(
            act(async () =>
            {
                await result.current.mutateAsync({
                    quote: fakeQuote(),
                    inputToken: SOL,
                    outputToken: CBBTC,
                });
            }),
        ).rejects.toThrow(/wallet is not connected/i);
        expect(mockedJupiter.getSwapTransaction).not.toHaveBeenCalled();
    });

    it("rejects when sign returns no signatures", async () =>
    {
        mockedWalletService.signAndSendTransactions.mockResolvedValue([]);

        const { result } = renderHook(() => useSwap(), { wrapper });

        await expect(
            act(async () =>
            {
                await result.current.mutateAsync({
                    quote: fakeQuote(),
                    inputToken: SOL,
                    outputToken: CBBTC,
                });
            }),
        ).rejects.toThrow(/no transaction signature/i);
    });

    it("propagates Jupiter API errors", async () =>
    {
        mockedJupiter.getSwapTransaction.mockRejectedValue(new Error("Jupiter 429"));

        const { result } = renderHook(() => useSwap(), { wrapper });

        await expect(
            act(async () =>
            {
                await result.current.mutateAsync({
                    quote: fakeQuote(),
                    inputToken: SOL,
                    outputToken: CBBTC,
                });
            }),
        ).rejects.toThrow(/jupiter 429/i);
        expect(notifySwapSuccess).not.toHaveBeenCalled();
    });

    it("invalidates balance + quote caches on success", async () =>
    {
        // Spy on QueryClient.invalidateQueries via a wrapper that we instrument.
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        });
        const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
        const localWrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element =>
            (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            );

        const { result } = renderHook(() => useSwap(), { wrapper: localWrapper });

        await act(async () =>
        {
            await result.current.mutateAsync({
                quote: fakeQuote(),
                inputToken: SOL,
                outputToken: CBBTC,
            });
        });

        await waitFor(() =>
        {
            expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["balance"] });
        });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["quote"] });
    });
});
