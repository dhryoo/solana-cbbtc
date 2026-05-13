import { PublicKey } from "@solana/web3.js";

import { formatTokenAmount, shortenAddress } from "./format";

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

    it("falls back to dash for non-finite numbers", () =>
    {
        expect(formatTokenAmount(NaN, 8)).toBe("—");
        expect(formatTokenAmount(Infinity, 8)).toBe("—");
    });
});
