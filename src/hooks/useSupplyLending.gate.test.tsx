import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import { PublicKey, type Connection, type VersionedTransaction } from "@solana/web3.js";
import React from "react";

import { useWallet } from "@/hooks/useWallet";
import { useConnection } from "@/providers/ConnectionProvider";
import * as KaminoTxBuilder from "@/services/KaminoTxBuilder";
import * as WalletService from "@/services/WalletService";
import type { TxStep } from "@/utils/txProgress";

import { useSupplyLending } from "./useSupplyLending";

jest.mock("@/hooks/useWallet");
jest.mock("@/providers/ConnectionProvider");
jest.mock("@/services/KaminoTxBuilder");
jest.mock("@/services/WalletService");

const mockedWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockedConnection = useConnection as jest.MockedFunction<typeof useConnection>;
const mockedBuilder = KaminoTxBuilder as jest.Mocked<typeof KaminoTxBuilder>;
const mockedWalletService = WalletService as jest.Mocked<typeof WalletService>;

const FAKE_PUBKEY = new PublicKey(new Uint8Array(32).fill(5));

function wrapper({ children }: { children: React.ReactNode }): React.JSX.Element
{
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function connectionReturning(simValue: { err: unknown; logs?: string[] | null }): Connection
{
    return {
        simulateTransaction: jest.fn().mockResolvedValue({ value: { logs: null, ...simValue } }),
    } as unknown as Connection;
}

describe("useSupplyLending — simulation gate (실자금 보호)", () =>
{
    beforeEach(() =>
    {
        jest.clearAllMocks();
        mockedWallet.mockReturnValue({
            status: "connected",
            account: { publicKey: FAKE_PUBKEY, authToken: "auth-1", walletUriBase: "" },
            error: null,
            connect: jest.fn(),
            disconnect: jest.fn(),
            reconnect: jest.fn(),
        });
        mockedBuilder.buildSupplyTransaction.mockResolvedValue({} as VersionedTransaction);
        mockedWalletService.signAndSendTransactions.mockResolvedValue(["supply-sig"]);
    });

    it("does NOT sign when simulation fails — blocks at the gate before any signature", async () =>
    {
        mockedConnection.mockReturnValue(connectionReturning({
            err: { InstructionError: [2, "Custom"] },
            logs: ["Program log: boom"],
        }));

        const { result } = renderHook(() => useSupplyLending(), { wrapper });
        const steps: TxStep[] = [];

        await expect(
            act(async () =>
            {
                await result.current.mutateAsync({ amountBase: 1_000n, onStep: (s) => steps.push(s) });
            }),
        ).rejects.toThrow(/Simulation failed/);

        // 핵심: 시뮬 실패 → 서명 호출 자체가 없어야 함 (실자금 서명 차단)
        expect(mockedWalletService.signAndSendTransactions).not.toHaveBeenCalled();
        // signing/sending 단계까지 가지 않음 (게이트에서 멈춤)
        expect(steps).not.toContain("signing");
        expect(steps).not.toContain("sending");
    });

    it("signs and returns the signature once simulation passes", async () =>
    {
        mockedConnection.mockReturnValue(connectionReturning({ err: null }));

        const { result } = renderHook(() => useSupplyLending(), { wrapper });
        const steps: TxStep[] = [];

        let returned: { signature: string } | undefined;
        await act(async () =>
        {
            returned = await result.current.mutateAsync({ amountBase: 1_000n, onStep: (s) => steps.push(s) });
        });

        expect(returned?.signature).toBe("supply-sig");
        expect(mockedWalletService.signAndSendTransactions).toHaveBeenCalledTimes(1);
        expect(steps).toEqual(["preparing", "simulating", "signing", "sending"]);
    });
});
