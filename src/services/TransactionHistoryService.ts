import { Connection, PublicKey } from "@solana/web3.js";

import { KLEND_PROGRAM_ID } from "@/constants/lending";
import { CBBTC, USDC } from "@/constants/tokens";

// Jupiter v6 program (mainnet aggregator). 우리 swap 화면은 v6 만 호출.
export const JUPITER_V6_PROGRAM_ID = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";

export type TxHistoryKind =
    | "swap"
    | "supply"      // cbBTC → Kamino (담보 예치)
    | "withdraw"    // Kamino → cbBTC (담보 인출)
    | "borrow"      // Kamino → USDC (대출)
    | "repay"       // USDC → Kamino (상환)
    | "other";

export interface TxHistoryItem
{
    signature: string;
    blockTime: number | null;   // unix seconds
    slot: number;
    success: boolean;
    kind: TxHistoryKind;
    // base unit delta(post - pre) on user's ATA. Positive = received, negative = sent.
    cbbtcDelta?: bigint;
    usdcDelta?: bigint;
}

// 외부에 직접 의존하는 RPC 응답 형태를 줄이기 위한 경량 인터페이스.
// 테스트 fixture 가 이 형태에 맞춰 들어옴.
interface InstructionLike
{
    programId?: PublicKey | string | undefined;
}

interface TokenBalanceLike
{
    mint: string;
    owner?: string | undefined;
    accountIndex: number;
    uiTokenAmount: { amount: string; decimals: number };
}

export interface ParsedTxLike
{
    transaction: {
        message: {
            instructions: readonly InstructionLike[];
        };
    };
    meta: {
        err: unknown;
        preTokenBalances?: readonly TokenBalanceLike[] | null;
        postTokenBalances?: readonly TokenBalanceLike[] | null;
        innerInstructions?: readonly { instructions: readonly InstructionLike[]; index?: number }[] | null;
    } | null;
}

interface FetchOptions
{
    limit?: number;
    before?: string;
    // 한 번에 병렬로 부르는 getParsedTransaction 개수. Helius 무료 티어는 RPC 배치(JSON-RPC batched
    // request)를 거부하고 RPS 한도(약 10 req/s)도 있어 너무 크면 -32413 이 나옴. 4 가 안전.
    chunkSize?: number;
    // 청크 사이 휴식 ms. Helius 무료 RPS 한도 회피용. 기본 250ms.
    interChunkDelayMs?: number;
}

// 429 / -32413 (rate limit) 판정. 메시지 패턴 매칭 — web3.js 가 throw 하는 Error 의 message 기준.
export function isRateLimitError(err: unknown): boolean
{
    if (!err || typeof err !== "object")
    {
        return false;
    }
    const msg = (err as { message?: unknown }).message;
    if (typeof msg !== "string")
    {
        return false;
    }
    return /\b429\b|-32413|Too many requests|rate.?limit/i.test(msg);
}

// --- pure helpers (테스트 대상) ---

/** outer + inner 명령에 등장한 모든 programId 를 base58 문자열 집합으로 반환. */
export function programIdsInTx(tx: ParsedTxLike): Set<string>
{
    const ids = new Set<string>();
    const collect = (instrs: readonly InstructionLike[] | undefined): void =>
    {
        if (!instrs)
        {
            return;
        }
        for (const i of instrs)
        {
            const p = i.programId;
            if (p === undefined)
            {
                continue;
            }
            ids.add(typeof p === "string" ? p : p.toBase58());
        }
    };
    collect(tx.transaction.message.instructions);
    const inner = tx.meta?.innerInstructions;
    if (inner)
    {
        for (const block of inner)
        {
            collect(block.instructions);
        }
    }
    return ids;
}

/**
 * 주어진 owner+mint 의 (post - pre) 잔액 delta(base unit). 둘 다 없으면 undefined.
 *
 * pre 가 비어있고 post 에만 있으면 신규 ATA 생성으로 보고 0→post 로 계산.
 */
export function tokenDelta(
    pre: readonly TokenBalanceLike[] | null | undefined,
    post: readonly TokenBalanceLike[] | null | undefined,
    owner: string,
    mint: string,
): bigint | undefined
{
    const sumFor = (arr: readonly TokenBalanceLike[] | null | undefined): bigint =>
    {
        if (!arr)
        {
            return 0n;
        }
        let total = 0n;
        for (const b of arr)
        {
            if (b.owner === owner && b.mint === mint)
            {
                total += BigInt(b.uiTokenAmount.amount);
            }
        }
        return total;
    };

    const hasOwner = (arr: readonly TokenBalanceLike[] | null | undefined): boolean =>
        Boolean(arr) && (arr ?? []).some((b) => b.owner === owner && b.mint === mint);

    if (!hasOwner(pre) && !hasOwner(post))
    {
        return undefined;
    }
    return sumFor(post) - sumFor(pre);
}

/**
 * 트랜잭션 분류 + cbBTC/USDC delta 계산.
 *
 * 규칙:
 * - Kamino(KLEND_PROGRAM_ID) instruction 이 보이면 잔액 변화로 supply/withdraw/borrow/repay 구분
 * - Jupiter v6 가 보이면 swap
 * - 둘 다 아니면 other (UI 에서 필터됨)
 */
export function classifyTransaction(
    tx: ParsedTxLike,
    owner: string,
): { kind: TxHistoryKind; cbbtcDelta?: bigint; usdcDelta?: bigint }
{
    const programs = programIdsInTx(tx);
    const cb = tokenDelta(tx.meta?.preTokenBalances, tx.meta?.postTokenBalances, owner, CBBTC.mint);
    const ud = tokenDelta(tx.meta?.preTokenBalances, tx.meta?.postTokenBalances, owner, USDC.mint);

    const hasKlend = programs.has(KLEND_PROGRAM_ID);
    const hasJupiter = programs.has(JUPITER_V6_PROGRAM_ID);

    let kind: TxHistoryKind = "other";
    if (hasKlend)
    {
        // Kamino: 잔액 변화로 종류 결정.
        // refresh-only tx 도 가끔 있는데 그건 양쪽 delta 가 0/undefined → other 로 떨어짐(정상).
        const cbMoved = cb !== undefined && cb !== 0n;
        const udMoved = ud !== undefined && ud !== 0n;
        if (cbMoved && !udMoved)
        {
            kind = cb! < 0n ? "supply" : "withdraw";
        }
        else if (udMoved && !cbMoved)
        {
            kind = ud! > 0n ? "borrow" : "repay";
        }
    }
    else if (hasJupiter)
    {
        kind = "swap";
    }

    return { kind, cbbtcDelta: cb, usdcDelta: ud };
}

// --- fetch ---

/**
 * 사용자 지갑 주소(owner) 기준 최근 거래 N건을 가져와 history item 으로 변환.
 *
 * - 페이지네이션: options.before 에 마지막 시그니처 넣으면 그 이전 페이지
 * - 분류되지 않는(other) 트랜잭션은 결과에서 제외 — refresh/system noise 숨김
 */
export async function fetchTransactionHistory(
    connection: Connection,
    owner: PublicKey,
    options: FetchOptions = {},
): Promise<TxHistoryItem[]>
{
    const limit = options.limit ?? 25;
    const signatureOpts: { limit: number; before?: string } = { limit };
    if (options.before)
    {
        signatureOpts.before = options.before;
    }
    let sigs: Awaited<ReturnType<Connection["getSignaturesForAddress"]>>;
    try
    {
        sigs = await connection.getSignaturesForAddress(owner, signatureOpts);
    }
    catch (e)
    {
        if (__DEV__)
        {
            // eslint-disable-next-line no-console
            console.error("[history] getSignaturesForAddress failed", e);
        }
        throw e;
    }
    if (sigs.length === 0)
    {
        return [];
    }

    // 개별 getParsedTransaction 호출을 청크 단위로 병렬 처리.
    // Helius 무료 티어는 JSON-RPC 배치를 거부(-32403)하므로 batched getParsedTransactions 못 씀.
    const chunkSize = Math.max(1, options.chunkSize ?? 4);
    const interChunkDelayMs = options.interChunkDelayMs ?? 250;
    const sigStrings = sigs.map((s) => s.signature);
    const txs: (Awaited<ReturnType<Connection["getParsedTransaction"]>> | null)[] = new Array(sigStrings.length).fill(null);
    for (let start = 0; start < sigStrings.length; start += chunkSize)
    {
        if (start > 0 && interChunkDelayMs > 0)
        {
            // 청크 사이 짧은 휴식 — Helius 무료 RPS 한도(약 10 req/s) 회피.
            await new Promise<void>((resolve) => setTimeout(resolve, interChunkDelayMs));
        }
        const chunk = sigStrings.slice(start, start + chunkSize);
        const fetched = await Promise.all(chunk.map(async (sig) =>
        {
            try
            {
                return await connection.getParsedTransaction(sig, {
                    maxSupportedTransactionVersion: 0,
                });
            }
            catch (e)
            {
                // 429 / -32413(rate limit) 은 무료 티어 정상 동작 — 콘솔 노이즈 줄이고 silently null.
                // 그 외 에러만 dev 콘솔에 남겨 디버깅에 활용.
                if (__DEV__ && !isRateLimitError(e))
                {
                    // eslint-disable-next-line no-console
                    console.error(`[history] getParsedTransaction(${sig}) failed`, e);
                }
                return null;
            }
        }));
        for (let j = 0; j < fetched.length; j += 1)
        {
            txs[start + j] = fetched[j] ?? null;
        }
    }

    const ownerStr = owner.toBase58();
    const out: TxHistoryItem[] = [];
    for (let i = 0; i < sigs.length; i += 1)
    {
        const sig = sigs[i]!;
        const tx = txs[i];
        if (!tx)
        {
            // RPC 가 너무 오래된 tx 메타를 잃어버렸을 경우. 일단 스킵(other 와 동일).
            continue;
        }
        const { kind, cbbtcDelta, usdcDelta } = classifyTransaction(tx as ParsedTxLike, ownerStr);
        if (kind === "other")
        {
            continue;
        }
        out.push({
            signature: sig.signature,
            blockTime: sig.blockTime ?? null,
            slot: sig.slot,
            success: sig.err === null,
            kind,
            cbbtcDelta,
            usdcDelta,
        });
    }
    return out;
}
