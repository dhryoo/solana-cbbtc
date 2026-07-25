import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { PublicKey } from "@solana/web3.js";
import React from "react";

import { SOL, USDC } from "@/constants/tokens";
import { useWallet } from "@/hooks/useWallet";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import { getLightningService } from "@/services/lightning/LightningService";
import type { LightningQuote, LightningReceive } from "@/services/lightning/types";

import {
    useCreateReceive,
    useLightningPay,
    useLightningQuote,
    useRefundAll,
    useRefundableSwaps,
    useWaitAndClaim,
} from "./useLightning";

jest.mock("@/hooks/useWallet");
jest.mock("@/providers/NetworkProvider");
jest.mock("@/services/lightning/LightningService");

const mockedWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockedNetwork = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;
const mockedGetLightningService = getLightningService as jest.MockedFunction<typeof getLightningService>;

const FAKE_PUBKEY = new PublicKey(new Uint8Array(32).fill(4));

const svc = {
    getQuote: jest.fn(),
    pay: jest.fn(),
    refundAll: jest.fn(),
    createReceive: jest.fn(),
    waitAndClaim: jest.fn(),
    getRefundableCount: jest.fn(),
};

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }): React.JSX.Element
{
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function connectWallet(): void
{
    mockedWallet.mockReturnValue({
        status: "connected",
        account: { publicKey: FAKE_PUBKEY, authToken: "auth-1", walletUriBase: "" },
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        reconnect: jest.fn(),
    });
}

function disconnectWallet(): void
{
    mockedWallet.mockReturnValue({
        status: "idle",
        account: null,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        reconnect: jest.fn(),
    });
}

beforeEach(() =>
{
    jest.clearAllMocks();
    Object.values(svc).forEach((fn) => fn.mockReset());
    mockedGetLightningService.mockReturnValue(svc as unknown as ReturnType<typeof getLightningService>);
    mockedNetwork.mockReturnValue({ isOnline: true, isInternetReachable: true });
    queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    connectWallet();
});

describe("useLightning mutation hooks — wallet guard", () =>
{
    it.each([
        ["useLightningQuote", () => useLightningQuote(), { rawInput: "ln", amountSats: 1n, srcToken: USDC }],
        ["useLightningPay", () => useLightningPay(), { quote: {} as LightningQuote, onPhase: jest.fn() }],
        ["useRefundAll", () => useRefundAll(), undefined],
        ["useCreateReceive", () => useCreateReceive(), { dstToken: SOL, amountSats: 100n }],
        ["useWaitAndClaim", () => useWaitAndClaim(), { receive: {} as LightningReceive, onPhase: jest.fn() }],
    ])("%s rejects when the wallet is not connected", async (_label, useHook, input) =>
    {
        disconnectWallet();
        const { result } = renderHook(() => useHook(), { wrapper });

        await expect(
            act(async () => { await result.current.mutateAsync(input as never); }),
        ).rejects.toThrow(/not connected/);
    });
});

describe("useLightning service delegation", () =>
{
    it("useLightningQuote passes the wallet address to getQuote", async () =>
    {
        svc.getQuote.mockResolvedValue({ inputBase: 10n } as LightningQuote);
        const { result } = renderHook(() => useLightningQuote(), { wrapper });

        await act(async () =>
        {
            await result.current.mutateAsync({ rawInput: "ln", amountSats: 1n, srcToken: USDC });
        });

        expect(svc.getQuote).toHaveBeenCalledWith({
            rawInput: "ln",
            amountSats: 1n,
            srcToken: USDC,
            srcAddress: FAKE_PUBKEY.toBase58(),
        });
    });

    it("useLightningPay delegates to pay and invalidates balance/history on success", async () =>
    {
        svc.pay.mockResolvedValue({ status: "paid" });
        const invalidate = jest.spyOn(queryClient, "invalidateQueries");
        const onPhase = jest.fn();
        const { result } = renderHook(() => useLightningPay(), { wrapper });

        await act(async () =>
        {
            await result.current.mutateAsync({ quote: { inputBase: 5n } as LightningQuote, onPhase });
        });

        expect(svc.pay).toHaveBeenCalledTimes(1);
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ["balance"] });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ["history"] });
    });

    it("useRefundAll delegates to refundAll and invalidates the refundable count", async () =>
    {
        svc.refundAll.mockResolvedValue(3);
        const invalidate = jest.spyOn(queryClient, "invalidateQueries");
        const { result } = renderHook(() => useRefundAll(), { wrapper });

        let returned: number | undefined;
        await act(async () => { returned = await result.current.mutateAsync(); });

        expect(returned).toBe(3);
        expect(svc.refundAll).toHaveBeenCalledTimes(1);
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ["lightning", "refundable"] });
    });
});

describe("useRefundableSwaps", () =>
{
    it("does not query while disabled", () =>
    {
        const { result } = renderHook(() => useRefundableSwaps(false), { wrapper });

        // enabled=false → fetch 하지 않음(fetchStatus idle), queryFn 미실행
        expect(result.current.fetchStatus).toBe("idle");
        expect(svc.getRefundableCount).not.toHaveBeenCalled();
    });

    it("does not query while offline", async () =>
    {
        mockedNetwork.mockReturnValue({ isOnline: false, isInternetReachable: false });
        renderHook(() => useRefundableSwaps(true), { wrapper });

        expect(svc.getRefundableCount).not.toHaveBeenCalled();
    });

    it("queries getRefundableCount when enabled, online and connected", async () =>
    {
        svc.getRefundableCount.mockResolvedValue(2);
        const { result } = renderHook(() => useRefundableSwaps(true), { wrapper });

        await waitFor(() => { expect(result.current.data).toBe(2); });
        expect(svc.getRefundableCount).toHaveBeenCalledWith(FAKE_PUBKEY.toBase58());
    });
});
