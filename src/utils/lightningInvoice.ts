import { decode as decodeBolt11 } from "light-bolt11-decoder";

// Lightning 결제 입력 분류 + 파싱 (Phase 3 실험 기능).
//
// 지원 입력 3종:
//   - BOLT11 인보이스 (lnbc…) — 금액/설명/만료 추출. mainnet(lnbc) 만 허용
//   - lightning address (user@domain.tld) — LNURL-pay 로 해석됨 (LUD-16)
//   - 원시 LNURL (lnurl1…, bech32)
//
// 서명 검증은 하지 않는다 — swap 의 원자성은 인보이스 서명이 아니라 payment_hash 에
// 묶이므로 decode-only 로 충분 (M16.4a 조사 결론).

export interface ParsedBolt11
{
    kind: "bolt11";
    paymentRequest: string;     // 정규화(소문자)된 인보이스
    amountSats: bigint | null;  // null = 금액 없는 인보이스 (지급 시 금액 입력 필요)
    description: string;
    paymentHash: string;
    timestamp: number;          // unix sec
    expiresAt: number;          // unix sec
    isExpired: boolean;
}

export interface ParsedLightningAddress
{
    kind: "lightningAddress";
    address: string;            // 소문자 정규화
}

export interface ParsedLnurl
{
    kind: "lnurl";
    lnurl: string;              // 소문자 정규화 (lnurl1…)
}

export interface ParsedInvalid
{
    kind: "invalid";
}

export type ParsedLightningInput = ParsedBolt11 | ParsedLightningAddress | ParsedLnurl | ParsedInvalid;

// BOLT11 기본 만료: expiry 태그가 없으면 3600초 (스펙 default)
const DEFAULT_EXPIRY_SEC = 3600;

// user@domain.tld — TLD 필수 (localhost 등 배제)
const LIGHTNING_ADDRESS_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

function sectionValue(sections: { name: string; value?: unknown }[], name: string): unknown
{
    return sections.find((s) => s.name === name)?.value;
}

function parseBolt11(normalized: string, nowSec: number): ParsedBolt11 | ParsedInvalid
{
    let decoded: { sections: { name: string; value?: unknown }[] };
    try
    {
        decoded = decodeBolt11(normalized);
    }
    catch
    {
        return { kind: "invalid" };
    }

    const network = sectionValue(decoded.sections, "coin_network") as { bech32?: string } | undefined;
    if (network?.bech32 !== "bc")
    {
        // mainnet 전용 — testnet(tb)/regtest(bcrt) 거부
        return { kind: "invalid" };
    }

    const amountMsat = sectionValue(decoded.sections, "amount");
    const amountSats = typeof amountMsat === "string" && amountMsat.length > 0
        ? BigInt(amountMsat) / 1000n
        : null;

    const timestamp = Number(sectionValue(decoded.sections, "timestamp") ?? 0);
    const expirySec = Number(sectionValue(decoded.sections, "expiry") ?? DEFAULT_EXPIRY_SEC);
    const expiresAt = timestamp + expirySec;

    return {
        kind: "bolt11",
        paymentRequest: normalized,
        amountSats,
        description: String(sectionValue(decoded.sections, "description") ?? ""),
        paymentHash: String(sectionValue(decoded.sections, "payment_hash") ?? ""),
        timestamp,
        expiresAt,
        isExpired: nowSec >= expiresAt,
    };
}

/**
 * Lightning 결제 입력을 분류·파싱. nowSec 주입 가능 (테스트 친화).
 */
export function parseLightningInput(
    raw: string,
    nowSec: number = Math.floor(Date.now() / 1000),
): ParsedLightningInput
{
    let input = raw.trim();
    if (input.length === 0)
    {
        return { kind: "invalid" };
    }

    // QR 관례: lightning: URI 스킴 제거
    if (/^lightning:/i.test(input))
    {
        input = input.slice("lightning:".length);
    }

    // QR alphanumeric 모드는 전부 대문자 — bech32 는 대소문자 혼용만 불가하므로 소문자 정규화
    const lower = input.toLowerCase();

    if (lower.startsWith("lnurl1"))
    {
        return { kind: "lnurl", lnurl: lower };
    }
    if (lower.startsWith("ln"))
    {
        return parseBolt11(lower, nowSec);
    }
    if (LIGHTNING_ADDRESS_RE.test(lower))
    {
        return { kind: "lightningAddress", address: lower };
    }
    return { kind: "invalid" };
}
