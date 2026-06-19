import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

import { KLEND_PROGRAM_ID } from "@/constants/lending";
import { CBBTC, USDC } from "@/constants/tokens";

import {
    ATOMIQ_PROGRAM_IDS,
    classifyTransaction,
    clearHistoryCache,
    fetchTransactionHistory,
    isRateLimitError,
    JUPITER_V6_PROGRAM_ID,
    programIdsInTx,
    solDelta,
    tokenDelta,
    type ParsedTxLike,
    type TxHistoryKind,
} from "./TransactionHistoryService";

const OWNER = "9xQeWvG816bUx9EPSWvPjW8TQ6E7KqkbszxbjGAxAJat";

function tokenBalance(
    accountIndex: number,
    mint: string,
    owner: string,
    amount: string,
    decimals = 8,
): {
        accountIndex: number;
        mint: string;
        owner: string;
        uiTokenAmount: { amount: string; decimals: number; uiAmount: number | null; uiAmountString: string };
    }
{
    return {
        accountIndex,
        mint,
        owner,
        uiTokenAmount: {
            amount,
            decimals,
            uiAmount: Number(amount) / 10 ** decimals,
            uiAmountString: (Number(amount) / 10 ** decimals).toString(),
        },
    };
}

// snake_case Anchor discriminators (= classify 와 동일 값) — 테스트 픽스처용
const ATOMIQ_V2 = "atq2FYuvww5EF6qeB28gj9tkao6Ld9mEGUzF4M93cCC";
const DISC_CLAIM = [167, 53, 133, 231, 115, 222, 196, 207];          // claimer_claim
const DISC_REFUND = [151, 35, 133, 253, 230, 106, 141, 176];         // offerer_refund
const DISC_INIT = [175, 80, 213, 24, 95, 155, 199, 58];              // offerer_initialize_pay_in

function discData(disc: number[]): string
{
    return bs58.encode(Uint8Array.from([...disc, 0, 0]));
}

function makeTx(opts: {
    outerPrograms?: readonly string[];
    innerPrograms?: readonly string[];
    pre?: ReturnType<typeof tokenBalance>[];
    post?: ReturnType<typeof tokenBalance>[];
    err?: unknown;
    // native SOL 잔액 추적용 (accountKeys[i] ↔ pre/postBalances[i])
    accountKeys?: readonly string[];
    preBalances?: readonly number[];
    postBalances?: readonly number[];
    // Atomiq 명령의 discriminator (지정 시 ATOMIQ_V2 program 명령 + base58 data 추가)
    atomiqDisc?: number[];
}): ParsedTxLike
{
    const outer = (opts.outerPrograms ?? []).map((id) => ({ programId: new PublicKey(id), data: undefined as string | undefined }));
    if (opts.atomiqDisc)
    {
        outer.push({ programId: new PublicKey(ATOMIQ_V2), data: discData(opts.atomiqDisc) });
    }
    const inner = (opts.innerPrograms ?? []).map((id) => ({ programId: new PublicKey(id) }));
    return {
        transaction: {
            message: {
                instructions: outer as Parameters<typeof programIdsInTx>[0]["transaction"]["message"]["instructions"],
                accountKeys: opts.accountKeys?.map((k) => ({ pubkey: new PublicKey(k) })),
            },
        },
        meta: {
            err: opts.err ?? null,
            preTokenBalances: opts.pre ?? [],
            postTokenBalances: opts.post ?? [],
            innerInstructions: inner.length > 0 ? [{ index: 0, instructions: inner }] : null,
            preBalances: opts.preBalances,
            postBalances: opts.postBalances,
        },
    };
}

describe("programIdsInTx", () =>
{
    it("collects program IDs from outer instructions", () =>
    {
        const tx = makeTx({ outerPrograms: [KLEND_PROGRAM_ID, "11111111111111111111111111111111"] });
        const ids = programIdsInTx(tx);
        expect(ids.has(KLEND_PROGRAM_ID)).toBe(true);
        expect(ids.has("11111111111111111111111111111111")).toBe(true);
    });

    it("collects program IDs from inner instructions (CPI)", () =>
    {
        const tx = makeTx({
            outerPrograms: [JUPITER_V6_PROGRAM_ID],
            innerPrograms: ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
        });
        const ids = programIdsInTx(tx);
        expect(ids.has(JUPITER_V6_PROGRAM_ID)).toBe(true);
        expect(ids.has("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")).toBe(true);
    });

    it("returns empty set for empty tx", () =>
    {
        const tx = makeTx({});
        expect(programIdsInTx(tx).size).toBe(0);
    });
});

describe("tokenDelta", () =>
{
    it("returns post - pre when owner has the mint", () =>
    {
        const pre = [tokenBalance(3, CBBTC.mint, OWNER, "10000000")];
        const post = [tokenBalance(3, CBBTC.mint, OWNER, "5000000")];
        expect(tokenDelta(pre, post, OWNER, CBBTC.mint)).toBe(-5000000n);
    });

    it("returns positive delta when receiving", () =>
    {
        const pre = [tokenBalance(3, USDC.mint, OWNER, "0", 6)];
        const post = [tokenBalance(3, USDC.mint, OWNER, "1000000", 6)];
        expect(tokenDelta(pre, post, OWNER, USDC.mint)).toBe(1_000_000n);
    });

    it("returns undefined when owner has no balance for that mint", () =>
    {
        const pre = [tokenBalance(3, CBBTC.mint, "OTHER", "100")];
        const post = [tokenBalance(3, CBBTC.mint, "OTHER", "200")];
        expect(tokenDelta(pre, post, OWNER, CBBTC.mint)).toBeUndefined();
    });

    it("handles missing pre (newly created ATA) as 0", () =>
    {
        const post = [tokenBalance(3, USDC.mint, OWNER, "2000000", 6)];
        expect(tokenDelta(undefined, post, OWNER, USDC.mint)).toBe(2_000_000n);
    });
});

describe("classifyTransaction", () =>
{
    it("classifies cbBTC-out + Kamino as supply", () =>
    {
        const tx = makeTx({
            outerPrograms: [KLEND_PROGRAM_ID],
            pre: [tokenBalance(3, CBBTC.mint, OWNER, "100000")],
            post: [tokenBalance(3, CBBTC.mint, OWNER, "0")],
        });
        const r = classifyTransaction(tx, OWNER);
        expect(r.kind).toBe<TxHistoryKind>("supply");
        expect(r.cbbtcDelta).toBe(-100000n);
    });

    it("classifies cbBTC-in + Kamino as withdraw", () =>
    {
        const tx = makeTx({
            outerPrograms: [KLEND_PROGRAM_ID],
            pre: [tokenBalance(3, CBBTC.mint, OWNER, "0")],
            post: [tokenBalance(3, CBBTC.mint, OWNER, "100000")],
        });
        expect(classifyTransaction(tx, OWNER).kind).toBe<TxHistoryKind>("withdraw");
    });

    it("classifies USDC-in + Kamino as borrow", () =>
    {
        const tx = makeTx({
            outerPrograms: [KLEND_PROGRAM_ID],
            pre: [tokenBalance(4, USDC.mint, OWNER, "0", 6)],
            post: [tokenBalance(4, USDC.mint, OWNER, "1000000", 6)],
        });
        const r = classifyTransaction(tx, OWNER);
        expect(r.kind).toBe<TxHistoryKind>("borrow");
        expect(r.usdcDelta).toBe(1_000_000n);
    });

    it("classifies USDC-out + Kamino as repay", () =>
    {
        const tx = makeTx({
            outerPrograms: [KLEND_PROGRAM_ID],
            pre: [tokenBalance(4, USDC.mint, OWNER, "1000000", 6)],
            post: [tokenBalance(4, USDC.mint, OWNER, "0", 6)],
        });
        expect(classifyTransaction(tx, OWNER).kind).toBe<TxHistoryKind>("repay");
    });

    it("classifies Jupiter v6 with cbBTC delta as swap", () =>
    {
        const tx = makeTx({
            outerPrograms: [JUPITER_V6_PROGRAM_ID],
            pre: [tokenBalance(3, CBBTC.mint, OWNER, "100000")],
            post: [tokenBalance(3, CBBTC.mint, OWNER, "0")],
        });
        const r = classifyTransaction(tx, OWNER);
        expect(r.kind).toBe<TxHistoryKind>("swap");
        expect(r.cbbtcDelta).toBe(-100000n);
    });

    it("classifies unrelated tx as other", () =>
    {
        const tx = makeTx({
            outerPrograms: ["11111111111111111111111111111111"],
        });
        expect(classifyTransaction(tx, OWNER).kind).toBe<TxHistoryKind>("other");
    });
});

describe("solDelta", () =>
{
    const FEE_PAYER = OWNER;
    const OTHER = "EMR9ReRWM2ZfsHfZbDrmDdhHy3v6MUqD56X86oxd2Unf";

    it("returns post - pre lamports for the owner account", () =>
    {
        const tx = makeTx({
            accountKeys: [FEE_PAYER, OTHER],
            preBalances: [1_000_000_000, 50],
            postBalances: [340_000_000, 50],
        });
        expect(solDelta(tx, OWNER)).toBe(-660_000_000n);
    });

    it("returns undefined when owner not in accountKeys", () =>
    {
        const tx = makeTx({
            accountKeys: [OTHER],
            preBalances: [100],
            postBalances: [200],
        });
        expect(solDelta(tx, OWNER)).toBeUndefined();
    });

    it("returns undefined when balances missing", () =>
    {
        const tx = makeTx({ accountKeys: [FEE_PAYER] });
        expect(solDelta(tx, OWNER)).toBeUndefined();
    });
});

describe("classifyTransaction — lightning (Atomiq)", () =>
{
    const ATOMIQ_V1 = "4hfUykhqmD7ZRvNh1HuzVKEY7ToENixtdUKZspNDCrEM";

    it("exports both deployed program ids", () =>
    {
        expect(ATOMIQ_PROGRAM_IDS).toContain(ATOMIQ_V1);
        expect(ATOMIQ_PROGRAM_IDS).toContain(ATOMIQ_V2);
    });

    // --- discriminator 기반 정확 분류 ---

    it("claim discriminator => lightningReceive (받기, even with positive delta)", () =>
    {
        const tx = makeTx({
            atomiqDisc: DISC_CLAIM,
            pre: [tokenBalance(3, USDC.mint, OWNER, "0", 6)],
            post: [tokenBalance(3, USDC.mint, OWNER, "648125", 6)],
        });
        expect(classifyTransaction(tx, OWNER).kind).toBe<TxHistoryKind>("lightningReceive");
    });

    it("refund discriminator => lightningRefund (positive delta)", () =>
    {
        const tx = makeTx({
            atomiqDisc: DISC_REFUND,
            pre: [tokenBalance(3, USDC.mint, OWNER, "0", 6)],
            post: [tokenBalance(3, USDC.mint, OWNER, "648125", 6)],
        });
        expect(classifyTransaction(tx, OWNER).kind).toBe<TxHistoryKind>("lightningRefund");
    });

    it("init discriminator + negative delta => lightningPay (보내기)", () =>
    {
        const tx = makeTx({
            atomiqDisc: DISC_INIT,
            pre: [tokenBalance(3, USDC.mint, OWNER, "1000000", 6)],
            post: [tokenBalance(3, USDC.mint, OWNER, "351875", 6)],
        });
        expect(classifyTransaction(tx, OWNER).kind).toBe<TxHistoryKind>("lightningPay");
    });

    // --- delta 폴백 (discriminator data 없을 때) ---

    it("USDC-out + Atomiq, no disc => lightningPay (fallback)", () =>
    {
        const tx = makeTx({
            outerPrograms: [ATOMIQ_V2],
            pre: [tokenBalance(3, USDC.mint, OWNER, "1000000", 6)],
            post: [tokenBalance(3, USDC.mint, OWNER, "351875", 6)],
        });
        const r = classifyTransaction(tx, OWNER);
        expect(r.kind).toBe<TxHistoryKind>("lightningPay");
        expect(r.usdcDelta).toBe(-648_125n);
    });

    it("USDC-in + Atomiq, no disc => lightningReceive (fallback positive=receive)", () =>
    {
        const tx = makeTx({
            outerPrograms: [ATOMIQ_V2],
            pre: [tokenBalance(3, USDC.mint, OWNER, "0", 6)],
            post: [tokenBalance(3, USDC.mint, OWNER, "648125", 6)],
        });
        expect(classifyTransaction(tx, OWNER).kind).toBe<TxHistoryKind>("lightningReceive");
    });

    it("native SOL-out + Atomiq (v1), no disc => lightningPay via lamports delta", () =>
    {
        const tx = makeTx({
            outerPrograms: [ATOMIQ_V1],
            accountKeys: [OWNER, ATOMIQ_V1],
            preBalances: [1_000_000_000, 0],
            postBalances: [928_000_000, 0],
        });
        const r = classifyTransaction(tx, OWNER);
        expect(r.kind).toBe<TxHistoryKind>("lightningPay");
        expect(r.solDelta).toBe(-72_000_000n);
    });

    it("native SOL-in + Atomiq, no disc => lightningReceive (fallback)", () =>
    {
        const tx = makeTx({
            outerPrograms: [ATOMIQ_V2],
            accountKeys: [OWNER],
            preBalances: [100_000_000],
            postBalances: [171_000_000],
        });
        expect(classifyTransaction(tx, OWNER).kind).toBe<TxHistoryKind>("lightningReceive");
    });

    it("Atomiq with no detectable delta defaults to lightningPay", () =>
    {
        const tx = makeTx({ outerPrograms: [ATOMIQ_V2] });
        expect(classifyTransaction(tx, OWNER).kind).toBe<TxHistoryKind>("lightningPay");
    });

    it("Atomiq takes precedence over noise programs", () =>
    {
        const tx = makeTx({
            outerPrograms: ["11111111111111111111111111111111", ATOMIQ_V2],
            pre: [tokenBalance(3, USDC.mint, OWNER, "1000000", 6)],
            post: [tokenBalance(3, USDC.mint, OWNER, "0", 6)],
        });
        expect(classifyTransaction(tx, OWNER).kind).toBe<TxHistoryKind>("lightningPay");
    });
});

describe("isRateLimitError", () =>
{
    it("matches 429 HTTP message", () =>
    {
        expect(isRateLimitError(new Error('429 : {"jsonrpc":"2.0","error":{"message":"x"}}'))).toBe(true);
    });

    it("matches -32413 (Helius too many requests)", () =>
    {
        expect(isRateLimitError(new Error('413 : {"jsonrpc":"2.0","error":{"code":-32413,"message":"Too many requests"}}'))).toBe(true);
    });

    it("matches 'rate limit' phrasing", () =>
    {
        expect(isRateLimitError(new Error("Rate limit exceeded"))).toBe(true);
    });

    it("does not match unrelated errors", () =>
    {
        expect(isRateLimitError(new Error("Account not found"))).toBe(false);
        expect(isRateLimitError(null)).toBe(false);
        expect(isRateLimitError(undefined)).toBe(false);
        expect(isRateLimitError("string")).toBe(false);
    });
});

describe("fetchTransactionHistory", () =>
{
    beforeEach(() =>
    {
        // 모듈 전역 parsed-tx 캐시를 테스트 간 격리.
        clearHistoryCache();
    });

    function mockConnection(
        sigs: { signature: string; slot: number; blockTime: number | null; err: unknown }[],
        txs: (ParsedTxLike | null)[],
    ): { getSignaturesForAddress: jest.Mock; getParsedTransaction: jest.Mock }
    {
        // sig 문자열 → 해당 tx (배열 순서대로 매핑)
        const bySig = new Map<string, ParsedTxLike | null>();
        sigs.forEach((s, i) =>
        {
            bySig.set(s.signature, txs[i] ?? null);
        });
        return {
            getSignaturesForAddress: jest.fn().mockResolvedValue(sigs),
            getParsedTransaction: jest.fn().mockImplementation(async (sig: string) =>
            {
                return bySig.get(sig) ?? null;
            }),
        };
    }

    it("returns empty array when no signatures", async () =>
    {
        const conn = mockConnection([], []);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await fetchTransactionHistory(conn as any, new PublicKey(OWNER), { limit: 10 });
        expect(result).toEqual([]);
        expect(conn.getParsedTransaction).not.toHaveBeenCalled();
    });

    it("maps signatures + parsed txs into history items, filtering 'other'", async () =>
    {
        const supplyTx = makeTx({
            outerPrograms: [KLEND_PROGRAM_ID],
            pre: [tokenBalance(3, CBBTC.mint, OWNER, "100000")],
            post: [tokenBalance(3, CBBTC.mint, OWNER, "0")],
        });
        const swapTx = makeTx({
            outerPrograms: [JUPITER_V6_PROGRAM_ID],
            pre: [tokenBalance(3, CBBTC.mint, OWNER, "0")],
            post: [tokenBalance(3, CBBTC.mint, OWNER, "50000")],
        });
        const noiseTx = makeTx({ outerPrograms: ["11111111111111111111111111111111"] });

        const conn = mockConnection(
            [
                { signature: "sig-supply", slot: 100, blockTime: 1_700_000_000, err: null },
                { signature: "sig-swap", slot: 101, blockTime: 1_700_000_100, err: null },
                { signature: "sig-noise", slot: 102, blockTime: 1_700_000_200, err: null },
            ],
            [supplyTx, swapTx, noiseTx],
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await fetchTransactionHistory(conn as any, new PublicKey(OWNER), { limit: 25 });

        expect(result).toHaveLength(2);
        expect(result[0]?.signature).toBe("sig-supply");
        expect(result[0]?.kind).toBe<TxHistoryKind>("supply");
        expect(result[1]?.signature).toBe("sig-swap");
        expect(result[1]?.kind).toBe<TxHistoryKind>("swap");
    });

    it("preserves order from RPC (newest first)", async () =>
    {
        const a = makeTx({
            outerPrograms: [KLEND_PROGRAM_ID],
            pre: [tokenBalance(3, CBBTC.mint, OWNER, "100000")],
            post: [tokenBalance(3, CBBTC.mint, OWNER, "0")],
        });
        const b = makeTx({
            outerPrograms: [KLEND_PROGRAM_ID],
            pre: [tokenBalance(3, CBBTC.mint, OWNER, "0")],
            post: [tokenBalance(3, CBBTC.mint, OWNER, "50000")],
        });
        const conn = mockConnection(
            [
                { signature: "newer", slot: 200, blockTime: 2_000, err: null },
                { signature: "older", slot: 100, blockTime: 1_000, err: null },
            ],
            [a, b],
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await fetchTransactionHistory(conn as any, new PublicKey(OWNER), { limit: 25 });
        expect(result.map((r) => r.signature)).toEqual(["newer", "older"]);
    });

    it("marks failed tx with success=false", async () =>
    {
        const tx = makeTx({
            outerPrograms: [KLEND_PROGRAM_ID],
            pre: [tokenBalance(3, CBBTC.mint, OWNER, "100000")],
            post: [tokenBalance(3, CBBTC.mint, OWNER, "0")],
            err: { InstructionError: [0, "Custom"] },
        });
        const conn = mockConnection(
            [{ signature: "fail", slot: 100, blockTime: 1_000, err: { InstructionError: [0, "Custom"] } }],
            [tx],
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await fetchTransactionHistory(conn as any, new PublicKey(OWNER), { limit: 25 });
        expect(result[0]?.success).toBe(false);
    });

    it("caches parsed txs by signature — a refetch of the same sigs hits 0 RPC", async () =>
    {
        const tx = makeTx({
            outerPrograms: [JUPITER_V6_PROGRAM_ID],
            pre: [tokenBalance(3, CBBTC.mint, OWNER, "0")],
            post: [tokenBalance(3, CBBTC.mint, OWNER, "50000")],
        });
        const conn = mockConnection(
            [{ signature: "cached-sig", slot: 1, blockTime: 1, err: null }],
            [tx],
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await fetchTransactionHistory(conn as any, new PublicKey(OWNER), { limit: 25 });
        expect(conn.getParsedTransaction).toHaveBeenCalledTimes(1);

        // 동일 signature 재조회 (staleTime 만료 시뮬) → 캐시 히트, getParsedTransaction 추가 호출 없음
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const again = await fetchTransactionHistory(conn as any, new PublicKey(OWNER), { limit: 25 });
        expect(conn.getParsedTransaction).toHaveBeenCalledTimes(1);
        expect(again[0]?.signature).toBe("cached-sig");
        expect(again[0]?.kind).toBe<TxHistoryKind>("swap");
    });

    it("only fetches the new signature when one tx is added", async () =>
    {
        const swap = makeTx({
            outerPrograms: [JUPITER_V6_PROGRAM_ID],
            pre: [tokenBalance(3, CBBTC.mint, OWNER, "0")],
            post: [tokenBalance(3, CBBTC.mint, OWNER, "50000")],
        });

        const conn1 = mockConnection([{ signature: "old", slot: 1, blockTime: 1, err: null }], [swap]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await fetchTransactionHistory(conn1 as any, new PublicKey(OWNER), { limit: 25 });
        expect(conn1.getParsedTransaction).toHaveBeenCalledTimes(1);

        // 새 tx 가 맨 앞에 추가된 두 번째 호출 — "old" 는 캐시 히트, "new" 만 RPC
        const conn2 = mockConnection(
            [
                { signature: "new", slot: 2, blockTime: 2, err: null },
                { signature: "old", slot: 1, blockTime: 1, err: null },
            ],
            [swap, swap],
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await fetchTransactionHistory(conn2 as any, new PublicKey(OWNER), { limit: 25 });
        expect(conn2.getParsedTransaction).toHaveBeenCalledTimes(1);
        expect(conn2.getParsedTransaction).toHaveBeenCalledWith("new", expect.anything());
        expect(result.map((r) => r.signature)).toEqual(["new", "old"]);
    });
});
