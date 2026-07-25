import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import { PublicKey, VersionedTransaction, TransactionMessage } from "@solana/web3.js";
import React from "react";

import { useWallet } from "@/hooks/useWallet";
import { useConnection } from "@/providers/ConnectionProvider";
import { waitForConfirmation } from "@/services/confirmTransaction";
import * as JupiterService from "@/services/JupiterService";
import { getLightningService } from "@/services/lightning/LightningService";
import { LN_SENTINEL } from "@/services/lightning/sentinels";
import * as WalletService from "@/services/WalletService";
import type { CbbtcSwapQuote } from "@/services/lightning/cbbtcPreSwap";
import type { LightningQuote } from "@/services/lightning/types";

import { useCbbtcLightningPay, type CbbtcPayPhase } from "./useCbbtcLightning";

// 실제 hasPreSwapShortfall(=freshNeeded > obtained)을 그대로 태워 인자 순서를 검증한다 —
// 이 게이트가 유일한 자금 안전장치이고, 인자를 바꾸면 typecheck·기존 테스트를 통과하며 조용히 무력화된다.
jest.mock("@/hooks/useWallet");
jest.mock("@/providers/ConnectionProvider", () => ({ useConnection: jest.fn() }));
jest.mock("@/services/confirmTransaction");
jest.mock("@/services/JupiterService");
jest.mock("@/services/WalletService");
jest.mock("@/services/lightning/LightningService");

const mockedWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockedUseConnection = useConnection as jest.MockedFunction<typeof useConnection>;
const mockedConfirm = waitForConfirmation as jest.MockedFunction<typeof waitForConfirmation>;
const mockedJupiter = JupiterService as jest.Mocked<typeof JupiterService>;
const mockedWalletService = WalletService as jest.Mocked<typeof WalletService>;
const mockedGetLightningService = getLightningService as jest.MockedFunction<typeof getLightningService>;

const FAKE_PUBKEY = new PublicKey(new Uint8Array(32).fill(9));

// swap 으로 확보한 USDC = 900. escrow 가 필요로 하는 USDC(freshQuote.inputBase)와 비교된다.
const OBTAINED_USDC = 900n;

let mockPay: jest.Mock;
let mockGetQuote: jest.Mock;

function fakeTx(): VersionedTransaction
{
    const msg = new TransactionMessage({
        payerKey: FAKE_PUBKEY,
        recentBlockhash: "11111111111111111111111111111111",
        instructions: [],
    }).compileToV0Message();
    return new VersionedTransaction(msg);
}

function swapFixture(): CbbtcSwapQuote
{
    return {
        // jupiterQuote 는 getSwapTransaction(mock)에만 전달되므로 최소 형태로 캐스팅.
        jupiterQuote: {} as CbbtcSwapQuote["jupiterQuote"],
        usdcOutBase: OBTAINED_USDC,
    } as CbbtcSwapQuote;
}

// freshQuote — pay 로 넘어가는 재견적. inputBase 만 게이트에 쓰인다.
function freshQuoteNeeding(usdcBase: bigint): LightningQuote
{
    return { inputBase: usdcBase } as unknown as LightningQuote;
}

function wrapper({ children }: { children: React.ReactNode }): React.JSX.Element
{
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function payInput(overrides: Partial<Parameters<ReturnType<typeof useCbbtcLightningPay>["mutateAsync"]>[0]> = {})
{
    const phases: CbbtcPayPhase[] = [];
    const input = {
        rawInput: "lnbc...",
        amountSats: 1000n,
        swap: swapFixture(),
        onPhase: (p: CbbtcPayPhase) => { phases.push(p); },
        ...overrides,
    };
    return { input, phases };
}

describe("useCbbtcLightningPay", () =>
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
        mockedUseConnection.mockReturnValue({} as ReturnType<typeof useConnection>);
        mockedJupiter.getSwapTransaction.mockResolvedValue({ transaction: fakeTx(), lastValidBlockHeight: 1 });
        mockedWalletService.signAndSendTransactions.mockResolvedValue(["swap-sig"]);
        mockedConfirm.mockResolvedValue(undefined);

        mockPay = jest.fn().mockResolvedValue({ status: "paid", preimage: "deadbeef" });
        mockGetQuote = jest.fn();
        mockedGetLightningService.mockReturnValue({
            getQuote: mockGetQuote,
            pay: mockPay,
        } as unknown as ReturnType<typeof getLightningService>);
    });

    it("pays via USDC after the swap confirms, in phase order", async () =>
    {
        // 재견적 USDC(800) ≤ 확보분(900) → 부족분 없음 → escrow 결제 진행.
        mockGetQuote.mockResolvedValue(freshQuoteNeeding(800n));

        const { result } = renderHook(() => useCbbtcLightningPay(), { wrapper });
        const { input, phases } = payInput();

        let returned: { swapSignature: string } | undefined;
        await act(async () => { returned = await result.current.mutateAsync(input); });

        expect(returned?.swapSignature).toBe("swap-sig");
        expect(mockPay).toHaveBeenCalledTimes(1);
        // pay 에 재견적(freshQuote)이 전달된다.
        expect(mockPay.mock.calls[0][0]).toEqual(freshQuoteNeeding(800n));
        // 스왑 → 확정 → 확정완료 순서로 phase 가 나온다.
        expect(phases.slice(0, 3)).toEqual(["swapping", "confirming", "confirmed"]);
    });

    it("blocks the escrow when the re-quote exceeds the obtained USDC (shortfall gate) — R23", async () =>
    {
        // 재견적 USDC(1000) > 확보분(900) → 부족분 → escrow 시도 전에 차단.
        // 인자를 뒤집으면(obtained > freshNeeded) 이 케이스가 통과해버려 자금이 escrow 로 잠긴다.
        mockGetQuote.mockResolvedValue(freshQuoteNeeding(1000n));

        const { result } = renderHook(() => useCbbtcLightningPay(), { wrapper });
        const { input } = payInput();

        await expect(
            act(async () => { await result.current.mutateAsync(input); }),
        ).rejects.toThrow(LN_SENTINEL.PRESWAP_SHORTFALL);

        // 핵심: 부족분이면 escrow 결제(pay)로 절대 넘어가지 않는다.
        expect(mockPay).not.toHaveBeenCalled();
    });

    it("does not proceed to confirmation when the swap returns no signature", async () =>
    {
        mockedWalletService.signAndSendTransactions.mockResolvedValue([]);

        const { result } = renderHook(() => useCbbtcLightningPay(), { wrapper });
        const { input } = payInput();

        await expect(
            act(async () => { await result.current.mutateAsync(input); }),
        ).rejects.toThrow(/No swap signature/);
        expect(mockedConfirm).not.toHaveBeenCalled();
        expect(mockPay).not.toHaveBeenCalled();
    });

    it("rejects when the wallet is not connected", async () =>
    {
        mockedWallet.mockReturnValue({
            status: "idle",
            account: null,
            error: null,
            connect: jest.fn(),
            disconnect: jest.fn(),
            reconnect: jest.fn(),
        });

        const { result } = renderHook(() => useCbbtcLightningPay(), { wrapper });
        const { input } = payInput();

        await expect(
            act(async () => { await result.current.mutateAsync(input); }),
        ).rejects.toThrow(/not connected/);
        expect(mockedWalletService.signAndSendTransactions).not.toHaveBeenCalled();
    });
});
