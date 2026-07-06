import { PublicKey } from "@solana/web3.js";

import { baseToDecimalString, formatRawAmount, formatSats, formatTokenAmount, parseTokenAmount, shortenAddress } from "./format";

describe("formatSats", () =>
{
    it("천단위 콤마 그룹 (bigint / number 모두)", () =>
    {
        expect(formatSats(100_000n)).toBe("100,000");
        expect(formatSats(2500)).toBe("2,500");
        expect(formatSats(999n)).toBe("999");
        expect(formatSats(0n)).toBe("0");
        expect(formatSats(1_234_567n)).toBe("1,234,567");
    });
});

describe("baseToDecimalString", () =>
{
    it("정수/소수/0 을 그룹구분 없이 변환, 뒤 0 제거", () =>
    {
        expect(baseToDecimalString(100_000_000n, 8)).toBe("1");
        expect(baseToDecimalString(1175n, 8)).toBe("0.00001175");
        expect(baseToDecimalString(0n, 8)).toBe("0");
        expect(baseToDecimalString(150_000_000n, 8)).toBe("1.5");
    });

    it("parseTokenAmount 와 왕복(round-trip) 일치", () =>
    {
        for (const v of [1n, 1175n, 100_000_000n, 11n])
        {
            expect(parseTokenAmount(baseToDecimalString(v, 8), 8)).toBe(v);
        }
    });
});

describe("shortenAddress", () =>
{
    it("returns head…tail when base58 is long", () =>
    {
        const pk = new PublicKey(new Uint8Array(32).fill(7));
        const result = shortenAddress(pk);
        expect(result).toMatch(/^.{4}….{4}$/);
    });

    it("respects custom head/tail lengths", () =>
    {
        const pk = new PublicKey(new Uint8Array(32).fill(9));
        const result = shortenAddress(pk, 6, 6);
        expect(result).toMatch(/^.{6}….{6}$/);
    });
});

describe("formatTokenAmount", () =>
{
    it("returns '0' for zero", () =>
    {
        expect(formatTokenAmount(0, 8)).toBe("0");
    });

    it("formats sub-1 BTC value preserving precision", () =>
    {
        expect(formatTokenAmount(0.00012345, 8)).toBe("0.00012345");
    });

    it("trims trailing zeros", () =>
    {
        expect(formatTokenAmount(1.5, 9)).toBe("1.5");
    });

    it("caps decimals at 8 even for higher-decimal tokens", () =>
    {
        // 9 decimals 입력에 대해 8까지만 노출
        expect(formatTokenAmount(0.123456789, 9)).toBe("0.12345679");
    });

    it("groups thousands with commas", () =>
    {
        expect(formatTokenAmount(12345.6789, 4)).toBe("12,345.6789");
        expect(formatTokenAmount(1_000_000, 0)).toBe("1,000,000");
    });

    it("falls back to dash for non-finite numbers", () =>
    {
        expect(formatTokenAmount(NaN, 8)).toBe("—");
        expect(formatTokenAmount(Infinity, 8)).toBe("—");
    });
});

describe("parseTokenAmount", () =>
{
    it("converts integer string at given decimals", () =>
    {
        expect(parseTokenAmount("1", 8)).toBe(100_000_000n);
    });

    it("converts decimal string preserving precision", () =>
    {
        expect(parseTokenAmount("0.01", 9)).toBe(10_000_000n);
        expect(parseTokenAmount("0.00012345", 8)).toBe(12_345n);
    });

    it("truncates fractional digits beyond decimals", () =>
    {
        // 9 decimals + extra '5' is dropped
        expect(parseTokenAmount("0.1234567899", 8)).toBe(12_345_678n);
    });

    it("returns null for empty or non-numeric input", () =>
    {
        expect(parseTokenAmount("", 8)).toBeNull();
        expect(parseTokenAmount("   ", 8)).toBeNull();
        expect(parseTokenAmount("abc", 8)).toBeNull();
        expect(parseTokenAmount("1.2.3", 8)).toBeNull();
        expect(parseTokenAmount("-1", 8)).toBeNull();
    });

    it("accepts trailing dot with no fraction", () =>
    {
        // "1." pattern: regex requires (?:\.(\d*))?, so "1." → intPart 1, frac ""
        expect(parseTokenAmount("1.", 8)).toBe(100_000_000n);
    });
});

describe("formatRawAmount", () =>
{
    it("formats raw bigint to uiAmount string", () =>
    {
        expect(formatRawAmount(1175n, 8)).toBe("0.00001175");
        expect(formatRawAmount("100000000", 8)).toBe("1");
    });
});
