import { PublicKey, VersionedTransaction } from "@solana/web3.js";

jest.mock(
    "@kamino-finance/klend-sdk/dist/@codegen/klend/accounts/Reserve",
    () => ({ Reserve: { decode: jest.fn() } }),
);
jest.mock(
    "@kamino-finance/klend-sdk/dist/@codegen/klend/accounts/Obligation",
    () => ({ Obligation: { decode: jest.fn() } }),
);

import { Reserve } from "@kamino-finance/klend-sdk/dist/@codegen/klend/accounts/Reserve";
import { Obligation } from "@kamino-finance/klend-sdk/dist/@codegen/klend/accounts/Obligation";

import { scopeOracleFromReserve, collectObligationReserves, buildSupplyTransaction, buildWithdrawTransaction, buildBorrowTransaction, buildRepayTransaction } from "./KaminoTxBuilder";

// 테스트 간 mock 상태 격리 (codegen decoder virtual mock 순서 의존 방지).
beforeEach(() => jest.clearAllMocks());

const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const CBBTC_MINT = "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij";
const SCOPE_FEED = "3t4JZcueEzTbVP6kLxXrL3VpWx45jDer4eqysweBchNH";
const CBBTC_RES = "37Jk2zkz23vkAYBT66HM2gaqJuNg2nYLsCreQAVt5MWK";

const SUPPLY_VAULT = "GMc8GAjGqWErpc8VRY5MUmYG2vDqYrNyf1x8X1MeQc7d";
const COLL_MINT = "HcWojFGTZionvotFb33CcuHK9ZSC8NkkmGzdPwCa517y";
const COLL_VAULT = "63BA7VvoPywvwSNBAskDWRARcRuJXmnsrEtBPUKDkQ8p";
const FARM = "9CinLHLAcMkzs4Ji8pwS2qwyz1LU46A4Ry7BNLGLubxs";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDC_SUPPLY = "Bgq7trRgVMeq33yt235zM2onQ4bRDBsY5EWiTetF4qw6";
const USDC_FEE = "BbDUrk1bVtSixgQsPLBJFZEF7mwGstnD5joA1WzYvYFX";

function mockUsdcReserveDecoded(): unknown
{
    return {
        liquidity: {
            mintPubkey: { toString: () => USDC_MINT },
            tokenProgram: { toString: () => TOKEN_PROGRAM },
            supplyVault: { toString: () => USDC_SUPPLY },
            feeVault: { toString: () => USDC_FEE },
        },
        config: { tokenInfo: { scopeConfiguration: { priceFeed: { toString: () => SCOPE_FEED } } } },
    };
}

function mockReserveDecoded(farmCollateral: string = FARM): unknown
{
    return {
        liquidity: {
            mintPubkey: { toString: () => CBBTC_MINT },
            tokenProgram: { toString: () => TOKEN_PROGRAM },
            supplyVault: { toString: () => SUPPLY_VAULT },
            availableAmount: { toString: () => "100000000" },
            borrowedAmountSf: { toString: () => "0" },
        },
        collateral: {
            mintPubkey: { toString: () => COLL_MINT },
            supplyVault: { toString: () => COLL_VAULT },
            mintTotalSupply: { toString: () => "100000000" },
        },
        farmCollateral: { toString: () => farmCollateral },
        config: { tokenInfo: { scopeConfiguration: { priceFeed: { toString: () => SCOPE_FEED } } } },
    };
}

const OWNER = new PublicKey("So11111111111111111111111111111111111111112");
const BLOCKHASH = "11111111111111111111111111111111";

const DEFAULT = "11111111111111111111111111111111";
const SCOPE = "3t4JZcueEzTbVP6kLxXrL3VpWx45jDer4eqysweBchNH";
const RES_A = "37Jk2zkz23vkAYBT66HM2gaqJuNg2nYLsCreQAVt5MWK";
const RES_B = "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59";

function bn(s: string): { toString(): string }
{
    return { toString: () => s };
}

describe("scopeOracleFromReserve", () =>
{
    it("scope priceFeed 가 설정돼 있으면 PublicKey 반환", () =>
    {
        const reserve = {
            config: { tokenInfo: { scopeConfiguration: { priceFeed: bn(SCOPE) } } },
        };
        expect(scopeOracleFromReserve(reserve)?.toBase58()).toBe(SCOPE);
    });

    it("default pubkey 면 null", () =>
    {
        const reserve = {
            config: { tokenInfo: { scopeConfiguration: { priceFeed: bn(DEFAULT) } } },
        };
        expect(scopeOracleFromReserve(reserve)).toBeNull();
    });
});

describe("collectObligationReserves", () =>
{
    it("obligation 이 null 이면 빈 배열", () =>
    {
        expect(collectObligationReserves(null)).toEqual([]);
    });

    it("deposits + borrows 의 reserve 를 모으고 default 는 제외", () =>
    {
        const ob = {
            deposits: [
                { depositReserve: bn(RES_A) },
                { depositReserve: bn(DEFAULT) }, // 빈 슬롯
            ],
            borrows: [
                { borrowReserve: bn(RES_B) },
                { borrowReserve: bn(DEFAULT) },
            ],
        };
        const result = collectObligationReserves(ob).map((p) => p.toBase58());
        expect(result).toEqual([RES_A, RES_B]);
    });

    it("중복 reserve 는 한 번만", () =>
    {
        const ob = {
            deposits: [{ depositReserve: bn(RES_A) }],
            borrows: [{ borrowReserve: bn(RES_A) }],
        };
        expect(collectObligationReserves(ob).map((p) => p.toBase58())).toEqual([RES_A]);
    });
});

describe("buildSupplyTransaction", () =>
{
    afterEach(() => jest.clearAllMocks());

    it("amount 0 이면 에러", async () =>
    {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await expect(buildSupplyTransaction({} as any, OWNER, 0n)).rejects.toThrow();
    });

    it("신규 사용자(farm 포함) → 11 instruction", async () =>
    {
        (Reserve.decode as jest.Mock).mockReturnValue(mockReserveDecoded());
        const connection = {
            getMultipleAccountsInfo: jest.fn()
                .mockResolvedValueOnce([null, null, { data: Buffer.from([1]) }]) // [oblig, meta, reserve]
                .mockResolvedValueOnce([null, null]),                            // [ata, farmState] 둘 다 없음
            getLatestBlockhash: jest.fn().mockResolvedValue({ blockhash: BLOCKHASH }),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx = await buildSupplyTransaction(connection as any, OWNER, 10_000n);
        expect(tx).toBeInstanceOf(VersionedTransaction);
        // initMeta+initOblig+initFarm+ata + refreshReserve+refreshOblig(pre)+farm(pre)+deposit+farm(post) + refreshReserve+refreshOblig(post)
        expect(tx.message.compiledInstructions).toHaveLength(11);
    });

    it("기존 사용자(전부 존재, farm 포함) → 7 instruction", async () =>
    {
        (Reserve.decode as jest.Mock).mockReturnValue(mockReserveDecoded());
        (Obligation.decode as jest.Mock).mockReturnValue({
            deposits: [{ depositReserve: { toString: () => CBBTC_RES } }],
            borrows: [],
        });
        const connection = {
            getMultipleAccountsInfo: jest.fn()
                .mockResolvedValueOnce([
                    { data: Buffer.from([9]) }, // obligation
                    { data: Buffer.from([8]) }, // userMetadata
                    { data: Buffer.from([1]) }, // reserve
                ])
                .mockResolvedValueOnce([
                    { data: Buffer.from([7]) }, // ATA
                    { data: Buffer.from([6]) }, // farmState
                ]),
            getLatestBlockhash: jest.fn().mockResolvedValue({ blockhash: BLOCKHASH }),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx = await buildSupplyTransaction(connection as any, OWNER, 10_000n);
        // refreshReserve+refreshOblig(pre)+farm(pre)+deposit+farm(post)+refreshReserve+refreshOblig(post)
        expect(tx.message.compiledInstructions).toHaveLength(7);
        expect(tx.message.staticAccountKeys[0]?.toBase58()).toBe(OWNER.toBase58()); // payer
    });

    it("farm 이 없는 reserve → farm instruction 생략 (5 instruction)", async () =>
    {
        const NO_FARM = "11111111111111111111111111111111";
        (Reserve.decode as jest.Mock).mockReturnValue(mockReserveDecoded(NO_FARM));
        (Obligation.decode as jest.Mock).mockReturnValue({ deposits: [], borrows: [] });
        const connection = {
            getMultipleAccountsInfo: jest.fn()
                .mockResolvedValueOnce([{ data: Buffer.from([9]) }, { data: Buffer.from([8]) }, { data: Buffer.from([1]) }])
                .mockResolvedValueOnce([{ data: Buffer.from([7]) }]), // [ata] only (no farm)
            getLatestBlockhash: jest.fn().mockResolvedValue({ blockhash: BLOCKHASH }),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx = await buildSupplyTransaction(connection as any, OWNER, 10_000n);
        // refreshReserve+refreshOblig(pre)+deposit+refreshReserve+refreshOblig(post)
        expect(tx.message.compiledInstructions).toHaveLength(5);
    });
});

describe("buildWithdrawTransaction", () =>
{
    afterEach(() => jest.clearAllMocks());

    function withdrawConn(): unknown
    {
        return {
            getMultipleAccountsInfo: jest.fn()
                .mockResolvedValueOnce([{ data: Buffer.from([9]) }, { data: Buffer.from([1]) }]) // [oblig, reserve]
                .mockResolvedValueOnce([{ data: Buffer.from([7]) }, { data: Buffer.from([6]) }]), // [ata, farmState]
            getLatestBlockhash: jest.fn().mockResolvedValue({ blockhash: BLOCKHASH }),
        };
    }

    it("포지션 없으면 에러", async () =>
    {
        const connection = {
            getMultipleAccountsInfo: jest.fn().mockResolvedValueOnce([null, { data: Buffer.from([1]) }]),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await expect(buildWithdrawTransaction(connection as any, OWNER, { liquidityBase: 0n, withdrawAll: true }))
            .rejects.toThrow();
    });

    it("전액 인출(차입 없음) → 5 instruction (obligation 닫힘 → post-refresh 생략)", async () =>
    {
        (Reserve.decode as jest.Mock).mockReturnValue(mockReserveDecoded());
        (Obligation.decode as jest.Mock).mockReturnValue({
            deposits: [{ depositReserve: { toString: () => CBBTC_RES }, depositedAmount: { toString: () => "9996" } }],
            borrows: [],
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx = await buildWithdrawTransaction(withdrawConn() as any, OWNER, { liquidityBase: 0n, withdrawAll: true });
        expect(tx).toBeInstanceOf(VersionedTransaction);
        // refreshReserve+refreshOblig(pre)+farm(pre)+withdraw+farm(post). post-refresh 생략(닫힘)
        expect(tx.message.compiledInstructions).toHaveLength(5);
    });

    it("부분 인출 → 7 instruction (post-refresh 유지)", async () =>
    {
        (Reserve.decode as jest.Mock).mockReturnValue(mockReserveDecoded());
        (Obligation.decode as jest.Mock).mockReturnValue({
            deposits: [{ depositReserve: { toString: () => CBBTC_RES }, depositedAmount: { toString: () => "100000" } }],
            borrows: [],
        });
        // 100 cbBTC liquidity → collateral < depositedCollateral(100000) → 부분 인출, 담보 남음
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx = await buildWithdrawTransaction(withdrawConn() as any, OWNER, { liquidityBase: 100n, withdrawAll: false });
        // refreshReserve+refreshOblig(pre)+farm(pre)+withdraw+farm(post)+refreshReserve+refreshOblig(post)
        expect(tx.message.compiledInstructions).toHaveLength(7);
    });

    it("공급분이 없으면 에러", async () =>
    {
        (Reserve.decode as jest.Mock).mockReturnValue(mockReserveDecoded());
        (Obligation.decode as jest.Mock).mockReturnValue({ deposits: [], borrows: [] });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await expect(buildWithdrawTransaction(withdrawConn() as any, OWNER, { liquidityBase: 0n, withdrawAll: true }))
            .rejects.toThrow();
    });
});

describe("buildBorrowTransaction", () =>
{
    function borrowConn(): unknown
    {
        return {
            getMultipleAccountsInfo: jest.fn()
                .mockResolvedValueOnce([{ data: Buffer.from([9]) }, { data: Buffer.from([1]) }, { data: Buffer.from([2]) }]) // [oblig, cbBTC, USDC]
                .mockResolvedValueOnce([null, { data: Buffer.from([6]) }]), // [usdcAta(없음), cbbtcFarmState(있음)]
            getLatestBlockhash: jest.fn().mockResolvedValue({ blockhash: BLOCKHASH }),
        };
    }

    it("포지션 없으면 에러", async () =>
    {
        const connection = {
            getMultipleAccountsInfo: jest.fn().mockResolvedValueOnce([null, { data: Buffer.from([1]) }, { data: Buffer.from([2]) }]),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await expect(buildBorrowTransaction(connection as any, OWNER, 1_000_000n)).rejects.toThrow();
    });

    it("USDC 차입(ATA 없음) → 8 instruction (farm refresh 없음)", async () =>
    {
        (Reserve.decode as jest.Mock)
            .mockReturnValueOnce(mockReserveDecoded())     // cbBTC
            .mockReturnValueOnce(mockUsdcReserveDecoded()); // USDC
        (Obligation.decode as jest.Mock).mockReturnValue({
            deposits: [{ depositReserve: { toString: () => CBBTC_RES } }],
            borrows: [],
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx = await buildBorrowTransaction(borrowConn() as any, OWNER, 1_000_000n);
        expect(tx).toBeInstanceOf(VersionedTransaction);
        // ata + refreshReserve x2 + refreshOblig(pre) + borrow + refreshReserve x2 + refreshOblig(post)
        expect(tx.message.compiledInstructions).toHaveLength(8);
    });

    it("amount 0 이면 에러", async () =>
    {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await expect(buildBorrowTransaction({} as any, OWNER, 0n)).rejects.toThrow();
    });
});

describe("buildRepayTransaction", () =>
{
    function repayConn(): unknown
    {
        return {
            getMultipleAccountsInfo: jest.fn()
                .mockResolvedValueOnce([{ data: Buffer.from([9]) }, { data: Buffer.from([1]) }, { data: Buffer.from([2]) }]), // [oblig, cbBTC, USDC]
            getLatestBlockhash: jest.fn().mockResolvedValue({ blockhash: BLOCKHASH }),
        };
    }

    it("포지션 없으면 에러", async () =>
    {
        const connection = { getMultipleAccountsInfo: jest.fn().mockResolvedValueOnce([null, { data: Buffer.from([1]) }, { data: Buffer.from([2]) }]) };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await expect(buildRepayTransaction(connection as any, OWNER, { usdcAmountBase: 0n, repayAll: true })).rejects.toThrow();
    });

    it("전체 상환(repayAll) → 7 instruction", async () =>
    {
        (Reserve.decode as jest.Mock)
            .mockReturnValueOnce(mockReserveDecoded())     // cbBTC
            .mockReturnValueOnce(mockUsdcReserveDecoded()); // USDC
        (Obligation.decode as jest.Mock).mockReturnValue({
            deposits: [{ depositReserve: { toString: () => CBBTC_RES } }],
            borrows: [{ borrowReserve: { toString: () => RES_B } }], // USDC reserve
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx = await buildRepayTransaction(repayConn() as any, OWNER, { usdcAmountBase: 0n, repayAll: true });
        // refreshReserve x2 + refreshOblig(pre) + repay + refreshReserve x2 + refreshOblig(post)
        expect(tx.message.compiledInstructions).toHaveLength(7);
    });

    it("부분 상환 amount 0 이면 에러", async () =>
    {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await expect(buildRepayTransaction({} as any, OWNER, { usdcAmountBase: 0n, repayAll: false })).rejects.toThrow();
    });
});
