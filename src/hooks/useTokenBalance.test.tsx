import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { PublicKey } from "@solana/web3.js";
import React from "react";

import { CBBTC, SOL } from "@/constants/tokens";
import { ConnectionContext } from "@/providers/ConnectionProvider";
import * as TokenService from "@/services/TokenService";

import { useTokenBalance } from "./useTokenBalance";

jest.mock("@/services/TokenService");

const mockedSvc = TokenService as jest.Mocked<typeof TokenService>;
const OWNER = new PublicKey(new Uint8Array(32).fill(9));

function makeWrapper(): React.FC<{ children: React.ReactNode }>
{
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    const fakeConnection = {} as never;
    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
        (
        <QueryClientProvider client={client}>
            <ConnectionContext.Provider value={fakeConnection}>
                {children}
            </ConnectionContext.Provider>
        </QueryClientProvider>
        );
    return Wrapper;
}

describe("useTokenBalance", () =>
{
    beforeEach(() =>
    {
        jest.clearAllMocks();
    });

    it("is disabled when owner is null", () =>
    {
        const { result } = renderHook(() => useTokenBalance(SOL, null), {
            wrapper: makeWrapper(),
        });

        expect(result.current.fetchStatus).toBe("idle");
        expect(mockedSvc.getSolBalance).not.toHaveBeenCalled();
        expect(mockedSvc.getTokenBalance).not.toHaveBeenCalled();
    });

    it("calls getSolBalance for native SOL", async () =>
    {
        mockedSvc.getSolBalance.mockResolvedValue({
            amount: 1_500_000_000n,
            uiAmount: 1.5,
            decimals: 9,
        });

        const { result } = renderHook(() => useTokenBalance(SOL, OWNER), {
            wrapper: makeWrapper(),
        });

        await waitFor(() =>
        {
            expect(result.current.data?.uiAmount).toBe(1.5);
        });
        expect(mockedSvc.getSolBalance).toHaveBeenCalled();
        expect(mockedSvc.getTokenBalance).not.toHaveBeenCalled();
    });

    it("calls getTokenBalance for non-native tokens", async () =>
    {
        mockedSvc.getTokenBalance.mockResolvedValue({
            amount: 12345n,
            uiAmount: 0.00012345,
            decimals: 8,
        });

        const { result } = renderHook(() => useTokenBalance(CBBTC, OWNER), {
            wrapper: makeWrapper(),
        });

        await waitFor(() =>
        {
            expect(result.current.data?.amount).toBe(12345n);
        });
        expect(mockedSvc.getTokenBalance).toHaveBeenCalled();
        expect(mockedSvc.getSolBalance).not.toHaveBeenCalled();
    });

    it("surfaces errors when the underlying service rejects", async () =>
    {
        mockedSvc.getSolBalance.mockRejectedValue(new Error("429 Too Many Requests"));

        const { result } = renderHook(() => useTokenBalance(SOL, OWNER), {
            wrapper: makeWrapper(),
        });

        await waitFor(() =>
        {
            expect(result.current.isError).toBe(true);
        });
        expect(result.current.error?.message).toMatch(/429/);
    });
});
