import { QueryClient, QueryClientProvider, type UseMutationResult } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import { PublicKey, type Connection, type VersionedTransaction } from "@solana/web3.js";
import React from "react";

import { useWallet } from "@/hooks/useWallet";
import { useConnection } from "@/providers/ConnectionProvider";
import * as KaminoTxBuilder from "@/services/KaminoTxBuilder";
import * as WalletService from "@/services/WalletService";

import { useWithdrawLending } from "./useWithdrawLending";
import { useBorrowLending } from "./useBorrowLending";
import { useRepayLending } from "./useRepayLending";

jest.mock("@/hooks/useWallet");
jest.mock("@/providers/ConnectionProvider");
jest.mock("@/services/KaminoTxBuilder");
jest.mock("@/services/WalletService");

const mockedWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockedConnection = useConnection as jest.MockedFunction<typeof useConnection>;
const mockedBuilder = KaminoTxBuilder as jest.Mocked<typeof KaminoTxBuilder>;
const mockedWalletService = WalletService as jest.Mocked<typeof WalletService>;

const FAKE_PUBKEY = new PublicKey(new Uint8Array(32).fill(7));
// 오라클 stale (PriceTooOld 6039) — allowOracleStale 로 우회 대상.
const ORACLE_STALE = { InstructionError: [3, { Custom: 6039 }] };
// 그 외 실패 — 우회 금지.
const OTHER_ERR = { InstructionError: [2, { Custom: 1234 }] };

function wrapper({ children }: { children: React.ReactNode }): React.JSX.Element
{
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function connReturning(simErr: unknown): Connection
{
    return {
        simulateTransaction: jest.fn().mockResolvedValue({ value: { err: simErr, logs: null } }),
        getSignatureStatuses: jest.fn().mockResolvedValue({ value: [{ confirmationStatus: "confirmed", err: null }] }),
    } as unknown as Connection;
}

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
    mockedBuilder.buildWithdrawTransaction.mockResolvedValue({} as VersionedTransaction);
    mockedBuilder.buildBorrowTransaction.mockResolvedValue({} as VersionedTransaction);
    mockedBuilder.buildRepayTransaction.mockResolvedValue({} as VersionedTransaction);
    mockedWalletService.signAndSendTransactions.mockResolvedValue(["lending-sig"]);
});

// 세 mutation hook 은 동일한 게이트/우회 래더를 갖는다 — 공용 스위트로 한 번에 고정.
function gateSuite<I>(
    label: string,
    useHook: () => UseMutationResult<{ signature: string }, Error, I>,
    getBuilder: () => jest.Mock,
    makeInput: (extra: { allowOracleStale?: boolean }) => I,
): void
{
    describe(`${label} — simulation gate`, () =>
    {
        it("시뮬 실패(비-oracle) → 서명하지 않고 throw", async () =>
        {
            mockedConnection.mockReturnValue(connReturning(OTHER_ERR));
            const { result } = renderHook(() => useHook(), { wrapper });

            await expect(
                act(async () => { await result.current.mutateAsync(makeInput({})); }),
            ).rejects.toThrow(/Simulation failed/);
            expect(mockedWalletService.signAndSendTransactions).not.toHaveBeenCalled();
        });

        it("시뮬 통과 → 서명·확정 후 signature 반환", async () =>
        {
            mockedConnection.mockReturnValue(connReturning(null));
            const { result } = renderHook(() => useHook(), { wrapper });

            let returned: { signature: string } | undefined;
            await act(async () => { returned = await result.current.mutateAsync(makeInput({})); });

            expect(returned?.signature).toBe("lending-sig");
            expect(mockedWalletService.signAndSendTransactions).toHaveBeenCalledTimes(1);
        });

        it("allowOracleStale=true + oracle-stale 시뮬 실패 → 게이트 우회하고 서명", async () =>
        {
            mockedConnection.mockReturnValue(connReturning(ORACLE_STALE));
            const { result } = renderHook(() => useHook(), { wrapper });

            let returned: { signature: string } | undefined;
            await act(async () => { returned = await result.current.mutateAsync(makeInput({ allowOracleStale: true })); });

            expect(returned?.signature).toBe("lending-sig"); // 우회 성공 → 서명까지 진행
            expect(mockedWalletService.signAndSendTransactions).toHaveBeenCalledTimes(1);
        });

        it("allowOracleStale=true + 비-oracle 실패 → 우회하지 않고 여전히 throw", async () =>
        {
            mockedConnection.mockReturnValue(connReturning(OTHER_ERR));
            const { result } = renderHook(() => useHook(), { wrapper });

            await expect(
                act(async () => { await result.current.mutateAsync(makeInput({ allowOracleStale: true })); }),
            ).rejects.toThrow(/Simulation failed/);
            expect(mockedWalletService.signAndSendTransactions).not.toHaveBeenCalled();
        });
    });
}

gateSuite("withdraw", useWithdrawLending, () => mockedBuilder.buildWithdrawTransaction as unknown as jest.Mock,
    (extra) => ({ liquidityBase: 1_000n, withdrawAll: false, ...extra }));
gateSuite("borrow", useBorrowLending, () => mockedBuilder.buildBorrowTransaction as unknown as jest.Mock,
    (extra) => ({ usdcAmountBase: 1_000_000n, ...extra }));
gateSuite("repay", useRepayLending, () => mockedBuilder.buildRepayTransaction as unknown as jest.Mock,
    (extra) => ({ usdcAmountBase: 1_000_000n, repayAll: false, ...extra }));
