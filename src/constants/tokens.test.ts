import { CBBTC, deriveSwapPair, SOL, SWAP_COUNTER_TOKENS, USDC } from "./tokens";

describe("SWAP_COUNTER_TOKENS", () =>
{
    it("never includes cbBTC (cbBTC is the fixed axis, not a counter)", () =>
    {
        expect(SWAP_COUNTER_TOKENS.some((t) => t.mint === CBBTC.mint)).toBe(false);
    });

    it("contains SOL, SKR and USDC", () =>
    {
        const symbols = SWAP_COUNTER_TOKENS.map((t) => t.symbol).sort();
        expect(symbols).toEqual(["SKR", "SOL", "USDC"]);
    });
});

describe("deriveSwapPair", () =>
{
    it("cbbtcIsOutput=true → counter is input, cbBTC is output (buy cbBTC)", () =>
    {
        const { input, output } = deriveSwapPair(SOL, true);
        expect(input).toBe(SOL);
        expect(output).toBe(CBBTC);
    });

    it("cbbtcIsOutput=false → cbBTC is input, counter is output (sell cbBTC)", () =>
    {
        const { input, output } = deriveSwapPair(USDC, false);
        expect(input).toBe(CBBTC);
        expect(output).toBe(USDC);
    });

    it("always keeps cbBTC on exactly one side for every counter + direction", () =>
    {
        for (const counter of SWAP_COUNTER_TOKENS)
        {
            for (const cbbtcIsOutput of [true, false])
            {
                const { input, output } = deriveSwapPair(counter, cbbtcIsOutput);
                const cbbtcSides = [input, output].filter((t) => t.mint === CBBTC.mint).length;
                expect(cbbtcSides).toBe(1);
                // 반대쪽은 항상 선택된 카운터 토큰
                const other = input.mint === CBBTC.mint ? output : input;
                expect(other).toBe(counter);
            }
        }
    });
});
