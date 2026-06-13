import { getRpcEndpoints } from "@/constants/cluster";
import { SOL, USDC, type TokenInfo } from "@/constants/tokens";

import type {
    LightningDestination,
    LightningPayOutcome,
    LightningPayPhase,
    LightningQuote,
    LightningSwapProvider,
    SolanaSigningDelegate,
} from "./types";

// Atomiq (atomiqlabs) — Strategy 구현체 #1.
//
// trust 모델: Solana 쪽 HTLC escrow (Ackee 감사) — 사용자는 escrow lock/refund 만 서명,
// LN 결제는 LP 가 수행. 실패 시 cooperative refund 로 자금 회수 (역시 Solana 서명만).
//
// SDK 는 무겁고(LP 레지스트리 fetch 등) 실험 기능 전용이므로 **lazy require** —
// Labs 토글을 켜고 Lightning 화면을 열기 전까지는 모듈 초기화 비용을 내지 않는다.
// (Metro 는 require 도 정적으로 번들하지만, 실행은 첫 호출 시점)

// SDK 객체들에 대한 최소 구조 타입 (any 금지 — 필요한 표면만 기술)
interface AtomiqTokenAmount
{
    rawAmount: bigint;
}

interface AtomiqSwap
{
    getId(): string;
    getInput(): AtomiqTokenAmount;
    getInputWithoutFee(): AtomiqTokenAmount;
    getOutput(): AtomiqTokenAmount;
    getFee(): { amountInSrcToken: AtomiqTokenAmount };
    getQuoteExpiry(): number;
    commit(signer: unknown, abortSignal?: AbortSignal, skipChecks?: boolean): Promise<string>;
    waitForPayment(): Promise<boolean>;
    refund(signer: unknown): Promise<string>;
    getSecret?(): string | null;
}

interface AtomiqSwapperLike
{
    init(): Promise<void>;
    getSupportedTokens(input: boolean): { chainId: string; address?: string }[];
    swap(...args: unknown[]): Promise<AtomiqSwap>;
    getRefundableSwaps(chainId: string, address: string): Promise<AtomiqSwap[]>;
}

interface AtomiqRuntime
{
    swapper: AtomiqSwapperLike;
    tokens: Record<string, unknown>;       // Tokens.SOLANA.*
    btcLnToken: unknown;                   // Tokens.BITCOIN.BTCLN
    exactOut: unknown;                     // SwapAmountType.EXACT_OUT
    makeSigner: (delegate: SolanaSigningDelegate) => unknown;
}

// 우리 앱에서 발신 지원하는 토큰 (사용자 결정 2026-06-12: USDC+SOL 먼저, cbBTC 는 후속)
const APP_SOURCE_TOKENS: { app: TokenInfo; atomiqSymbol: string }[] = [
    { app: USDC, atomiqSymbol: "USDC" },
    { app: SOL, atomiqSymbol: "SOL" },
];

// Atomiq LP registry.
//
// SDK 기본 동작은 api.github.com (contents API) 에서 LP 목록을 가져오는데, 무인증 GitHub API 는
// 60 req/h/IP 라 모바일(통신사 NAT 공유 IP)에서 rate-limit 위험 → rate limit 없는
// raw.githubusercontent.com 미러에서 직접 fetch + 실패 시 알려진 LP 로 fallback →
// intermediaryUrl 옵션으로 주입해 api.github.com 경로를 완전히 우회.
// 주의: mainnet 목록은 registry.json(레거시)이 아니라 **registry-mainnet.json** (M17.1 발견).
const REGISTRY_RAW_URL = "https://raw.githubusercontent.com/adambor/SolLightning-registry/main/registry-mainnet.json";
// fallback — registry-mainnet.json 2026-06-13 스냅샷
const FALLBACK_LP_URLS = [
    "https://161-97-73-23.nodes.atomiq.exchange:4000",
    "https://84-32-32-132.nodes.atomiq.exchange",
    "https://84-32-129-152.nodes.atomiq.exchange",
];

async function fetchLpUrls(): Promise<string[]>
{
    try
    {
        const res = await fetch(REGISTRY_RAW_URL);
        if (res.ok)
        {
            const urls = (await res.json()) as unknown;
            if (Array.isArray(urls) && urls.length > 0 && urls.every((u) => typeof u === "string"))
            {
                return urls as string[];
            }
        }
    }
    catch
    {
        // 네트워크 실패 — fallback 사용
    }
    return FALLBACK_LP_URLS;
}

let runtimePromise: Promise<AtomiqRuntime> | null = null;

function loadRuntime(): Promise<AtomiqRuntime>
{
    if (runtimePromise)
    {
        return runtimePromise;
    }
    runtimePromise = (async (): Promise<AtomiqRuntime> =>
    {
        if (__DEV__)
        {
            // Atomiq SDK 내부 로거 활성화 (debug=3) — discovery 가 삼키는 per-LP 에러를 노출
            (globalThis as { atomiqLogLevel?: number }).atomiqLogLevel = 3;
        }

        /* eslint-disable @typescript-eslint/no-require-imports */
        const sdk = require("@atomiqlabs/sdk");
        const chainSolana = require("@atomiqlabs/chain-solana");
        const storage = require("@atomiqlabs/storage-rn-async");
        /* eslint-enable @typescript-eslint/no-require-imports */

        const factory = new sdk.SwapperFactory([chainSolana.SolanaInitializer]);
        const rpcUrl = getRpcEndpoints()[0];
        const lpUrls = await fetchLpUrls();
        const swapper = factory.newSwapper({
            chains: { SOLANA: { rpcUrl } },
            bitcoinNetwork: sdk.BitcoinNetwork.MAINNET,
            // LP 목록을 직접 주입 — SDK 의 api.github.com 의존 우회 (위 REGISTRY 주석 참조)
            intermediaryUrl: lpUrls,
            // RN 영속 storage — 중단된 swap 의 환불 복구에 필수 (자금 안전)
            swapStorage: (chainId: string) => new storage.RNAsyncUnifiedStorage(`atomiq-swaps-${chainId}`),
            chainStorageCtor: (name: string) => new storage.RNAsyncStorageManager(`atomiq-chain-${name}`),
        });
        await swapper.init();

        if (__DEV__)
        {
            // 진단: LP discovery 가 디바이스에서 실제로 무엇을 찾았는지 (M17.1 디버깅)
            const disc = (swapper as unknown as {
                intermediaryDiscovery?: { intermediaries?: { url: string }[] };
            }).intermediaryDiscovery;
            const lps = disc?.intermediaries ?? [];
            // eslint-disable-next-line no-console
            console.log(`[lightning] init OK — LP count: ${lps.length}`, lps.map((i) => i.url));
            if (lps.length === 0)
            {
                // Hermes 호환성 피처 플래그 — getNodeInfo 경로가 쓰는 API 들
                // eslint-disable-next-line no-console
                console.log("[lightning] env:", JSON.stringify({
                    promiseAny: typeof Promise.any,
                    structuredClone: typeof globalThis.structuredClone,
                    textEncoder: typeof globalThis.TextEncoder,
                    getRandomValues: typeof globalThis.crypto?.getRandomValues,
                }));
                // discovery 가 debug 레벨로 삼키는 원본 예외를 직접 노출:
                // SDK 의 getIntermediaryInfo 를 그대로 호출해 raw error 를 로그
                for (const u of lpUrls)
                {
                    void (async (): Promise<void> =>
                    {
                        try
                        {
                            /* eslint-disable @typescript-eslint/no-require-imports */
                            const api = require("@atomiqlabs/sdk/dist/intermediaries/apis/IntermediaryAPI");
                            /* eslint-enable @typescript-eslint/no-require-imports */
                            await api.IntermediaryAPI.getIntermediaryInfo(u, 15_000);
                            // eslint-disable-next-line no-console
                            console.log(`[lightning] getIntermediaryInfo(${u}): OK — 실패 지점은 서명검증/이후 단계`);
                        }
                        catch (e)
                        {
                            // eslint-disable-next-line no-console
                            console.error(`[lightning] getIntermediaryInfo(${u}) RAW ERROR:`, e);
                        }
                    })();
                }
            }
            try
            {
                const toks = (swapper as unknown as AtomiqSwapperLike).getSupportedTokens(true);
                // eslint-disable-next-line no-console
                console.log("[lightning] LP-quoted tokens:", toks.map((tk) => `${tk.chainId}:${tk.address ?? "BTC"}`));
            }
            catch (e)
            {
                // eslint-disable-next-line no-console
                console.warn("[lightning] getSupportedTokens failed", e);
            }
        }

        return {
            swapper: swapper as AtomiqSwapperLike,
            tokens: factory.Tokens.SOLANA as Record<string, unknown>,
            btcLnToken: factory.Tokens.BITCOIN.BTCLN as unknown,
            exactOut: sdk.SwapAmountType.EXACT_OUT as unknown,
            makeSigner: (delegate: SolanaSigningDelegate) => new chainSolana.SolanaSigner(delegate),
        };
    })();
    // 초기화 실패 시 다음 시도에서 재시작할 수 있도록 캐시 무효화
    runtimePromise.catch(() => { runtimePromise = null; });
    return runtimePromise;
}

function toQuote(
    swap: AtomiqSwap,
    srcToken: TokenInfo,
    destinationLabel: string,
): LightningQuote
{
    return {
        providerId: "atomiq",
        srcToken,
        inputBase: swap.getInput().rawAmount,
        inputWithoutFeeBase: swap.getInputWithoutFee().rawAmount,
        feeBase: swap.getFee().amountInSrcToken.rawAmount,
        outputSats: swap.getOutput().rawAmount,
        quoteExpiresAt: swap.getQuoteExpiry(),
        destinationLabel,
        ref: swap,
    };
}

export class AtomiqProvider implements LightningSwapProvider
{
    readonly id = "atomiq";

    async getSupportedSourceTokens(): Promise<TokenInfo[]>
    {
        const rt = await loadRuntime();
        const supported = rt.swapper.getSupportedTokens(true);
        return APP_SOURCE_TOKENS
            .filter(({ atomiqSymbol }) =>
            {
                const tok = rt.tokens[atomiqSymbol] as { address?: string } | undefined;
                return tok !== undefined
                    && supported.some((s) => s.chainId === "SOLANA" && s.address === tok.address);
            })
            .map(({ app }) => app);
    }

    async quote(
        srcToken: TokenInfo,
        dest: LightningDestination,
        srcAddress: string,
    ): Promise<LightningQuote>
    {
        const rt = await loadRuntime();
        const entry = APP_SOURCE_TOKENS.find((t) => t.app.symbol === srcToken.symbol);
        if (!entry)
        {
            throw new Error(`Unsupported source token: ${srcToken.symbol}`);
        }
        const atomiqToken = rt.tokens[entry.atomiqSymbol];

        try
        {
            if (dest.kind === "bolt11")
            {
                // BOLT11: 금액은 인보이스에 내장 — amount undefined + EXACT_OUT
                const swap = await rt.swapper.swap(
                    atomiqToken,
                    rt.btcLnToken,
                    undefined,
                    rt.exactOut,
                    srcAddress,
                    dest.parsed.paymentRequest,
                );
                const label = dest.parsed.description || dest.parsed.paymentRequest.slice(0, 24) + "…";
                return toQuote(swap, srcToken, label);
            }

            // LNURL-pay / lightning address: 금액 직접 지정 (sats, EXACT_OUT)
            const swap = await rt.swapper.swap(
                atomiqToken,
                rt.btcLnToken,
                dest.amountSats,
                rt.exactOut,
                srcAddress,
                dest.destination,
            );
            return toQuote(swap, srcToken, dest.destination);
        }
        catch (e)
        {
            if (__DEV__)
            {
                // 진단: 실패 파라미터 + 원본 에러 + stack (M17.1 디버깅 — abort 지점 특정)
                // eslint-disable-next-line no-console
                console.error(
                    `[lightning] quote failed — src=${srcToken.symbol} dest.kind=${dest.kind}`
                    + ` amount=${dest.kind === "lnurlOrAddress" ? dest.amountSats.toString() : "embedded"}`,
                    e,
                );
                if (e instanceof Error && e.stack)
                {
                    // eslint-disable-next-line no-console
                    console.error("[lightning] quote failure stack:\n" + e.stack);
                }
            }
            throw e;
        }
    }

    async pay(
        quote: LightningQuote,
        signer: SolanaSigningDelegate,
        onPhase: (phase: LightningPayPhase) => void,
    ): Promise<LightningPayOutcome>
    {
        const rt = await loadRuntime();
        const swap = quote.ref as AtomiqSwap;
        const atomiqSigner = rt.makeSigner(signer);

        // ① Solana escrow lock — MWA 서명 1회
        onPhase("signing");
        const commitTxId = await swap.commit(atomiqSigner);

        // ② LP 가 LN 인보이스 결제 — 폴링 대기
        onPhase("paying");
        const paid = await swap.waitForPayment();
        if (paid)
        {
            return {
                status: "paid",
                commitTxId,
                lnSecret: swap.getSecret?.() ?? null,
            };
        }

        // ③ 결제 실패 → cooperative refund (MWA 서명 1회 추가) — 자금 회수
        onPhase("refunding");
        try
        {
            await swap.refund(atomiqSigner);
            return { status: "refunded", commitTxId };
        }
        catch (e)
        {
            // 환불 서명 거부/실패 — swap 은 storage 에 남아 있어 다음에 getRefundableCount 로 복구 가능
            const msg = e instanceof Error ? e.message : String(e);
            return { status: "refund_failed", commitTxId, error: msg };
        }
    }

    async getRefundableCount(srcAddress: string): Promise<number>
    {
        const rt = await loadRuntime();
        const refundable = await rt.swapper.getRefundableSwaps("SOLANA", srcAddress);
        return refundable.length;
    }

    async refundAll(signer: SolanaSigningDelegate): Promise<number>
    {
        const rt = await loadRuntime();
        const refundable = await rt.swapper.getRefundableSwaps("SOLANA", signer.publicKey.toBase58());
        const atomiqSigner = rt.makeSigner(signer);
        let done = 0;
        for (const swap of refundable)
        {
            await swap.refund(atomiqSigner);
            done += 1;
        }
        return done;
    }
}
