import { Connection, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

import { KLEND_PROGRAM_ID } from "@/constants/lending";
import { CBBTC, USDC } from "@/constants/tokens";

// Jupiter v6 program (mainnet aggregator). 우리 swap 화면은 v6 만 호출.
export const JUPITER_V6_PROGRAM_ID = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";

// Atomiq escrow programs (mainnet, Lightning 결제 — Phase 3 Labs).
// 출처: @atomiqlabs/chain-solana SolanaChains.js (v1/v2 swapContract)
export const ATOMIQ_PROGRAM_IDS: readonly string[] = [
    "4hfUykhqmD7ZRvNh1HuzVKEY7ToENixtdUKZspNDCrEM", // v1
    "atq2FYuvww5EF6qeB28gj9tkao6Ld9mEGUzF4M93cCC",  // v2
];

// Atomiq instruction 의 Anchor discriminator (sha256("global:<snake_name>")[:8]).
// 같은 escrow program 에 양수 delta 가 떠도 "받기(claim)" 와 "환불(refund)" 를 구분하기 위함.
// v2 가 snake_case 를 쓰는 것은 실거래(5znKx… = offerer_initialize_pay_in)로 검증함.
const ATOMIQ_CLAIM_DISCS: readonly number[][] = [
    [167, 53, 133, 231, 115, 222, 196, 207],  // claimer_claim → 받기
    [168, 39, 252, 161, 62, 252, 187, 222],   // claimer_claim_pay_out → 받기
];
const ATOMIQ_REFUND_DISCS: readonly number[][] = [
    [151, 35, 133, 253, 230, 106, 141, 176],  // offerer_refund → 환불
    [25, 240, 13, 129, 172, 130, 124, 168],   // offerer_refund_pay_in → 환불
];

export type TxHistoryKind =
    | "swap"
    | "supply"           // cbBTC → Kamino (담보 예치)
    | "withdraw"         // Kamino → cbBTC (담보 인출)
    | "borrow"           // Kamino → USDC (대출)
    | "repay"            // USDC → Kamino (상환)
    | "lightningPay"     // Atomiq escrow lock (LN 결제 보내기, Labs)
    | "lightningReceive" // Atomiq claim (LN 받기, Labs)
    | "lightningRefund"  // Atomiq escrow refund (LN 결제 실패 회수)
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
    // native SOL 잔액 delta (lamports, fee 포함) — lightning SOL 발신 표시용
    solDelta?: bigint;
}

// 외부에 직접 의존하는 RPC 응답 형태를 줄이기 위한 경량 인터페이스.
// 테스트 fixture 가 이 형태에 맞춰 들어옴.
interface InstructionLike
{
    programId?: PublicKey | string | undefined;
    data?: string | undefined;   // base58 (parsed RPC 가 미해독 program 명령에 주는 형식)
}

interface TokenBalanceLike
{
    mint: string;
    owner?: string | undefined;
    accountIndex: number;
    uiTokenAmount: { amount: string; decimals: number };
}

interface AccountKeyLike
{
    pubkey: PublicKey | string;
}

export interface ParsedTxLike
{
    transaction: {
        message: {
            instructions: readonly InstructionLike[];
            accountKeys?: readonly AccountKeyLike[];
        };
    };
    meta: {
        err: unknown;
        preTokenBalances?: readonly TokenBalanceLike[] | null;
        postTokenBalances?: readonly TokenBalanceLike[] | null;
        innerInstructions?: readonly { instructions: readonly InstructionLike[]; index?: number }[] | null;
        preBalances?: readonly number[];
        postBalances?: readonly number[];
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

function discMatches(prefix: Uint8Array, discs: readonly number[][]): boolean
{
    return discs.some((d) => d.length <= prefix.length && d.every((b, i) => prefix[i] === b));
}

/**
 * Atomiq escrow program 명령의 Anchor discriminator 로 LN 방향을 판별.
 * outer + inner 명령을 훑어 claim(받기) / refund(환불) discriminator 존재를 본다.
 * 명령 data 가 없거나(파싱 RPC 한계) 매칭 안 되면 둘 다 false → 호출부가 delta 로 폴백.
 */
export function atomiqDirectionFromDiscriminators(tx: ParsedTxLike): { isClaim: boolean; isRefund: boolean }
{
    let isClaim = false;
    let isRefund = false;
    const scan = (instrs: readonly InstructionLike[] | undefined): void =>
    {
        for (const i of instrs ?? [])
        {
            const p = i.programId;
            const pid = p === undefined ? "" : (typeof p === "string" ? p : p.toBase58());
            if (!ATOMIQ_PROGRAM_IDS.includes(pid) || typeof i.data !== "string" || i.data.length === 0)
            {
                continue;
            }
            let prefix: Uint8Array;
            try
            {
                prefix = bs58.decode(i.data).subarray(0, 8);
            }
            catch
            {
                continue;
            }
            if (discMatches(prefix, ATOMIQ_CLAIM_DISCS)) isClaim = true;
            if (discMatches(prefix, ATOMIQ_REFUND_DISCS)) isRefund = true;
        }
    };
    scan(tx.transaction.message.instructions);
    for (const block of tx.meta?.innerInstructions ?? [])
    {
        scan(block.instructions);
    }
    return { isClaim, isRefund };
}

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
 * 사용자(owner)의 native SOL 잔액 delta (lamports, post - pre, tx fee 포함).
 * accountKeys 또는 잔액 배열이 없으면 undefined.
 */
export function solDelta(tx: ParsedTxLike, owner: string): bigint | undefined
{
    const keys = tx.transaction.message.accountKeys;
    const pre = tx.meta?.preBalances;
    const post = tx.meta?.postBalances;
    if (!keys || !pre || !post)
    {
        return undefined;
    }
    const idx = keys.findIndex((k) =>
        (typeof k.pubkey === "string" ? k.pubkey : k.pubkey.toBase58()) === owner);
    if (idx < 0 || pre[idx] === undefined || post[idx] === undefined)
    {
        return undefined;
    }
    return BigInt(post[idx]!) - BigInt(pre[idx]!);
}

/**
 * 트랜잭션 분류 + cbBTC/USDC/SOL delta 계산.
 *
 * 규칙:
 * - Atomiq escrow program 이 보이면 lightning. discriminator 로 claim(받기)/refund(환불) 구분,
 *   없으면 delta 부호로 폴백(음수=보내기, 양수=받기). (Labs)
 * - Kamino(KLEND_PROGRAM_ID) instruction 이 보이면 잔액 변화로 supply/withdraw/borrow/repay 구분
 * - Jupiter v6 가 보이면 swap
 * - 모두 아니면 other (UI 에서 필터됨)
 */
export function classifyTransaction(
    tx: ParsedTxLike,
    owner: string,
): { kind: TxHistoryKind; cbbtcDelta?: bigint; usdcDelta?: bigint; solDelta?: bigint }
{
    const programs = programIdsInTx(tx);
    const cb = tokenDelta(tx.meta?.preTokenBalances, tx.meta?.postTokenBalances, owner, CBBTC.mint);
    const ud = tokenDelta(tx.meta?.preTokenBalances, tx.meta?.postTokenBalances, owner, USDC.mint);

    const hasAtomiq = ATOMIQ_PROGRAM_IDS.some((id) => programs.has(id));
    if (hasAtomiq)
    {
        const sol = solDelta(tx, owner);
        // ① discriminator 로 정확 분류 (claim=받기, refund=환불)
        const { isClaim, isRefund } = atomiqDirectionFromDiscriminators(tx);
        let kind: TxHistoryKind;
        if (isClaim)
        {
            kind = "lightningReceive";
        }
        else if (isRefund)
        {
            kind = "lightningRefund";
        }
        else
        {
            // ② 폴백: data 가 없을 때 delta 부호로. 음수=보내기(escrow lock), 양수=받기.
            //    (환불도 양수지만 드물고 discriminator 로 잡히므로, 폴백 양수는 받기로 간주)
            const directional = ud !== undefined && ud !== 0n ? ud : sol;
            kind = directional !== undefined && directional > 0n ? "lightningReceive" : "lightningPay";
        }
        return { kind, cbbtcDelta: cb, usdcDelta: ud, solDelta: sol };
    }

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

// 확정된 트랜잭션의 parsed 결과는 불변(immutable)이므로 signature 로 캐시한다. staleTime(30s)
// 마다 동일한 25건을 매번 getParsedTransaction 으로 다시 부르던 버스트를, '새 signature' 에만
// RPC 를 쓰도록 줄인다(무료 티어 RPS 보호). null(미해독/rate-limit)은 캐시하지 않아 다음에 재시도.
type ParsedTx = NonNullable<Awaited<ReturnType<Connection["getParsedTransaction"]>>>;

const PARSED_TX_CACHE_MAX = 300;
const parsedTxCache = new Map<string, ParsedTx>();

function cacheParsedTx(signature: string, tx: ParsedTx): void
{
    parsedTxCache.set(signature, tx);
    // 단순 FIFO 상한 — Map 은 삽입 순서를 보존하므로 가장 오래된 키를 제거.
    if (parsedTxCache.size > PARSED_TX_CACHE_MAX)
    {
        const oldest = parsedTxCache.keys().next().value;
        if (oldest !== undefined)
        {
            parsedTxCache.delete(oldest);
        }
    }
}

/** 테스트용 — 모듈 전역 parsed-tx 캐시를 비운다. */
export function clearHistoryCache(): void
{
    parsedTxCache.clear();
}

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

    // 캐시 히트는 즉시 채우고, 미스 index 만 RPC 로 가져온다 (불변 tx → 재요청 불필요).
    const missIdx: number[] = [];
    for (let i = 0; i < sigStrings.length; i += 1)
    {
        const cached = parsedTxCache.get(sigStrings[i]!);
        if (cached)
        {
            txs[i] = cached;
        }
        else
        {
            missIdx.push(i);
        }
    }

    for (let start = 0; start < missIdx.length; start += chunkSize)
    {
        if (start > 0 && interChunkDelayMs > 0)
        {
            // 청크 사이 짧은 휴식 — Helius 무료 RPS 한도(약 10 req/s) 회피.
            await new Promise<void>((resolve) => setTimeout(resolve, interChunkDelayMs));
        }
        const chunkIdx = missIdx.slice(start, start + chunkSize);
        const fetched = await Promise.all(chunkIdx.map(async (i) =>
        {
            const sig = sigStrings[i]!;
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
        for (let j = 0; j < chunkIdx.length; j += 1)
        {
            const i = chunkIdx[j]!;
            const tx = fetched[j] ?? null;
            txs[i] = tx;
            if (tx)
            {
                // 성공한 결과만 캐시 — null 은 다음 refetch 에서 재시도.
                cacheParsedTx(sigStrings[i]!, tx);
            }
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
        const { kind, cbbtcDelta, usdcDelta, solDelta: sol } = classifyTransaction(tx as ParsedTxLike, ownerStr);
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
            solDelta: sol,
        });
    }
    return out;
}
