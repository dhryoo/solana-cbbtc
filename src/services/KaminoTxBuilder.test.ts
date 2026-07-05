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

import { scopeOracleFromReserve, collectObligationReserves, reservesAfterWithdraw, findBorrowedAmountSf, isFullRepay, buildSupplyTransaction, buildWithdrawTransaction, buildBorrowTransaction, buildRepayTransaction } from "./KaminoTxBuilder";

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

describe("reservesAfterWithdraw", () =>
{
    const A = new PublicKey(RES_A);
    const B = new PublicKey(RES_B);

    it("담보가 남으면 currentReserves 를 그대로 유지 (혼합 obligation 의 다른 담보 보존)", () =>
    {
        const current = [A, B]; // A = 인출 reserve, B = 다른 담보
        const result = reservesAfterWithdraw(current, A, [], true).map((p) => p.toBase58());
        expect(result).toEqual([RES_A, RES_B]);
    });

    it("전액 인출이면 해당 reserve 만 제거하고 나머지 담보는 유지", () =>
    {
        const current = [A, B];
        const result = reservesAfterWithdraw(current, A, [], false).map((p) => p.toBase58());
        expect(result).toEqual([RES_B]);
    });

    it("전액 인출이라도 그 reserve 가 차입에도 쓰이면 유지 (방어적)", () =>
    {
        const current = [A, B];
        const result = reservesAfterWithdraw(current, A, [A], false).map((p) => p.toBase58());
        expect(result).toEqual([RES_A, RES_B]);
    });

    it("단일 담보 전액 인출 → 빈 배열 (obligation 닫힘)", () =>
    {
        expect(reservesAfterWithdraw([A], A, [], false)).toEqual([]);
    });
});

describe("findBorrowedAmountSf / isFullRepay", () =>
{
    const USDC = new PublicKey(RES_B);

    it("일치하는 borrow 의 borrowedAmountSf 를 bigint 로 반환", () =>
    {
        const ob = { borrows: [{ borrowReserve: bn(RES_B), borrowedAmountSf: bn("1152921504606846976000") }] };
        expect(findBorrowedAmountSf(ob, USDC)).toBe(1152921504606846976000n);
    });

    it("borrow 가 없거나 필드 누락이면 0n", () =>
    {
        expect(findBorrowedAmountSf({ borrows: [] }, USDC)).toBe(0n);
        expect(findBorrowedAmountSf({ borrows: [{ borrowReserve: bn(RES_B) }] }, USDC)).toBe(0n);
        expect(findBorrowedAmountSf(null, USDC)).toBe(0n);
    });

    it("repayAll 이면 스냅샷과 무관하게 full", () =>
    {
        expect(isFullRepay(true, 0n, 0n)).toBe(true);
    });

    it("입력이 스냅샷 부채(base) 이상이면 full", () =>
    {
        expect(isFullRepay(false, 1000n, 1000n)).toBe(true);
        expect(isFullRepay(false, 1001n, 1000n)).toBe(true);
    });

    it("입력이 스냅샷 부채 미만이면 partial", () =>
    {
        expect(isFullRepay(false, 999n, 1000n)).toBe(false);
    });

    it("부채가 0 이면(차입 없음) partial 로 취급 (0>=0 오탐 방지)", () =>
    {
        expect(isFullRepay(false, 500n, 0n)).toBe(false);
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

    it("혼합 obligation(다른 담보 존재) 부분 인출 → post-refresh 가 다른 담보 reserve 를 보존", async () =>
    {
        (Reserve.decode as jest.Mock).mockReturnValue(mockReserveDecoded());
        // cbBTC 예치 + 사용자가 Kamino 웹에서 예치한 다른 담보(RES_B). 차입 없음.
        (Obligation.decode as jest.Mock).mockReturnValue({
            deposits: [
                { depositReserve: { toString: () => CBBTC_RES }, depositedAmount: { toString: () => "100000" } },
                { depositReserve: { toString: () => RES_B }, depositedAmount: { toString: () => "5000" } },
            ],
            borrows: [],
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx = await buildWithdrawTransaction(withdrawConn() as any, OWNER, { liquidityBase: 100n, withdrawAll: false });
        // 마지막 instruction = post refreshObligation. base 2 계정(lendingMarket, obligation) + reserve 목록.
        // 버그(=[reserve] 재구성)면 3, 수정(=currentReserves 보존)이면 4.
        const post = tx.message.compiledInstructions.at(-1);
        expect(post?.accountKeyIndexes).toHaveLength(4);
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

    it("부분 상환 금액이 실제 부채 이상이면 USDC reserve 를 post-refresh 에서 제거 (6006 방지)", async () =>
    {
        (Reserve.decode as jest.Mock)
            .mockReturnValueOnce(mockReserveDecoded())     // cbBTC
            .mockReturnValueOnce(mockUsdcReserveDecoded()); // USDC
        // 부채 스냅샷 = 1000 * 2^60 → >>60 = 1000 (base). USDC_RESERVE(=RES_B) 로 차입.
        (Obligation.decode as jest.Mock).mockReturnValue({
            deposits: [{ depositReserve: { toString: () => CBBTC_RES } }],
            borrows: [{ borrowReserve: { toString: () => RES_B }, borrowedAmountSf: { toString: () => "1152921504606846976000" } }],
        });
        // repayAll=false 이지만 입력(1000)이 부채(1000) 이상 → full 로 처리돼야 함.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx = await buildRepayTransaction(repayConn() as any, OWNER, { usdcAmountBase: 1000n, repayAll: false });
        // 마지막 = post refreshObligation. USDC 가 빠지면 base 2 + [cbBTC] = 3, 안 빠지면 4(버그 → 6006).
        const post = tx.message.compiledInstructions.at(-1);
        expect(post?.accountKeyIndexes).toHaveLength(3);
    });

    it("부분 상환 금액이 부채 미만이면 USDC reserve 를 유지", async () =>
    {
        (Reserve.decode as jest.Mock)
            .mockReturnValueOnce(mockReserveDecoded())
            .mockReturnValueOnce(mockUsdcReserveDecoded());
        (Obligation.decode as jest.Mock).mockReturnValue({
            deposits: [{ depositReserve: { toString: () => CBBTC_RES } }],
            borrows: [{ borrowReserve: { toString: () => RES_B }, borrowedAmountSf: { toString: () => "1152921504606846976000" } }],
        });
        // 입력(400) < 부채(1000) → partial → USDC 유지.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx = await buildRepayTransaction(repayConn() as any, OWNER, { usdcAmountBase: 400n, repayAll: false });
        const post = tx.message.compiledInstructions.at(-1);
        expect(post?.accountKeyIndexes).toHaveLength(4);
    });
});
