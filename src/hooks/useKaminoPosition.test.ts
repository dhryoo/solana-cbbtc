import { PublicKey } from "@solana/web3.js";

import { positionQueryKey } from "./useKaminoPosition";
import { marketInfoQueryKey } from "./useKaminoMarket";

describe("marketInfoQueryKey", () =>
{
    it("안정적인 키", () =>
    {
        expect(marketInfoQueryKey()).toEqual(["kamino", "marketInfo"]);
    });
});

describe("positionQueryKey", () =>
{
    it("owner 가 있으면 base58 포함", () =>
    {
        const owner = new PublicKey("So11111111111111111111111111111111111111112");
        expect(positionQueryKey(owner)).toEqual([
            "kamino",
            "position",
            "So11111111111111111111111111111111111111112",
        ]);
    });

    it("owner 가 null 이면 no-owner", () =>
    {
        expect(positionQueryKey(null)).toEqual(["kamino", "position", "no-owner"]);
    });
});
