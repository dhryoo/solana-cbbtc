import type { PublicKey } from "@solana/web3.js";

/** sats 정수를 천단위 콤마로. Lightning 금액 표시를 앱 전체에서 일관되게(콤마 그룹) 유지. */
export function formatSats(sats: bigint | number): string
{
    return sats.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function shortenAddress(pubkey: PublicKey, head = 4, tail = 4): string
{
    const base58 = pubkey.toBase58();
    if (base58.length <= head + tail + 3)
    {
        return base58;
    }
    return `${base58.slice(0, head)}…${base58.slice(-tail)}`;
}

// 토큰 잔액을 사람이 읽기 좋은 문자열로. 뒤따르는 0은 제거하되 토큰 decimals를 상한으로.
// 예: 0.00012345 cbBTC, 1.5 SOL, 0
export function formatTokenAmount(uiAmount: number, decimals: number): string
{
    if (!Number.isFinite(uiAmount))
    {
        return "—";
    }
    if (uiAmount === 0)
    {
        return "0";
    }
    return uiAmount.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: Math.min(decimals, 8),
    });
}

// raw bigint amount → UI 표시용 문자열 ('1175' + decimals=8 → '0.00001175')
export function formatRawAmount(raw: string | bigint, decimals: number): string
{
    const value = typeof raw === "bigint" ? Number(raw) : Number(raw);
    if (!Number.isFinite(value))
    {
        return "—";
    }
    return formatTokenAmount(value / 10 ** decimals, decimals);
}

// 사용자 입력 문자열을 raw bigint amount로. 잘못된 형식이거나 빈 문자열이면 null.
// "0.01" + decimals=9 → 10_000_000n
// "1" + decimals=8 → 100_000_000n
// "" or "abc" → null
// fractional part가 decimals보다 길면 잘라냄 (UX 친화적, 사용자 입력 보존).
export function parseTokenAmount(input: string, decimals: number): bigint | null
{
    const trimmed = input.trim();
    if (trimmed === "")
    {
        return null;
    }
    const match = /^(\d+)(?:\.(\d*))?$/.exec(trimmed);
    if (!match)
    {
        return null;
    }
    const intPart = match[1] ?? "0";
    const fracPart = (match[2] ?? "").slice(0, decimals);
    const padded = fracPart.padEnd(decimals, "0");
    return BigInt(intPart + padded);
}

// raw bigint amount → 입력란에 넣을 plain 십진 문자열 (그룹 구분 없음, 뒤따르는 0 제거).
// parseTokenAmount 의 역함수. bigint 기반이라 정밀.
//   100_000_000n + decimals=8 → "1"
//   1175n + decimals=8 → "0.00001175"
//   0n → "0"
export function baseToDecimalString(amount: bigint, decimals: number): string
{
    if (amount === 0n)
    {
        return "0";
    }
    const s = amount.toString().padStart(decimals + 1, "0");
    const intPart = s.slice(0, s.length - decimals);
    const fracPart = s.slice(s.length - decimals).replace(/0+$/, "");
    return fracPart ? `${intPart}.${fracPart}` : intPart;
}
