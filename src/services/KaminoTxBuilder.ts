import {
    Connection,
    PublicKey,
    SystemProgram,
    SYSVAR_INSTRUCTIONS_PUBKEY,
    SYSVAR_RENT_PUBKEY,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction,
} from "@solana/web3.js";
import {
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddressSync,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { address, none, some, type Address, type TransactionSigner } from "@solana/kit";
import BN from "bn.js";

// Kamino codegen instruction builders (저수준 — high-level classes/ 는 RN 번들 불가, M9 GATE)
import { depositReserveLiquidityAndObligationCollateral } from "@kamino-finance/klend-sdk/dist/@codegen/klend/instructions/depositReserveLiquidityAndObligationCollateral";
import { withdrawObligationCollateralAndRedeemReserveCollateral } from "@kamino-finance/klend-sdk/dist/@codegen/klend/instructions/withdrawObligationCollateralAndRedeemReserveCollateral";
import { borrowObligationLiquidity } from "@kamino-finance/klend-sdk/dist/@codegen/klend/instructions/borrowObligationLiquidity";
import { repayObligationLiquidity } from "@kamino-finance/klend-sdk/dist/@codegen/klend/instructions/repayObligationLiquidity";
import { refreshReserve } from "@kamino-finance/klend-sdk/dist/@codegen/klend/instructions/refreshReserve";
import { refreshObligation } from "@kamino-finance/klend-sdk/dist/@codegen/klend/instructions/refreshObligation";
import { refreshObligationFarmsForReserve } from "@kamino-finance/klend-sdk/dist/@codegen/klend/instructions/refreshObligationFarmsForReserve";
import { initObligationFarmsForReserve } from "@kamino-finance/klend-sdk/dist/@codegen/klend/instructions/initObligationFarmsForReserve";
import { initObligation } from "@kamino-finance/klend-sdk/dist/@codegen/klend/instructions/initObligation";
import { initUserMetadata } from "@kamino-finance/klend-sdk/dist/@codegen/klend/instructions/initUserMetadata";
import { Reserve } from "@kamino-finance/klend-sdk/dist/@codegen/klend/accounts/Reserve";
import { Obligation } from "@kamino-finance/klend-sdk/dist/@codegen/klend/accounts/Obligation";

import { cbbtcReservePubkey, farmsProgramPubkey, kaminoMainMarketPubkey, usdcReservePubkey } from "@/constants/lending";
import { kitInstructionToWeb3, type KitInstruction } from "@/utils/kitToWeb3";
import { collateralFromLiquidity } from "@/utils/kaminoExchange";

import { deriveObligationPda } from "./KaminoService";
import { lendingMarketAuthority, obligationFarmUserState, userMetadata } from "./kaminoAccounts";

// farm refresh/init 의 mode: 0 = Collateral(예치), 1 = Debt(차입)
const FARM_MODE_COLLATERAL = 0;

const DEFAULT_PUBKEY = PublicKey.default.toBase58(); // "111...1"

interface AddrLike { toString(): string; }

// codegen 디코드 결과의 구조적 타입 — 이 빌더가 실제로 읽는 필드만. 런타임엔 .toString() 만
// 사용하므로 값은 AddrLike 로 충분(kit Address/BN 모두 만족). `as any` 대신 `as unknown as X`.
interface DecodedReserve
{
    liquidity: {
        mintPubkey: AddrLike;
        tokenProgram: AddrLike;
        supplyVault: AddrLike;
        feeVault: AddrLike;
        availableAmount: AddrLike;
        borrowedAmountSf: AddrLike;
    };
    collateral: {
        mintPubkey: AddrLike;
        supplyVault: AddrLike;
        mintTotalSupply: AddrLike;
    };
    farmCollateral: AddrLike;
    config: { tokenInfo: { scopeConfiguration: { priceFeed: AddrLike } } };
}

interface DecodedObligation
{
    deposits: { depositReserve: AddrLike; depositedAmount: AddrLike }[];
    borrows: { borrowReserve: AddrLike; borrowedAmountSf: AddrLike }[];
}

// --- 순수 헬퍼 (테스트 대상) ---

/** reserve config 의 scope 오라클 priceFeed. 미설정(default)이면 null. */
export function scopeOracleFromReserve(
    reserve: { config: { tokenInfo: { scopeConfiguration: { priceFeed: AddrLike } } } },
): PublicKey | null
{
    const feed = reserve.config.tokenInfo.scopeConfiguration.priceFeed.toString();
    return feed === DEFAULT_PUBKEY ? null : new PublicKey(feed);
}

/** obligation 의 deposit/borrow reserve 들 (default 제외, 중복 제거). null 이면 빈 배열. */
export function collectObligationReserves(
    obligation: { deposits: { depositReserve: AddrLike }[]; borrows: { borrowReserve: AddrLike }[] } | null,
): PublicKey[]
{
    if (!obligation)
    {
        return [];
    }
    const seen = new Set<string>();
    const out: PublicKey[] = [];
    const add = (s: string): void =>
    {
        if (s !== DEFAULT_PUBKEY && !seen.has(s))
        {
            seen.add(s);
            out.push(new PublicKey(s));
        }
    };
    for (const d of obligation.deposits)
    {
        add(d.depositReserve.toString());
    }
    for (const b of obligation.borrows)
    {
        add(b.borrowReserve.toString());
    }
    return out;
}

/**
 * 인출 후 obligation 에 남는 reserve 목록. post refreshObligation 의 remaining accounts 는
 * 인출 뒤 on-chain obligation 이 실제로 보유할 reserve 와 정확히 일치해야 한다(불일치 시 6006).
 * cbBTC 외 다른 담보(사용자가 Kamino 웹에서 예치)가 있어도 유지해야 하므로 currentReserves 에서
 * 파생한다. 담보가 남으면 전부 유지, 전액 인출이면 해당 reserve 만 제거(단 차입에도 쓰이면 유지 — 방어적).
 */
export function reservesAfterWithdraw(
    currentReserves: PublicKey[],
    withdrawReserve: PublicKey,
    borrowReserves: PublicKey[],
    collateralRemains: boolean,
): PublicKey[]
{
    if (collateralRemains)
    {
        return currentReserves;
    }
    return currentReserves.filter(
        (r) => !r.equals(withdrawReserve) || borrowReserves.some((b) => b.equals(r)),
    );
}

/** obligation 의 특정 reserve 차입 스냅샷(borrowedAmountSf, scaled fraction). 없으면 0n. */
export function findBorrowedAmountSf(
    obligation: { borrows?: { borrowReserve: AddrLike; borrowedAmountSf?: AddrLike }[] } | null,
    reserve: PublicKey,
): bigint
{
    const target = reserve.toBase58();
    const hit = (obligation?.borrows ?? []).find((b) => b.borrowReserve.toString() === target);
    return hit && hit.borrowedAmountSf != null ? BigInt(hit.borrowedAmountSf.toString()) : 0n;
}

/**
 * 상환이 부채를 전부 청산하는지. repayAll 이거나, 입력이 현재 부채 스냅샷(base) 이상이면 true.
 * klend 는 repay 를 min(amount, debt) 로 클램프한 뒤 amount>=debt 면 borrow 를 제거하므로,
 * 이 경우 post refreshObligation 에서 해당 reserve 를 빼고 U64_MAX 로 정산해야 6006 을 피한다.
 * 스냅샷은 마지막 refresh 시점 값이라 실제 부채의 하한(이자만큼 더 클 수 있음)이지만, full 로 판정되면
 * liquidityAmount 를 U64_MAX 로 함께 전환하므로 온체인이 정확한 실부채까지 정산 → 일관성 유지.
 */
export function isFullRepay(repayAll: boolean, usdcAmountBase: bigint, borrowedBaseSnapshot: bigint): boolean
{
    return repayAll || (borrowedBaseSnapshot > 0n && usdcAmountBase >= borrowedBaseSnapshot);
}

// --- supply 트랜잭션 빌드 ---

// codegen builder 는 kit 의 branded Address / TransactionSigner 타입을 받지만, 런타임에는
// signer 의 .address(문자열)만 읽고 서명은 MWA 가 수행한다. 타입만 맞춰 캐스팅.
function addr(pk: PublicKey): Address
{
    return address(pk.toBase58());
}

function signerArg(owner: PublicKey): TransactionSigner
{
    return { address: addr(owner) } as unknown as TransactionSigner;
}

/**
 * cbBTC 공급(예치) 트랜잭션 빌드. 신규 사용자면 initUserMetadata + initObligation 선행.
 * 반환: 미서명 VersionedTransaction (호출부에서 MWA 로 서명·전송).
 *
 * ⚠️ 서명·전송 전 반드시 connection.simulateTransaction 으로 검증할 것 (실자금 보호).
 */
export async function buildSupplyTransaction(
    connection: Connection,
    owner: PublicKey,
    amountBase: bigint,
): Promise<VersionedTransaction>
{
    if (amountBase <= 0n)
    {
        throw new Error("amountBase must be > 0");
    }

    const market = kaminoMainMarketPubkey();
    const reserve = cbbtcReservePubkey();
    const obligation = deriveObligationPda(owner);
    const userMeta = userMetadata(owner);
    const authority = lendingMarketAuthority(market);

    const [obligationAcc, userMetaAcc, reserveAcc] = await connection.getMultipleAccountsInfo([
        obligation,
        userMeta,
        reserve,
    ]);
    if (!reserveAcc)
    {
        throw new Error("Kamino cbBTC reserve account not found");
    }
    const reserveDecoded = Reserve.decode(reserveAcc.data) as unknown as DecodedReserve;
    const cbbtcMint = new PublicKey(reserveDecoded.liquidity.mintPubkey.toString());
    const liqTokenProgram = new PublicKey(reserveDecoded.liquidity.tokenProgram.toString());
    const scopeOracle = scopeOracleFromReserve(reserveDecoded);
    // vault 들은 PDA 유도가 아니라 reserve state 에 저장된 실제 계정을 써야 한다
    // (SDK 도 reserve.state.liquidity.supplyVault 등을 사용. PDA 유도값과 다를 수 있어 3012 발생).
    const liqSupply = new PublicKey(reserveDecoded.liquidity.supplyVault.toString());
    const collMint = new PublicKey(reserveDecoded.collateral.mintPubkey.toString());
    const collSupply = new PublicKey(reserveDecoded.collateral.supplyVault.toString());

    // reserve 에 collateral farm 이 붙어 있으면 deposit 시 farm refresh(+신규면 init)가 필수.
    const farmStr = reserveDecoded.farmCollateral.toString();
    const farm = farmStr === DEFAULT_PUBKEY ? null : new PublicKey(farmStr);
    const farmUserState = farm ? obligationFarmUserState(farm, obligation) : null;

    const userAta = getAssociatedTokenAddressSync(cbbtcMint, owner, true, liqTokenProgram);
    const [userAtaAcc, farmUserStateAcc] = await connection.getMultipleAccountsInfo(
        farmUserState ? [userAta, farmUserState] : [userAta],
    );

    const rent = address(SYSVAR_RENT_PUBKEY.toBase58());
    const systemProgram = address(SystemProgram.programId.toBase58());
    const defaultAddr = address(DEFAULT_PUBKEY);
    const farmsProgram = address(farmsProgramPubkey().toBase58());
    const o = signerArg(owner);
    const ixs: TransactionInstruction[] = [];

    // farm refresh instruction (mode=collateral). pre/post deposit 에 동일하게 사용.
    const buildFarmRefreshIx = (): TransactionInstruction => kitInstructionToWeb3(refreshObligationFarmsForReserve(
        { mode: FARM_MODE_COLLATERAL },
        {
            crank: o,
            baseAccounts: {
                obligation: addr(obligation),
                lendingMarketAuthority: addr(authority),
                reserve: addr(reserve),
                reserveFarmState: addr(farm!),
                obligationFarmUserState: addr(farmUserState!),
                lendingMarket: addr(market),
            },
            farmsProgram,
            rent,
            systemProgram,
        },
    ) as KitInstruction);

    const buildRefreshReserveIx = (): TransactionInstruction => kitInstructionToWeb3(refreshReserve({
        reserve: addr(reserve),
        lendingMarket: addr(market),
        pythOracle: none(),
        switchboardPriceOracle: none(),
        switchboardTwapOracle: none(),
        scopePrices: scopeOracle ? some(addr(scopeOracle)) : none(),
    }) as KitInstruction);

    // refreshObligation — remaining accounts = 넘긴 reserve 들(WRITABLE). on-chain 의
    // 현재 보유 reserve 수와 일치해야 함 (불일치 시 6006).
    const buildRefreshObligationIx = (reserveList: PublicKey[]): TransactionInstruction =>
    {
        const base = refreshObligation({
            lendingMarket: addr(market),
            obligation: addr(obligation),
        }) as unknown as KitInstruction;
        return kitInstructionToWeb3({
            ...base,
            accounts: [
                ...(base.accounts ?? []),
                ...reserveList.map((r) => ({ address: r.toBase58(), role: 1 })),
            ],
        });
    };

    // 현재 보유 reserve(예치 전) / 예치 후 보유 reserve.
    const currentReserves = collectObligationReserves(obligationAcc ? (Obligation.decode(obligationAcc.data) as unknown as DecodedObligation) : null);
    const afterReserves = currentReserves.some((r) => r.equals(reserve))
        ? currentReserves
        : [...currentReserves, reserve];

    // 1. 신규 사용자: userMetadata (LUT 없이 default)
    if (!userMetaAcc)
    {
        ixs.push(kitInstructionToWeb3(initUserMetadata(
            { userLookupTable: defaultAddr },
            {
                owner: o,
                feePayer: o,
                userMetadata: addr(userMeta),
                referrerUserMetadata: none(),
                rent,
                systemProgram,
            },
        ) as KitInstruction));
    }

    // 2. 신규 obligation
    if (!obligationAcc)
    {
        ixs.push(kitInstructionToWeb3(initObligation(
            { args: { tag: 0, id: 0 } },
            {
                obligationOwner: o,
                feePayer: o,
                obligation: addr(obligation),
                lendingMarket: addr(market),
                seed1Account: defaultAddr,
                seed2Account: defaultAddr,
                ownerUserMetadata: addr(userMeta),
                rent,
                systemProgram,
            },
        ) as KitInstruction));
    }

    // 3. farm user state 신규면 init (refresh 전에 존재해야 함)
    if (farm && farmUserState && !farmUserStateAcc)
    {
        ixs.push(kitInstructionToWeb3(initObligationFarmsForReserve(
            { mode: FARM_MODE_COLLATERAL },
            {
                payer: o,
                owner: addr(owner),
                obligation: addr(obligation),
                lendingMarketAuthority: addr(authority),
                reserve: addr(reserve),
                reserveFarmState: addr(farm),
                obligationFarm: addr(farmUserState),
                lendingMarket: addr(market),
                farmsProgram,
                rent,
                systemProgram,
            },
        ) as KitInstruction));
    }

    // 4. cbBTC ATA 없으면 생성
    if (!userAtaAcc)
    {
        ixs.push(createAssociatedTokenAccountInstruction(owner, userAta, owner, cbbtcMint, liqTokenProgram));
    }

    // 4. refreshReserve + refreshObligation (예치 전 — 현재 보유 reserve 기준)
    ixs.push(buildRefreshReserveIx());
    ixs.push(buildRefreshObligationIx(currentReserves));

    // 5. farm refresh (deposit 직전 — on-chain check_refresh 가 요구)
    if (farm)
    {
        ixs.push(buildFarmRefreshIx());
    }

    // 6. deposit
    ixs.push(kitInstructionToWeb3(depositReserveLiquidityAndObligationCollateral(
        { liquidityAmount: new BN(amountBase.toString()) },
        {
            owner: o,
            obligation: addr(obligation),
            lendingMarket: addr(market),
            lendingMarketAuthority: addr(authority),
            reserve: addr(reserve),
            reserveLiquidityMint: addr(cbbtcMint),
            reserveLiquiditySupply: addr(liqSupply),
            reserveCollateralMint: addr(collMint),
            reserveDestinationDepositCollateral: addr(collSupply),
            userSourceLiquidity: addr(userAta),
            placeholderUserDestinationCollateral: none(),
            collateralTokenProgram: addr(TOKEN_PROGRAM_ID),
            liquidityTokenProgram: addr(liqTokenProgram),
            instructionSysvarAccount: addr(SYSVAR_INSTRUCTIONS_PUBKEY),
        },
    ) as KitInstruction));

    // 7. farm refresh (deposit 직후 — 새 담보를 farm 회계에 반영)
    if (farm)
    {
        ixs.push(buildFarmRefreshIx());
    }

    // 8. refreshReserve + refreshObligation (deposit 후 — obligation 집계값 즉시 갱신).
    // 이게 없으면 depositedValueSf 가 stale(0) 로 남아 포지션이 비어 보인다.
    ixs.push(buildRefreshReserveIx());
    ixs.push(buildRefreshObligationIx(afterReserves));

    const { blockhash } = await connection.getLatestBlockhash();
    const message = new TransactionMessage({
        payerKey: owner,
        recentBlockhash: blockhash,
        instructions: ixs,
    }).compileToV0Message();
    return new VersionedTransaction(message);
}

// --- withdraw 트랜잭션 빌드 ---

export interface WithdrawOpts
{
    liquidityBase: bigint; // 인출하려는 cbBTC (base). withdrawAll 이면 무시.
    withdrawAll: boolean;
}

/**
 * cbBTC 인출 트랜잭션 빌드. 사용자는 cbBTC(liquidity)로 지정하지만 on-chain instruction 은
 * collateral(cToken) 단위라 환율로 변환한다. withdrawAll 이면 보유 collateral 전량.
 * 반환: 미서명 VersionedTransaction (서명·전송 전 simulate 필수).
 */
export async function buildWithdrawTransaction(
    connection: Connection,
    owner: PublicKey,
    opts: WithdrawOpts,
): Promise<VersionedTransaction>
{
    const market = kaminoMainMarketPubkey();
    const reserve = cbbtcReservePubkey();
    const obligation = deriveObligationPda(owner);
    const authority = lendingMarketAuthority(market);

    const [obligationAcc, reserveAcc] = await connection.getMultipleAccountsInfo([obligation, reserve]);
    if (!reserveAcc)
    {
        throw new Error("Kamino cbBTC reserve account not found");
    }
    if (!obligationAcc)
    {
        throw new Error("No Kamino position to withdraw");
    }
    const reserveDecoded = Reserve.decode(reserveAcc.data) as unknown as DecodedReserve;
    const obligationDecoded = Obligation.decode(obligationAcc.data) as unknown as DecodedObligation;

    const cbbtcMint = new PublicKey(reserveDecoded.liquidity.mintPubkey.toString());
    const liqTokenProgram = new PublicKey(reserveDecoded.liquidity.tokenProgram.toString());
    const scopeOracle = scopeOracleFromReserve(reserveDecoded);
    const liqSupply = new PublicKey(reserveDecoded.liquidity.supplyVault.toString());
    const collMint = new PublicKey(reserveDecoded.collateral.mintPubkey.toString());
    const collSupply = new PublicKey(reserveDecoded.collateral.supplyVault.toString());

    // 환율 입력: totalLiquidity = available + borrowed(Sf>>60), cTokenSupply = collateral.mintTotalSupply
    const available = BigInt(reserveDecoded.liquidity.availableAmount.toString());
    const borrowedSf = BigInt(reserveDecoded.liquidity.borrowedAmountSf.toString());
    const totalLiquidity = available + (borrowedSf >> 60n);
    const cTokenSupply = BigInt(reserveDecoded.collateral.mintTotalSupply.toString());

    // 보유 collateral (cbBTC deposit)
    const reserveStr = reserve.toBase58();
    const deposit = (obligationDecoded.deposits ?? []).find((d) => d.depositReserve.toString() === reserveStr);
    const depositedCollateral = deposit ? BigInt(deposit.depositedAmount.toString()) : 0n;
    if (depositedCollateral <= 0n)
    {
        throw new Error("No cbBTC supplied to withdraw");
    }

    let collateralAmount: bigint;
    if (opts.withdrawAll)
    {
        collateralAmount = depositedCollateral;
    }
    else
    {
        const req = collateralFromLiquidity(opts.liquidityBase, totalLiquidity, cTokenSupply);
        collateralAmount = req > depositedCollateral ? depositedCollateral : req;
    }
    if (collateralAmount <= 0n)
    {
        throw new Error("withdraw amount too small");
    }
    const afterCollateral = depositedCollateral - collateralAmount;

    // farm
    const farmStr = reserveDecoded.farmCollateral.toString();
    const farm = farmStr === DEFAULT_PUBKEY ? null : new PublicKey(farmStr);
    const farmUserState = farm ? obligationFarmUserState(farm, obligation) : null;

    const userAta = getAssociatedTokenAddressSync(cbbtcMint, owner, true, liqTokenProgram);
    const probe = await connection.getMultipleAccountsInfo(
        farmUserState ? [userAta, farmUserState] : [userAta],
    );
    const userAtaAcc = probe[0];
    const farmUserStateAcc = farmUserState ? probe[1] : null;

    const rent = address(SYSVAR_RENT_PUBKEY.toBase58());
    const systemProgram = address(SystemProgram.programId.toBase58());
    const farmsProgram = address(farmsProgramPubkey().toBase58());
    const o = signerArg(owner);
    const ixs: TransactionInstruction[] = [];

    const farmRefreshIx = (): TransactionInstruction => kitInstructionToWeb3(refreshObligationFarmsForReserve(
        { mode: FARM_MODE_COLLATERAL },
        {
            crank: o,
            baseAccounts: {
                obligation: addr(obligation),
                lendingMarketAuthority: addr(authority),
                reserve: addr(reserve),
                reserveFarmState: addr(farm!),
                obligationFarmUserState: addr(farmUserState!),
                lendingMarket: addr(market),
            },
            farmsProgram,
            rent,
            systemProgram,
        },
    ) as KitInstruction);

    const refreshReserveIx = (): TransactionInstruction => kitInstructionToWeb3(refreshReserve({
        reserve: addr(reserve),
        lendingMarket: addr(market),
        pythOracle: none(),
        switchboardPriceOracle: none(),
        switchboardTwapOracle: none(),
        scopePrices: scopeOracle ? some(addr(scopeOracle)) : none(),
    }) as KitInstruction);

    const refreshObligationIx = (reserveList: PublicKey[]): TransactionInstruction =>
    {
        const base = refreshObligation({
            lendingMarket: addr(market),
            obligation: addr(obligation),
        }) as unknown as KitInstruction;
        return kitInstructionToWeb3({
            ...base,
            accounts: [
                ...(base.accounts ?? []),
                ...reserveList.map((r) => ({ address: r.toBase58(), role: 1 })),
            ],
        });
    };

    const currentReserves = collectObligationReserves(obligationDecoded);
    // 인출 후에도 남는 reserve = (담보가 남으면 cbBTC) + 차입 reserve(인출은 차입을 안 건드림).
    const borrowReserves: PublicKey[] = (obligationDecoded.borrows ?? [])
        .map((b) => b.borrowReserve.toString())
        .filter((s: string) => s !== DEFAULT_PUBKEY)
        .map((s: string) => new PublicKey(s));
    // 인출 후 남는 reserve 는 currentReserves 에서 파생한다(cbBTC 외 다른 담보 보존 — 이전엔
    // [reserve] 로 재구성해 혼합 obligation 의 다른 예치를 누락, 6006 으로 인출 자체가 실패했음).
    const postReserves = reservesAfterWithdraw(currentReserves, reserve, borrowReserves, afterCollateral > 0n);
    // 남는 reserve 가 0 → obligation 이 닫힘(rent 반환, owner→System). 그러면 post refreshObligation 이
    // 3007(AccountOwnedByWrongProgram) 로 실패하므로 post-refresh 를 생략한다.
    const willClose = postReserves.length === 0;

    // farm user state 가 없으면(드묾) 먼저 init
    if (farm && farmUserState && !farmUserStateAcc)
    {
        ixs.push(kitInstructionToWeb3(initObligationFarmsForReserve(
            { mode: FARM_MODE_COLLATERAL },
            {
                payer: o,
                owner: addr(owner),
                obligation: addr(obligation),
                lendingMarketAuthority: addr(authority),
                reserve: addr(reserve),
                reserveFarmState: addr(farm),
                obligationFarm: addr(farmUserState),
                lendingMarket: addr(market),
                farmsProgram,
                rent,
                systemProgram,
            },
        ) as KitInstruction));
    }
    // 받을 cbBTC ATA 없으면 생성 (보통 존재)
    if (!userAtaAcc)
    {
        ixs.push(createAssociatedTokenAccountInstruction(owner, userAta, owner, cbbtcMint, liqTokenProgram));
    }

    ixs.push(refreshReserveIx());
    ixs.push(refreshObligationIx(currentReserves));
    if (farm)
    {
        ixs.push(farmRefreshIx());
    }

    ixs.push(kitInstructionToWeb3(withdrawObligationCollateralAndRedeemReserveCollateral(
        { collateralAmount: new BN(collateralAmount.toString()) },
        {
            owner: o,
            obligation: addr(obligation),
            lendingMarket: addr(market),
            lendingMarketAuthority: addr(authority),
            withdrawReserve: addr(reserve),
            reserveLiquidityMint: addr(cbbtcMint),
            reserveSourceCollateral: addr(collSupply),
            reserveCollateralMint: addr(collMint),
            reserveLiquiditySupply: addr(liqSupply),
            userDestinationLiquidity: addr(userAta),
            placeholderUserDestinationCollateral: none(),
            collateralTokenProgram: addr(TOKEN_PROGRAM_ID),
            liquidityTokenProgram: addr(liqTokenProgram),
            instructionSysvarAccount: addr(SYSVAR_INSTRUCTIONS_PUBKEY),
        },
    ) as KitInstruction));

    if (farm)
    {
        ixs.push(farmRefreshIx()); // 담보 farm 언스테이크 (닫혀도 안전)
    }
    // obligation 이 닫히는 경우 post refreshObligation 은 닫힌 계정을 건드려 실패 → 생략.
    if (!willClose)
    {
        ixs.push(refreshReserveIx());
        ixs.push(refreshObligationIx(postReserves));
    }

    const { blockhash } = await connection.getLatestBlockhash();
    const message = new TransactionMessage({
        payerKey: owner,
        recentBlockhash: blockhash,
        instructions: ixs,
    }).compileToV0Message();
    return new VersionedTransaction(message);
}

// --- borrow 트랜잭션 빌드 (cbBTC 담보로 USDC 차입) ---

/**
 * cbBTC 담보 obligation 에서 USDC 를 차입. reserve 2개(cbBTC 담보·USDC 차입)를 refresh 하고
 * cbBTC 담보 farm 을 refresh 한 뒤 borrow. obligation 에 cbBTC 담보가 먼저 있어야 함.
 * 반환: 미서명 VersionedTransaction (서명·전송 전 simulate 필수).
 */
export async function buildBorrowTransaction(
    connection: Connection,
    owner: PublicKey,
    usdcAmountBase: bigint,
): Promise<VersionedTransaction>
{
    if (usdcAmountBase <= 0n)
    {
        throw new Error("borrow amount must be > 0");
    }

    const market = kaminoMainMarketPubkey();
    const cbbtcReserve = cbbtcReservePubkey();
    const usdcReserve = usdcReservePubkey();
    const obligation = deriveObligationPda(owner);
    const authority = lendingMarketAuthority(market);

    const [obligationAcc, cbbtcAcc, usdcAcc] = await connection.getMultipleAccountsInfo([
        obligation,
        cbbtcReserve,
        usdcReserve,
    ]);
    if (!obligationAcc)
    {
        throw new Error("No Kamino position — supply cbBTC first");
    }
    if (!cbbtcAcc || !usdcAcc)
    {
        throw new Error("Kamino reserve account not found");
    }
    const cbbtcDec = Reserve.decode(cbbtcAcc.data) as unknown as DecodedReserve;
    const usdcDec = Reserve.decode(usdcAcc.data) as unknown as DecodedReserve;
    const obligationDec = Obligation.decode(obligationAcc.data) as unknown as DecodedObligation;

    const cbbtcScope = scopeOracleFromReserve(cbbtcDec);
    const usdcScope = scopeOracleFromReserve(usdcDec);
    const usdcMint = new PublicKey(usdcDec.liquidity.mintPubkey.toString());
    const usdcTokenProgram = new PublicKey(usdcDec.liquidity.tokenProgram.toString());
    const usdcSupplyVault = new PublicKey(usdcDec.liquidity.supplyVault.toString());
    const usdcFeeVault = new PublicKey(usdcDec.liquidity.feeVault.toString());

    // borrow 는 cbBTC 담보를 건드리지 않으므로 farm refresh 불필요 (USDC 는 debt farm 없음).
    // on-chain check_refresh 가 요구하는 건 RefreshReserve(USDC) + RefreshObligation 뿐.
    const userUsdcAta = getAssociatedTokenAddressSync(usdcMint, owner, true, usdcTokenProgram);
    const [usdcAtaAcc] = await connection.getMultipleAccountsInfo([userUsdcAta]);

    const o = signerArg(owner);
    const ixs: TransactionInstruction[] = [];

    const refreshReserveIx = (reserve: PublicKey, scope: PublicKey | null): TransactionInstruction =>
        kitInstructionToWeb3(refreshReserve({
            reserve: addr(reserve),
            lendingMarket: addr(market),
            pythOracle: none(),
            switchboardPriceOracle: none(),
            switchboardTwapOracle: none(),
            scopePrices: scope ? some(addr(scope)) : none(),
        }) as KitInstruction);

    const refreshObligationIx = (reserveList: PublicKey[]): TransactionInstruction =>
    {
        const base = refreshObligation({
            lendingMarket: addr(market),
            obligation: addr(obligation),
        }) as unknown as KitInstruction;
        return kitInstructionToWeb3({
            ...base,
            accounts: [
                ...(base.accounts ?? []),
                ...reserveList.map((r) => ({ address: r.toBase58(), role: 1 })),
            ],
        });
    };

    const currentReserves = collectObligationReserves(obligationDec); // 보통 [cbBTC]
    const afterReserves = currentReserves.some((r) => r.equals(usdcReserve))
        ? currentReserves
        : [...currentReserves, usdcReserve]; // [cbBTC, USDC]

    // 1. 받을 USDC ATA 없으면 생성
    if (!usdcAtaAcc)
    {
        ixs.push(createAssociatedTokenAccountInstruction(owner, userUsdcAta, owner, usdcMint, usdcTokenProgram));
    }
    // 2. 두 reserve refresh (cbBTC 담보 + USDC 차입)
    ixs.push(refreshReserveIx(cbbtcReserve, cbbtcScope));
    ixs.push(refreshReserveIx(usdcReserve, usdcScope));
    // 3. refreshObligation — borrow 바로 앞이어야 함 (check_refresh: RefreshObligation 이 borrow 직전)
    ixs.push(refreshObligationIx(currentReserves));
    // 4. borrow
    ixs.push(kitInstructionToWeb3(borrowObligationLiquidity(
        { liquidityAmount: new BN(usdcAmountBase.toString()) },
        {
            owner: o,
            obligation: addr(obligation),
            lendingMarket: addr(market),
            lendingMarketAuthority: addr(authority),
            borrowReserve: addr(usdcReserve),
            borrowReserveLiquidityMint: addr(usdcMint),
            reserveSourceLiquidity: addr(usdcSupplyVault),
            borrowReserveLiquidityFeeReceiver: addr(usdcFeeVault),
            userDestinationLiquidity: addr(userUsdcAta),
            referrerTokenState: none(),
            tokenProgram: addr(usdcTokenProgram),
            instructionSysvarAccount: addr(SYSVAR_INSTRUCTIONS_PUBKEY),
        },
    ) as KitInstruction));
    // 5. post: refresh + refreshObligation(after = [cbBTC, USDC]) 로 집계 갱신
    ixs.push(refreshReserveIx(cbbtcReserve, cbbtcScope));
    ixs.push(refreshReserveIx(usdcReserve, usdcScope));
    ixs.push(refreshObligationIx(afterReserves));

    const { blockhash } = await connection.getLatestBlockhash();
    const message = new TransactionMessage({
        payerKey: owner,
        recentBlockhash: blockhash,
        instructions: ixs,
    }).compileToV0Message();
    return new VersionedTransaction(message);
}

// --- repay 트랜잭션 빌드 (USDC 차입 상환) ---

// u64 최대값. repayAll 시 전달하면 on-chain 이 실제 부채까지만 상환(이자 포함 dust 방지).
const U64_MAX = "18446744073709551615";

export interface RepayOpts
{
    usdcAmountBase: bigint; // 부분 상환 시 USDC base. repayAll 이면 무시.
    repayAll: boolean;
}

/**
 * USDC 차입 상환. repayAll 이면 u64::MAX 로 전체 상환(이자 포함 정확). 부분이면 입력 금액.
 * 반환: 미서명 VersionedTransaction (서명·전송 전 simulate 필수).
 */
export async function buildRepayTransaction(
    connection: Connection,
    owner: PublicKey,
    opts: RepayOpts,
): Promise<VersionedTransaction>
{
    if (!opts.repayAll && opts.usdcAmountBase <= 0n)
    {
        throw new Error("repay amount must be > 0");
    }

    const market = kaminoMainMarketPubkey();
    const cbbtcReserve = cbbtcReservePubkey();
    const usdcReserve = usdcReservePubkey();
    const obligation = deriveObligationPda(owner);

    const [obligationAcc, cbbtcAcc, usdcAcc] = await connection.getMultipleAccountsInfo([
        obligation,
        cbbtcReserve,
        usdcReserve,
    ]);
    if (!obligationAcc)
    {
        throw new Error("No Kamino position to repay");
    }
    if (!cbbtcAcc || !usdcAcc)
    {
        throw new Error("Kamino reserve account not found");
    }
    const cbbtcDec = Reserve.decode(cbbtcAcc.data) as unknown as DecodedReserve;
    const usdcDec = Reserve.decode(usdcAcc.data) as unknown as DecodedReserve;
    const obligationDec = Obligation.decode(obligationAcc.data) as unknown as DecodedObligation;

    const cbbtcScope = scopeOracleFromReserve(cbbtcDec);
    const usdcScope = scopeOracleFromReserve(usdcDec);
    const usdcMint = new PublicKey(usdcDec.liquidity.mintPubkey.toString());
    const usdcTokenProgram = new PublicKey(usdcDec.liquidity.tokenProgram.toString());
    const usdcSupplyVault = new PublicKey(usdcDec.liquidity.supplyVault.toString());

    const userUsdcAta = getAssociatedTokenAddressSync(usdcMint, owner, true, usdcTokenProgram);
    const o = signerArg(owner);
    const ixs: TransactionInstruction[] = [];

    const refreshReserveIx = (reserve: PublicKey, scope: PublicKey | null): TransactionInstruction =>
        kitInstructionToWeb3(refreshReserve({
            reserve: addr(reserve),
            lendingMarket: addr(market),
            pythOracle: none(),
            switchboardPriceOracle: none(),
            switchboardTwapOracle: none(),
            scopePrices: scope ? some(addr(scope)) : none(),
        }) as KitInstruction);

    const refreshObligationIx = (reserveList: PublicKey[]): TransactionInstruction =>
    {
        const base = refreshObligation({
            lendingMarket: addr(market),
            obligation: addr(obligation),
        }) as unknown as KitInstruction;
        return kitInstructionToWeb3({
            ...base,
            accounts: [
                ...(base.accounts ?? []),
                ...reserveList.map((r) => ({ address: r.toBase58(), role: 1 })),
            ],
        });
    };

    const currentReserves = collectObligationReserves(obligationDec); // [cbBTC, USDC]
    // 입력 금액이 현재 USDC 부채(스냅샷) 이상이면 klend 가 전액 정산 후 borrow 를 제거하므로,
    // repayAll 을 명시하지 않았어도 post refresh 에서 USDC 를 빼고 U64_MAX 로 정산해야 6006 을 피한다.
    const usdcSnapshotBase = findBorrowedAmountSf(obligationDec, usdcReserve) >> 60n;
    const fullRepay = isFullRepay(opts.repayAll, opts.usdcAmountBase, usdcSnapshotBase);
    const afterReserves = fullRepay
        ? currentReserves.filter((r) => !r.equals(usdcReserve))
        : currentReserves;

    const liquidityAmount = fullRepay ? new BN(U64_MAX) : new BN(opts.usdcAmountBase.toString());

    // 1. refresh (cbBTC 담보 + USDC 차입)
    ixs.push(refreshReserveIx(cbbtcReserve, cbbtcScope));
    ixs.push(refreshReserveIx(usdcReserve, usdcScope));
    // 2. refreshObligation — repay 직전
    ixs.push(refreshObligationIx(currentReserves));
    // 3. repay
    ixs.push(kitInstructionToWeb3(repayObligationLiquidity(
        { liquidityAmount },
        {
            owner: o,
            obligation: addr(obligation),
            lendingMarket: addr(market),
            repayReserve: addr(usdcReserve),
            reserveLiquidityMint: addr(usdcMint),
            reserveDestinationLiquidity: addr(usdcSupplyVault),
            userSourceLiquidity: addr(userUsdcAta),
            tokenProgram: addr(usdcTokenProgram),
            instructionSysvarAccount: addr(SYSVAR_INSTRUCTIONS_PUBKEY),
        },
    ) as KitInstruction));
    // 4. post refresh
    ixs.push(refreshReserveIx(cbbtcReserve, cbbtcScope));
    ixs.push(refreshReserveIx(usdcReserve, usdcScope));
    ixs.push(refreshObligationIx(afterReserves));

    const { blockhash } = await connection.getLatestBlockhash();
    const message = new TransactionMessage({
        payerKey: owner,
        recentBlockhash: blockhash,
        instructions: ixs,
    }).compileToV0Message();
    return new VersionedTransaction(message);
}
